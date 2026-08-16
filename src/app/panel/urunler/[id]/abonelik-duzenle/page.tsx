import Link from "next/link";
import { notFound } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

import { updateSubscriptionDatesAction } from "../../../odemeler/actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

function toInputValue(date: Date | null): string {
  if (!date) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export default async function SubscriptionEditPage({
  params,
  searchParams,
}: PageProps) {
  await requireRole([UserRole.ADMIN]);

  const { id } = await params;
  const query = await searchParams;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      subscriptionEndsAt: true,
      lastRenewedAt: true,
    },
  });

  if (!product) notFound();

  const error =
    query.error === "end-date"
      ? "Geçerli bir abonelik bitiş tarihi girin."
      : query.error === "renew-date"
        ? "Geçerli bir son yenilenme tarihi girin."
        : null;

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/panel/urunler/${product.id}`}
          className="text-sm font-semibold text-neutral-500 transition hover:text-neutral-950"
        >
          ← Ürün detayına dön
        </Link>

        <p className="mt-7 text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
          Abonelik düzeltme
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
          {product.name}
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Yanlışlıkla uzatılan veya hatalı girilen abonelik tarihlerini manuel olarak düzeltin. Bu işlem yeni bir ödeme oluşturmaz.
        </p>
      </div>

      {query.saved === "1" ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          Abonelik tarihleri güncellendi.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}

      <form
        action={updateSubscriptionDatesAction.bind(null, product.id)}
        className="rounded-[26px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-xs font-semibold text-neutral-600">
              Abonelik bitiş tarihi
            </span>
            <input
              type="datetime-local"
              name="subscriptionEndsAt"
              defaultValue={toInputValue(product.subscriptionEndsAt)}
              className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400"
            />
            <span className="mt-2 block text-[11px] leading-5 text-neutral-400">
              Boş bırakırsanız abonelik bitiş tarihi kaldırılır ve kayıt süresiz olur.
            </span>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold text-neutral-600">
              Son yenilenme tarihi
            </span>
            <input
              type="datetime-local"
              name="lastRenewedAt"
              defaultValue={toInputValue(product.lastRenewedAt)}
              className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400"
            />
            <span className="mt-2 block text-[11px] leading-5 text-neutral-400">
              Gerekirse boş bırakabilirsiniz.
            </span>
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
          Bu ekran yalnızca ürünün abonelik tarihlerini değiştirir. Ödeme tutarı veya ödeme dönemi hatalıysa ayrıca Ödemeler sayfasından ilgili ödeme kaydını düzenleyin.
        </div>

        <div className="mt-7 flex justify-end gap-3 border-t border-neutral-100 pt-5">
          <Link
            href={`/panel/urunler/${product.id}`}
            className="flex h-11 items-center rounded-xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-600"
          >
            İptal
          </Link>
          <button
            type="submit"
            className="h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white"
          >
            Abonelik tarihlerini kaydet
          </button>
        </div>
      </form>
    </section>
  );
}
