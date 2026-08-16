"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  SubscriptionPaymentType,
  UserRole,
} from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";

function normalizeMoney(value: FormDataEntryValue | null): string | null {
  let normalized = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/₺/g, "")
    .replace(/TRY/gi, "")
    .replace(/TL/gi, "");

  if (!normalized) return null;

  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }

  const amount = Number(normalized);

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 9999999999.99
  ) {
    return null;
  }

  return amount.toFixed(2);
}

function parseIstanbulDateTime(
  value: FormDataEntryValue | null,
): Date | null {
  const raw = String(value ?? "").trim();

  if (!raw) return null;

  const normalized =
    raw.length === 16 ? `${raw}:00+03:00` : `${raw}+03:00`;

  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function isPaymentType(
  value: string,
): value is SubscriptionPaymentType {
  return Object.values(SubscriptionPaymentType).includes(
    value as SubscriptionPaymentType,
  );
}

async function refreshPaymentPages(
  productId: string | null,
  slug?: string | null,
) {
  revalidatePath("/panel");
  revalidatePath("/panel/odemeler");
  revalidatePath("/panel/urunler");

  if (productId) {
    revalidatePath(`/panel/urunler/${productId}`);
    revalidatePath(`/panel/urunler/${productId}/abonelik-duzenle`);
  }

  if (slug) {
    revalidatePath(`/urun/${slug}`);
  }

  revalidatePath("/");
}

export async function updatePaymentAction(
  paymentId: string,
  formData: FormData,
): Promise<void> {
  const user = await requireRole([UserRole.ADMIN]);

  const payment = await prisma.productPayment.findUnique({
    where: { id: paymentId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          subscriptionEndsAt: true,
          lastRenewedAt: true,
        },
      },
    },
  });

  if (!payment) {
    redirect("/panel/odemeler?error=payment-not-found");
  }

  const amount = normalizeMoney(formData.get("amount"));
  const rawType = String(formData.get("type") ?? "").trim();
  const periodStart = parseIstanbulDateTime(formData.get("periodStart"));
  const periodEnd = parseIstanbulDateTime(formData.get("periodEnd"));
  const paidAt = parseIstanbulDateTime(formData.get("paidAt"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const syncSubscription =
    formData.get("syncSubscription") === "on";

  if (!amount) {
    redirect(`/panel/odemeler/${paymentId}?error=amount`);
  }

  if (!isPaymentType(rawType)) {
    redirect(`/panel/odemeler/${paymentId}?error=type`);
  }

  if (!periodStart || !periodEnd || periodEnd <= periodStart) {
    redirect(`/panel/odemeler/${paymentId}?error=period`);
  }

  if (!paidAt) {
    redirect(`/panel/odemeler/${paymentId}?error=paidAt`);
  }

  await prisma.$transaction(async (transaction) => {
    const updatedPayment = await transaction.productPayment.update({
      where: { id: payment.id },
      data: {
        amount,
        type: rawType,
        periodStart,
        periodEnd,
        paidAt,
        note,
      },
    });

    if (syncSubscription && payment.productId) {
      await transaction.product.update({
        where: { id: payment.productId },
        data: {
          subscriptionEndsAt: periodEnd,
          lastRenewedAt: paidAt,
        },
      });
    }

    await writeAuditLog({
      client: transaction,
      actor: user,
      action: "PAYMENT_UPDATE",
      entityType: "ProductPayment",
      entityId: payment.id,
      description: `${user.name}, "${payment.productName}" ödeme kaydını düzenledi.`,
      changes: {
        before: {
          amount: payment.amount.toString(),
          type: payment.type,
          periodStart: payment.periodStart.toISOString(),
          periodEnd: payment.periodEnd.toISOString(),
          paidAt: payment.paidAt.toISOString(),
          note: payment.note,
          productSubscriptionEndsAt:
            payment.product?.subscriptionEndsAt?.toISOString() ?? null,
          productLastRenewedAt:
            payment.product?.lastRenewedAt?.toISOString() ?? null,
        },
        after: {
          amount: updatedPayment.amount.toString(),
          type: updatedPayment.type,
          periodStart: updatedPayment.periodStart.toISOString(),
          periodEnd: updatedPayment.periodEnd.toISOString(),
          paidAt: updatedPayment.paidAt.toISOString(),
          note: updatedPayment.note,
          subscriptionSynced: syncSubscription,
        },
      },
    });
  });

  await refreshPaymentPages(
    payment.productId,
    payment.product?.slug,
  );

  redirect(`/panel/odemeler/${paymentId}?saved=1`);
}

export async function deletePaymentAction(
  paymentId: string,
  formData: FormData,
): Promise<void> {
  const user = await requireRole([UserRole.ADMIN]);

  const confirmation = String(
    formData.get("confirmation") ?? "",
  )
    .trim()
    .toLocaleUpperCase("tr-TR");

  if (confirmation !== "SIL") {
    redirect(`/panel/odemeler/${paymentId}?error=confirmation`);
  }

  const rollbackSubscription =
    formData.get("rollbackSubscription") === "on";

  const payment = await prisma.productPayment.findUnique({
    where: { id: paymentId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          subscriptionEndsAt: true,
        },
      },
    },
  });

  if (!payment) {
    redirect("/panel/odemeler?error=payment-not-found");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.productPayment.delete({
      where: { id: payment.id },
    });

    if (rollbackSubscription && payment.productId) {
      const latestRemainingPayment =
        await transaction.productPayment.findFirst({
          where: {
            productId: payment.productId,
          },
          orderBy: [
            { periodEnd: "desc" },
            { paidAt: "desc" },
          ],
          select: {
            periodEnd: true,
            paidAt: true,
          },
        });

      await transaction.product.update({
        where: { id: payment.productId },
        data: {
          subscriptionEndsAt:
            latestRemainingPayment?.periodEnd ?? payment.periodStart,
          lastRenewedAt:
            latestRemainingPayment?.paidAt ?? null,
        },
      });
    }

    await writeAuditLog({
      client: transaction,
      actor: user,
      action: "PAYMENT_DELETE",
      entityType: "ProductPayment",
      entityId: payment.id,
      description: `${user.name}, "${payment.productName}" ödeme kaydını sildi.`,
      changes: {
        deletedPayment: {
          amount: payment.amount.toString(),
          type: payment.type,
          periodStart: payment.periodStart.toISOString(),
          periodEnd: payment.periodEnd.toISOString(),
          paidAt: payment.paidAt.toISOString(),
          note: payment.note,
        },
        rollbackSubscription,
      },
    });
  });

  await refreshPaymentPages(
    payment.productId,
    payment.product?.slug,
  );

  redirect("/panel/odemeler?deleted=1");
}

