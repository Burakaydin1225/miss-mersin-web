import Link from "next/link";

import {
  SubscriptionPaymentType,
  UserRole,
} from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    month?: string;
    page?: string;
    deleted?: string;
    error?: string;
  }>;
};

const typeLabels: Record<SubscriptionPaymentType, string> = {
  [SubscriptionPaymentType.INITIAL]: "İlk ödeme",
  [SubscriptionPaymentType.RENEWAL]: "Yenileme",
  [SubscriptionPaymentType.MANUAL]: "Manuel ödeme",
};

const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1_000;

function decimalToNumber(value: unknown): number {
  const number = Number(
    typeof value === "object" &&
      value !== null &&
      "toString" in value &&
      typeof value.toString === "function"
      ? value.toString()
      : value ?? 0,
  );

  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value: unknown): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(decimalToNumber(value));
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function getCurrentMonthKey(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());

  const year =
    parts.find((part) => part.type === "year")?.value ??
    "2026";

  const month =
    parts.find((part) => part.type === "month")?.value ??
    "01";

  return `${year}-${month}`;
}

function isValidMonthKey(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }

  const [, rawMonth] = value.split("-");
  const month = Number(rawMonth);

  return month >= 1 && month <= 12;
}

function shiftMonthKey(
  monthKey: string,
  offset: number,
): string {
  const [year, month] = monthKey.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1 + offset, 1),
  );

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}

function getMonthRange(monthKey: string): {
  start: Date;
  end: Date;
} {
  const [year, month] = monthKey.split("-").map(Number);

  return {
    start: new Date(
      Date.UTC(year, month - 1, 1) -
        ISTANBUL_OFFSET_MS,
    ),
    end: new Date(
      Date.UTC(year, month, 1) -
        ISTANBUL_OFFSET_MS,
    ),
  };
}

function getMonthKeyForDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
  });

  const parts = formatter.formatToParts(date);

  const year =
    parts.find((part) => part.type === "year")?.value ??
    "";

  const month =
    parts.find((part) => part.type === "month")?.value ??
    "";

  return `${year}-${month}`;
}

function formatMonthLabel(
  monthKey: string,
  short = false,
): string {
  const [year, month] = monthKey.split("-").map(Number);

  return new Intl.DateTimeFormat("tr-TR", {
    month: short ? "short" : "long",
    year: short ? undefined : "numeric",
    timeZone: "Europe/Istanbul",
  }).format(
    new Date(
      Date.UTC(year, month - 1, 15, 12),
    ),
  );
}

