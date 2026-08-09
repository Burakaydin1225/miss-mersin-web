import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import {
  AnalyticsEventType,
  Prisma,
} from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedEventTypes = new Set<string>(
  Object.values(AnalyticsEventType),
);

type AnalyticsRequestBody = {
  eventType?: unknown;
  visitorId?: unknown;
  sessionId?: unknown;
  path?: unknown;
  productId?: unknown;
  source?: unknown;
  referrer?: unknown;
  metadata?: unknown;
};

function cleanString(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleanedValue = value.trim();

  if (!cleanedValue) {
    return null;
  }

  return cleanedValue.slice(0, maximumLength);
}

function getDeviceType(userAgent: string): string {
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    return "tablet";
  }

  if (
    /mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(
      userAgent,
    )
  ) {
    return "mobile";
  }

  return "desktop";
}

function createVisitorHash(visitorId: string): string {
  const salt =
    process.env.ANALYTICS_SALT?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "development-analytics-salt";

  return createHash("sha256")
    .update(`${visitorId}:${salt}`)
    .digest("hex");
}

function parseMetadata(
  value: unknown,
): Prisma.InputJsonValue | undefined {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return undefined;
  }

  try {
    const serializedValue = JSON.stringify(value);

    if (serializedValue.length > 4_000) {
      return undefined;
    }

    return JSON.parse(
      serializedValue,
    ) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as AnalyticsRequestBody;

    const rawEventType = cleanString(
      body.eventType,
      50,
    );

    if (
      !rawEventType ||
      !allowedEventTypes.has(rawEventType)
    ) {
      return NextResponse.json(
        {
          error: "Geçersiz analitik olay türü.",
        },
        {
          status: 400,
        },
      );
    }

    const eventType =
      rawEventType as AnalyticsEventType;

    const visitorId = cleanString(
      body.visitorId,
      150,
    );

    const sessionId = cleanString(
      body.sessionId,
      150,
    );

    if (!visitorId || !sessionId) {
      return NextResponse.json(
        {
          error:
            "Ziyaretçi veya oturum bilgisi eksik.",
        },
        {
          status: 400,
        },
      );
    }

    let path =
      cleanString(body.path, 500) || "/";

    if (!path.startsWith("/")) {
      path = "/";
    }

    const productId = cleanString(
      body.productId,
      100,
    );

    const productEvent =
      eventType ===
        AnalyticsEventType.PRODUCT_VIEW ||
      eventType ===
        AnalyticsEventType.WHATSAPP_CLICK;

    if (productEvent && !productId) {
      return NextResponse.json(
        {
          error:
            "Ürün olaylarında ürün kimliği zorunludur.",
        },
        {
          status: 400,
        },
      );
    }

    if (productId) {
      const productExists =
        await prisma.product.findUnique({
          where: {
            id: productId,
          },
          select: {
            id: true,
          },
        });

      if (!productExists) {
        return NextResponse.json(
          {
            error: "Ürün bulunamadı.",
          },
          {
            status: 404,
          },
        );
      }
    }

    const source =
      cleanString(body.source, 250) || null;

    const referrer =
      cleanString(body.referrer, 1_000) ||
      cleanString(
        request.headers.get("referer"),
        1_000,
      ) ||
      null;

    const userAgent =
      request.headers.get("user-agent") || "";

    const deviceType =
      getDeviceType(userAgent);

    const visitorHash =
      createVisitorHash(visitorId);

    const metadata =
      parseMetadata(body.metadata);

    const activeSessionProductId =
      eventType ===
      AnalyticsEventType.PAGE_VIEW
        ? null
        : productId;

    const activeSessionUpdateData: {
      visitorHash: string;
      currentPath: string;
      deviceType: string;
      source: string | null;
      productId?: string | null;
    } = {
      visitorHash,
      currentPath: path,
      deviceType,
      source,
    };

    /*
     * Heartbeat ürün bilgisini değiştirmez.
     * Böylece ürün detayındayken aktif oturumun
     * productId değeri korunur.
     */
    if (
      eventType !==
      AnalyticsEventType.HEARTBEAT
    ) {
      activeSessionUpdateData.productId =
        activeSessionProductId;
    }

    await prisma.activeSession.upsert({
      where: {
        sessionId,
      },
      create: {
        sessionId,
        visitorHash,
        currentPath: path,
        productId:
          activeSessionProductId || null,
        deviceType,
        source,
      },
      update: activeSessionUpdateData,
    });

    /*
     * Heartbeat olaylarını AnalyticsEvent tablosuna
     * yazmıyoruz. Yalnızca ActiveSession kaydının
     * lastSeenAt değerini güncelliyoruz.
     */
    if (
      eventType ===
      AnalyticsEventType.HEARTBEAT
    ) {
      return NextResponse.json({
        ok: true,
        recorded: false,
      });
    }

    /*
     * Aynı olayın hızlı yenileme veya React geliştirme
     * modu nedeniyle birkaç saniye içinde iki defa
     * yazılmasını önler.
     */
    if (
      eventType ===
        AnalyticsEventType.PAGE_VIEW ||
      eventType ===
        AnalyticsEventType.PRODUCT_VIEW
    ) {
      const duplicateThreshold = new Date(
        Date.now() - 10 * 1_000,
      );

      const duplicateEvent =
        await prisma.analyticsEvent.findFirst({
          where: {
            eventType,
            sessionId,
            path,
            productId: productId || null,
            createdAt: {
              gte: duplicateThreshold,
            },
          },
          select: {
            id: true,
          },
        });

      if (duplicateEvent) {
        return NextResponse.json({
          ok: true,
          recorded: false,
        });
      }
    }

    await prisma.analyticsEvent.create({
      data: {
        eventType,
        sessionId,
        visitorHash,
        path,
        source,
        referrer,
        deviceType,
        metadata,
        productId: productId || null,
      },
    });

    return NextResponse.json({
      ok: true,
      recorded: true,
    });
  } catch (error) {
    console.error(
      "Analitik kaydı oluşturulamadı:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Analitik olayı kaydedilirken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}