export async function updateSubscriptionDatesAction(
  productId: string,
  formData: FormData,
): Promise<void> {
  const user = await requireRole([UserRole.ADMIN]);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      subscriptionEndsAt: true,
      lastRenewedAt: true,
    },
  });

  if (!product) {
    redirect("/panel/urunler");
  }

  const rawEndsAt = String(
    formData.get("subscriptionEndsAt") ?? "",
  ).trim();

  const rawLastRenewedAt = String(
    formData.get("lastRenewedAt") ?? "",
  ).trim();

  const subscriptionEndsAt = rawEndsAt
    ? parseIstanbulDateTime(rawEndsAt)
    : null;

  const lastRenewedAt = rawLastRenewedAt
    ? parseIstanbulDateTime(rawLastRenewedAt)
    : null;

  if (rawEndsAt && !subscriptionEndsAt) {
    redirect(
      `/panel/urunler/${productId}/abonelik-duzenle?error=end-date`,
    );
  }

  if (rawLastRenewedAt && !lastRenewedAt) {
    redirect(
      `/panel/urunler/${productId}/abonelik-duzenle?error=renew-date`,
    );
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.product.update({
      where: { id: product.id },
      data: {
        subscriptionEndsAt,
        lastRenewedAt,
      },
    });

    await writeAuditLog({
      client: transaction,
      actor: user,
      action: "PRODUCT_SUBSCRIPTION_DATES_UPDATE",
      entityType: "Product",
      entityId: product.id,
      description: `${user.name}, "${product.name}" abonelik tarihlerini manuel olarak düzeltti.`,
      changes: {
        before: {
          subscriptionEndsAt:
            product.subscriptionEndsAt?.toISOString() ?? null,
          lastRenewedAt:
            product.lastRenewedAt?.toISOString() ?? null,
        },
        after: {
          subscriptionEndsAt:
            subscriptionEndsAt?.toISOString() ?? null,
          lastRenewedAt:
            lastRenewedAt?.toISOString() ?? null,
        },
      },
    });
  });

  await refreshPaymentPages(product.id, product.slug);

  redirect(
    `/panel/urunler/${productId}/abonelik-duzenle?saved=1`,
  );
}
