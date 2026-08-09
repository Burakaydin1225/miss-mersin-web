import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  AnalyticsMaintenanceInputError,
  runAnalyticsMaintenance,
} from "@/lib/analytics-maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MaintenanceRequestBody = {
  date?: unknown;
  days?: unknown;
};

function getExpectedSecret(): string {
  return (
    process.env.CRON_SECRET?.trim() ||
    process.env.ANALYTICS_MAINTENANCE_SECRET?.trim() ||
    ""
  );
}

function compareSecrets(
  providedSecret: string,
  expectedSecret: string,
): boolean {
  const providedBuffer = Buffer.from(providedSecret);

  const expectedBuffer = Buffer.from(expectedSecret);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function getBearerToken(authorizationHeader: string | null): string {
  if (!authorizationHeader) {
    return "";
  }

  const prefix = "Bearer ";

  if (!authorizationHeader.startsWith(prefix)) {
    return "";
  }

  return authorizationHeader.slice(prefix.length).trim();
}

async function readRequestBody(
  request: Request,
): Promise<MaintenanceRequestBody> {
  const rawBody = await request.text();

  if (!rawBody.trim()) {
    return {};
  }

  const parsedBody = JSON.parse(rawBody) as unknown;

  if (
    !parsedBody ||
    typeof parsedBody !== "object" ||
    Array.isArray(parsedBody)
  ) {
    throw new AnalyticsMaintenanceInputError("İstek gövdesi geçersiz.");
  }

  return parsedBody as MaintenanceRequestBody;
}

function authorizeRequest(request: Request): NextResponse | null {
  const expectedSecret = getExpectedSecret();

  if (!expectedSecret) {
    console.error(
      "CRON_SECRET veya ANALYTICS_MAINTENANCE_SECRET tanımlanmamış.",
    );

    return NextResponse.json(
      {
        error: "Analitik bakım anahtarı yapılandırılmamış.",
      },
      {
        status: 500,
      },
    );
  }

  const providedSecret = getBearerToken(request.headers.get("authorization"));

  if (!providedSecret || !compareSecrets(providedSecret, expectedSecret)) {
    return NextResponse.json(
      {
        error: "Yetkisiz istek.",
      },
      {
        status: 401,
      },
    );
  }

  return null;
}

export async function GET(request: Request) {
  const authorizationError = authorizeRequest(request);

  if (authorizationError) {
    return authorizationError;
  }

  try {
    const result = await runAnalyticsMaintenance({
      days: 7,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Zamanlanmış analitik bakım işlemi başarısız oldu:", error);

    return NextResponse.json(
      {
        error: "Analitik bakım işlemi sırasında hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  const authorizationError = authorizeRequest(request);

  if (authorizationError) {
    return authorizationError;
  }

  try {
    const body = await readRequestBody(request);

    const date = typeof body.date === "string" ? body.date.trim() : undefined;

    let days: number | undefined;

    if (body.days !== undefined) {
      const parsedDays = Number(body.days);

      if (!Number.isInteger(parsedDays)) {
        throw new AnalyticsMaintenanceInputError(
          "Gün sayısı tam sayı olmalıdır.",
        );
      }

      days = parsedDays;
    }

    const result = await runAnalyticsMaintenance({
      date,
      days,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AnalyticsMaintenanceInputError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        },
      );
    }

    console.error("Analitik bakım işlemi başarısız oldu:", error);

    return NextResponse.json(
      {
        error: "Analitik bakım işlemi sırasında hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}
