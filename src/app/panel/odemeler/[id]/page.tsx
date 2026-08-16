import Link from "next/link";
import { notFound } from "next/navigation";

import {
  SubscriptionPaymentType,
  UserRole,
} from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

import {
  deletePaymentAction,
  updatePaymentAction,
} from "../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const typeLabels: Record<SubscriptionPaymentType, string> = {
  [SubscriptionPaymentType.INITIAL]: "İlk ödeme",
  [SubscriptionPaymentType.RENEWAL]: "Yenileme",
  [SubscriptionPaymentType.MANUAL]: "Manuel ödeme",
};

function toIstanbulDateTimeInput(date: Date): string {
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

function errorMessage(error?: string): string | null {
  switch (error) {
    case "amount":
      return "Sıfırdan büyük geçerli bir ödeme tutarı girin.";
    case "type":
      return "Geçerli bir ödeme türü seçin.";
    case "period":
      return "Abonelik dönemi tarihlerini kontrol edin. Bitiş başlangıçtan sonra olmalıdır.";
    case "paidAt":
      return "Geçerli bir ödeme tarihi girin.";
    case "confirmation":
      return 'Ödeme kaydını silmek için onay alanına "SIL" yazın.';
    default:
      return null;
  }
}

export default async function PaymentEditPage({
  params,
  searchParams,
}: PageProps) {
  await requireRole([UserRole.ADMIN]);

  const { id } = await params;
  const query = await searchParams;

  const payment = await prisma.productPayment.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          subscriptionEndsAt: true,
        },
      },
    },
  });

  if (!payment) notFound();

  const message = errorMessage(query.error);

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/panel/odemeler"
          className="text-sm font-semibold text-neutral-500 transition hover:text-neutral-950"
        >
          ← Ödemelere dön
        </Link>

        <p className="mt-7 text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
          Ödeme düzeltme
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
          {payment.productName}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Finans kayıtlarını ve gerekiyorsa bağlı abonelik bitiş tarihini düzeltin.
        </p>
      </div>

      {query.saved === "1" ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          Değişiklikler kaydedildi.
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {message}
        </div>
      ) : null}

      <form
        action={updatePaymentAction.bind(null, payment.id)}
        className="rounded-[26px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Ödeme tutarı">
            <input
              name="amount"
              defaultValue={payment.amount.toString()}
              inputMode="decimal"
              required
              className="input"
            />
          </Field>

          <Field label="Ödeme türü">
            <select
              name="type"
              defaultValue={payment.type}
              className="input"
            >
              {Object.values(SubscriptionPaymentType).map(
                (type) => (
                  <option key={type} value={type}>
                    {typeLabels[type]}
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="Ödeme tarihi">
            <input
              type="datetime-local"
              name="paidAt"
              defaultValue={toIstanbulDateTimeInput(payment.paidAt)}
              required
              className="input"
            />
          </Field>

          <div />

          <Field label="Dönem başlangıcı">
            <input
              type="datetime-local"
              name="periodStart"
              defaultValue={toIstanbulDateTimeInput(payment.periodStart)}
              required
              className="input"
            />
          </Field>

          <Field label="Dönem bitişi">
            <input
              type="datetime-local"
              name="periodEnd"
              defaultValue={toIstanbulDateTimeInput(payment.periodEnd)}
              required
              className="input"
            />
          </Field>
        </div>

        <Field label="Not" className="mt-5">
          <textarea
            name="note"
            defaultValue={payment.note ?? ""}
            rows={4}
            className="input min-h-28 py-3"
          />
        </Field>

        {payment.product ? (
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <input
              type="checkbox"
              name="syncSubscription"
              className="mt-1 size-4"
            />
            <span>
              <span className="block text-sm font-bold text-amber-950">
                Abonelik tarihini de bu ödeme dönemine eşitle
              </span>
              <span className="mt-1 block text-xs leading-5 text-amber-800">
                İşaretlenirse ürünün abonelik bitişi dönem bitişine, son yenilenme tarihi ödeme tarihine ayarlanır. Geçmiş bir kaydı sadece fiyat düzeltmek için düzenliyorsanız işaretlemeyin.
              </span>
            </span>
          </label>
        ) : null}

        <div className="mt-7 flex justify-end gap-3 border-t border-neutral-100 pt-5">
          <Link
            href="/panel/odemeler"
            className="flex h-11 items-center rounded-xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-600"
          >
            İptal
          </Link>
          <button
            type="submit"
            className="h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Değişiklikleri kaydet
          </button>
        </div>
      </form>

      <div className="rounded-[26px] border border-red-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-semibold text-red-800">
          Ödeme kaydını sil
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Bu işlem ödeme kaydını kalıcı olarak siler. İşlem denetim günlüğüne kaydedilir.
        </p>

        <form
          action={deletePaymentAction.bind(null, payment.id)}
          className="mt-5 space-y-4"
        >
          <label className="block">
            <span className="text-xs font-semibold text-neutral-600">
              Onaylamak için SIL yazın
            </span>
            <input
              name="confirmation"
              autoComplete="off"
              className="input mt-2"
              placeholder="SIL"
            />
          </label>

          {payment.product ? (
            <label className="flex items-start gap-3 rounded-2xl bg-red-50 p-4">
              <input
                type="checkbox"
                name="rollbackSubscription"
                className="mt-1 size-4"
              />
              <span className="text-xs leading-5 text-red-800">
                Bu ödeme aboneliği yanlışlıkla uzattıysa ürünün abonelik tarihini kalan son ödeme kaydına göre geri hesapla.
              </span>
            </label>
          ) : null}

          <button
            type="submit"
            className="rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800"
          >
            Ödeme kaydını sil
          </button>
        </form>
      </div>

      <style>{`
        .input {
          width: 100%;
          height: 44px;
          border-radius: 12px;
          border: 1px solid rgb(229 229 229);
          background: white;
          padding-left: 14px;
          padding-right: 14px;
          font-size: 14px;
          color: rgb(23 23 23);
          outline: none;
        }
        .input:focus {
          border-color: rgb(115 115 115);
        }
      `}</style>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-semibold text-neutral-600">
        {label}
      </span>
      {children}
    </label>
  );
}