function buildQueryString(values: {
  q: string;
  type: SubscriptionPaymentType | null;
  month: string;
  page?: number;
}): string {
  const params = new URLSearchParams();

  if (values.q) params.set("q", values.q);
  if (values.type) params.set("type", values.type);
  if (values.month) params.set("month", values.month);
  if (values.page && values.page > 1) {
    params.set("page", String(values.page));
  }

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export default async function PaymentsPage({
  searchParams,
}: PageProps) {
  await requireRole([UserRole.ADMIN]);

  const params = await searchParams;

  const query = (params.q ?? "").trim();
  const rawType = (params.type ?? "").trim();

  const paymentType = Object.values(
    SubscriptionPaymentType,
  ).includes(rawType as SubscriptionPaymentType)
    ? (rawType as SubscriptionPaymentType)
    : null;

  const rawMonth = (params.month ?? "").trim();

  const selectedMonth =
    rawMonth && isValidMonthKey(rawMonth)
      ? rawMonth
      : "";

  const requestedPage = Number.parseInt(
    params.page ?? "1",
    10,
  );

  const page = Number.isFinite(requestedPage)
    ? Math.max(1, requestedPage)
    : 1;

  const pageSize = 30;

  const monthRange = selectedMonth
    ? getMonthRange(selectedMonth)
    : null;

  const where = {
    ...(query
      ? {
          productName: {
            contains: query,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(paymentType
      ? {
          type: paymentType,
        }
      : {}),
    ...(monthRange
      ? {
          paidAt: {
            gte: monthRange.start,
            lt: monthRange.end,
          },
        }
      : {}),
  };

  const currentMonthKey = getCurrentMonthKey();

  const chartMonthKeys = Array.from(
    { length: 12 },
    (_, index) =>
      shiftMonthKey(
        currentMonthKey,
        index - 11,
      ),
  );

  const chartStart =
    getMonthRange(chartMonthKeys[0]).start;

  const [
    totalCount,
    payments,
    allTimeSummary,
    filteredSummary,
    chartPayments,
  ] = await Promise.all([
    prisma.productPayment.count({ where }),

    prisma.productPayment.findMany({
      where,
      orderBy: [
        { paidAt: "desc" },
        { id: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        product: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
    }),

    prisma.productPayment.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
    }),

    prisma.productPayment.aggregate({
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),

    prisma.productPayment.findMany({
      where: {
        paidAt: {
          gte: chartStart,
        },
      },
      select: {
        paidAt: true,
        amount: true,
      },
      orderBy: {
        paidAt: "asc",
      },
    }),
  ]);

  const monthlyRevenue = new Map<
    string,
    {
      amount: number;
      count: number;
    }
  >(
    chartMonthKeys.map((key) => [
      key,
      {
        amount: 0,
        count: 0,
      },
    ]),
  );

  for (const payment of chartPayments) {
    const monthKey =
      getMonthKeyForDate(payment.paidAt);

    const record = monthlyRevenue.get(monthKey);

    if (!record) continue;

    record.amount +=
      decimalToNumber(payment.amount);

    record.count += 1;
  }

  const chartData = chartMonthKeys.map(
    (monthKey) => ({
      monthKey,
      label: formatMonthLabel(
        monthKey,
        true,
      ),
      amount:
        monthlyRevenue.get(monthKey)?.amount ??
        0,
      count:
        monthlyRevenue.get(monthKey)?.count ??
        0,
    }),
  );

  const highestChartAmount = Math.max(
    1,
    ...chartData.map((item) => item.amount),
  );

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / pageSize),
  );

  const monthOptions = Array.from(
    { length: 24 },
    (_, index) =>
      shiftMonthKey(
        currentMonthKey,
        -index,
      ),
  );

  const filteredLabel = selectedMonth
    ? formatMonthLabel(selectedMonth)
    : query || paymentType
      ? "Filtrelenen kayıtlar"
      : "Tüm kayıtlar";

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
            Finans
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
            Ödemeler
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            Aylık tahsilatı takip edin, geçmiş ayları karşılaştırın ve hatalı ödeme kayıtlarını düzeltin.
          </p>
        </div>

        <Link
          href="/panel"
          className="text-sm font-semibold text-neutral-500 transition hover:text-neutral-950"
        >
          Genel bakışa dön →
        </Link>
      </div>

      {params.deleted === "1" ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          Ödeme kaydı silindi.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Tüm zamanlar tahsilat"
          value={formatCurrency(
            allTimeSummary._sum.amount,
          )}
          description={`${allTimeSummary._count._all} ödeme kaydı`}
        />

        <SummaryCard
          label={`${filteredLabel} tahsilatı`}
          value={formatCurrency(
            filteredSummary._sum.amount,
          )}
          description={`${filteredSummary._count._all} ödeme`}
        />

        <SummaryCard
          label="Filtre sonucu"
          value={`${totalCount}`}
          description={
            selectedMonth
              ? `${formatMonthLabel(
                  selectedMonth,
                )} içindeki kayıtlar`
              : "eşleşen ödeme kaydı"
          }
        />
      </div>

      <section className="overflow-hidden rounded-[26px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-neutral-400">
              Tahsilat grafiği
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-neutral-950">
              Son 12 ay
            </h2>

            <p className="mt-1 text-xs text-neutral-500">
              Ödeme tarihine göre aylık toplam tahsilat
            </p>
          </div>

          <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
              Son 12 ay toplamı
            </p>

            <p className="mt-1 text-lg font-bold text-neutral-950">
              {formatCurrency(
                chartData.reduce(
                  (total, item) =>
                    total + item.amount,
                  0,
                ),
              )}
            </p>
          </div>
        </div>

        <div className="mt-7 overflow-x-auto pb-2">
          <div className="flex h-[290px] min-w-[760px] items-end gap-3 border-b border-neutral-200 px-1">
            {chartData.map((item) => {
              const height =
                item.amount <= 0
                  ? 2
                  : Math.max(
                      8,
                      Math.round(
                        (item.amount /
                          highestChartAmount) *
                          100,
                      ),
                    );

              const isSelected =
                selectedMonth ===
                item.monthKey;

              return (
                <Link
                  key={item.monthKey}
                  href={`/panel/odemeler${buildQueryString(
                    {
                      q: query,
                      type: paymentType,
                      month: item.monthKey,
                    },
                  )}`}
                  className="group flex h-full min-w-0 flex-1 flex-col justify-end"
                  title={`${formatMonthLabel(
                    item.monthKey,
                  )}: ${formatCurrency(
                    item.amount,
                  )}`}
                >
                  <div className="mb-2 text-center">
                    <p className="truncate text-[10px] font-bold text-neutral-700">
                      {formatCurrency(
                        item.amount,
                      )}
                    </p>

                    <p className="mt-0.5 text-[9px] text-neutral-400">
                      {item.count} ödeme
                    </p>
                  </div>

                  <div className="flex h-[190px] items-end rounded-t-xl bg-neutral-50 px-1.5">
                    <div
                      className={`w-full rounded-t-lg transition-all group-hover:opacity-80 ${
                        isSelected
                          ? "bg-neutral-950"
                          : "bg-neutral-300"
                      }`}
                      style={{
                        height: `${height}%`,
                      }}
                    />
                  </div>

                  <p
                    className={`mt-3 truncate text-center text-[10px] font-semibold ${
                      isSelected
                        ? "text-neutral-950"
                        : "text-neutral-500"
                    }`}
                  >
                    {item.label}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <form className="grid gap-3 rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-black/[0.05] sm:grid-cols-[minmax(0,1fr)_200px_200px_auto]">
        <input
          name="q"
          defaultValue={query}
          placeholder="İlan adına göre ara..."
          className="h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none transition focus:border-neutral-400"
        />

        <select
          name="type"
          defaultValue={paymentType ?? ""}
          className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-400"
        >
          <option value="">
            Tüm ödeme türleri
          </option>

          {Object.values(
            SubscriptionPaymentType,
          ).map((type) => (
            <option
              key={type}
              value={type}
            >
              {typeLabels[type]}
            </option>
          ))}
        </select>

        <select
          name="month"
          defaultValue={selectedMonth}
          className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-neutral-400"
        >
          <option value="">
            Tüm aylar
          </option>

          {monthOptions.map((monthKey) => (
            <option
              key={monthKey}
              value={monthKey}
            >
              {formatMonthLabel(monthKey)}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="h-11 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Filtrele
        </button>
      </form>

      {selectedMonth ||
      query ||
      paymentType ? (
        <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3">
          <p className="text-xs text-neutral-500">
            {selectedMonth ? (
              <>
                Dönem:{" "}
                <strong className="text-neutral-900">
                  {formatMonthLabel(
                    selectedMonth,
                  )}
                </strong>
              </>
            ) : (
              "Filtre uygulanıyor"
            )}
          </p>

          <Link
            href="/panel/odemeler"
            className="text-xs font-bold text-neutral-700 underline underline-offset-4"
          >
            Filtreleri temizle
          </Link>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[26px] bg-white shadow-sm ring-1 ring-black/[0.05]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/80 text-left">
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-neutral-400">
                  İlan
                </th>

                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-neutral-400">
                  Tür
                </th>

                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-neutral-400">
                  Ödeme tarihi
                </th>

                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-neutral-400">
                  Abonelik dönemi
                </th>

                <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.12em] text-neutral-400">
                  Tutar
                </th>

                <th className="px-5 py-4" />
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="transition hover:bg-neutral-50/70"
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-neutral-950">
                      {payment.productName}
                    </p>

                    <p className="mt-1 text-xs text-neutral-400">
                      {payment.category}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[10px] font-bold text-neutral-600">
                      {typeLabels[payment.type]}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm text-neutral-600">
                    {formatDateTime(
                      payment.paidAt,
                    )}
                  </td>

                  <td className="px-5 py-4 text-xs leading-5 text-neutral-500">
                    <span>
                      {formatDateTime(
                        payment.periodStart,
                      )}
                    </span>

                    <span className="mx-2 text-neutral-300">
                      →
                    </span>

                    <span>
                      {formatDateTime(
                        payment.periodEnd,
                      )}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right text-sm font-bold text-green-700">
                    {formatCurrency(
                      payment.amount,
                    )}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/panel/odemeler/${payment.id}`}
                      className="inline-flex h-9 items-center rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 transition hover:border-neutral-950 hover:bg-neutral-950 hover:text-white"
                    >
                      Düzenle
                    </Link>
                  </td>
                </tr>
              ))}

              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center text-sm text-neutral-500"
                  >
                    Bu filtrelerle eşleşen ödeme bulunamadı.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-4">
            <p className="text-xs text-neutral-400">
              Sayfa {page} / {totalPages}
            </p>

            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={`/panel/odemeler${buildQueryString(
                    {
                      q: query,
                      type: paymentType,
                      month: selectedMonth,
                      page: page - 1,
                    },
                  )}`}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600"
                >
                  ← Önceki
                </Link>
              ) : null}

              {page < totalPages ? (
                <Link
                  href={`/panel/odemeler${buildQueryString(
                    {
                      q: query,
                      type: paymentType,
                      month: selectedMonth,
                      page: page + 1,
                    },
                  )}`}
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600"
                >
                  Sonraki →
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05]">
      <p className="text-xs font-medium text-neutral-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-neutral-950">
        {value}
      </p>

      <p className="mt-2 text-xs text-neutral-400">
        {description}
      </p>
    </div>
  );
}
