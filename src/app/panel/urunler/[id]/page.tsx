import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RenewSubscriptionForm } from "@/app/panel/urunler/[id]/RenewSubscriptionForm";
import {
  AnalyticsEventType,
  SubscriptionPaymentType,
  UserRole,
} from "@/generated/prisma/client";
import {
  canWriteProducts,
  requireUser,
} from "@/lib/auth";
import { getProductCategoryConfig } from "@/lib/product-categories";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DAY_IN_MS = 24 * 60 * 60 * 1_000;

type ProductDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type SubscriptionStatus = {
  label: string;
  description: string;
  badgeClassName: string;
  cardClassName: string;
  remainingDays: number | null;
};

const paymentTypeLabels: Record<
  SubscriptionPaymentType,
  string
> = {
  [SubscriptionPaymentType.INITIAL]:
    "İlk ödeme",
  [SubscriptionPaymentType.RENEWAL]:
    "Abonelik yenileme",
  [SubscriptionPaymentType.MANUAL]:
    "Manuel ödeme",
};

function decimalToNumber(
  value: unknown,
): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue)
      ? parsedValue
      : 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsedValue = Number(
      value.toString(),
    );

    return Number.isFinite(parsedValue)
      ? parsedValue
      : 0;
  }

  return 0;
}

function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(
    value,
  );
}

function formatDate(
  date: Date | null,
): string {
  if (!date) {
    return "Tanımlanmadı";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(date);
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

function formatPercentage(
  clicks: number,
  views: number,
): string {
  if (views <= 0) {
    return "0%";
  }

  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
  }).format((clicks / views) * 100)}%`;
}

function getMonthRange(now: Date) {
  const formatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
    },
  );

  const parts = formatter.formatToParts(now);

  const year = Number(
    parts.find(
      (part) => part.type === "year",
    )?.value,
  );

  const month = Number(
    parts.find(
      (part) => part.type === "month",
    )?.value,
  );

  const monthStart = new Date(
    Date.UTC(year, month - 1, 1) -
      3 * 60 * 60 * 1_000,
  );

  const nextMonthStart = new Date(
    Date.UTC(year, month, 1) -
      3 * 60 * 60 * 1_000,
  );

  return {
    monthStart,
    nextMonthStart,
  };
}

function getSubscriptionStatus(
  isActive: boolean,
  subscriptionEndsAt: Date | null,
  now: Date,
): SubscriptionStatus {
  if (
    subscriptionEndsAt &&
    subscriptionEndsAt.getTime() <=
      now.getTime()
  ) {
    return {
      label: "Süresi doldu",
      description:
        "Bu ürünün aboneliği sona erdi. Ödeme alınmadan yeniden yayınlanmaz.",
      badgeClassName:
        "border-red-200 bg-red-50 text-red-700",
      cardClassName:
        "border-red-200 bg-red-50",
      remainingDays: 0,
    };
  }

  if (!isActive) {
    return {
      label: "Manuel pasif",
      description:
        "Ürün yönetici tarafından manuel olarak yayından kaldırıldı.",
      badgeClassName:
        "border-neutral-200 bg-neutral-100 text-neutral-600",
      cardClassName:
        "border-neutral-200 bg-neutral-50",
      remainingDays: null,
    };
  }

  if (!subscriptionEndsAt) {
    return {
      label: "Süresiz",
      description:
        "Bu ürün için abonelik bitiş tarihi tanımlanmamış.",
      badgeClassName:
        "border-blue-200 bg-blue-50 text-blue-700",
      cardClassName:
        "border-blue-200 bg-blue-50",
      remainingDays: null,
    };
  }

  const remainingDays = Math.max(
    1,
    Math.ceil(
      (subscriptionEndsAt.getTime() -
        now.getTime()) /
        DAY_IN_MS,
    ),
  );

  if (remainingDays <= 7) {
    return {
      label: `${remainingDays} gün kaldı`,
      description:
        "Abonelik süresi yakında sona erecek.",
      badgeClassName:
        "border-orange-200 bg-orange-50 text-orange-700",
      cardClassName:
        "border-orange-200 bg-orange-50",
      remainingDays,
    };
  }

  return {
    label: "Aktif",
    description: `${remainingDays} günlük abonelik süresi bulunuyor.`,
    badgeClassName:
      "border-green-200 bg-green-50 text-green-700",
    cardClassName:
      "border-green-200 bg-green-50",
    remainingDays,
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const now = new Date();

  const product =
    await prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        payments: {
          orderBy: {
            paidAt: "desc",
          },
          take: 50,
        },
        _count: {
          select: {
            images: true,
            analyticsEvents: true,
            payments: true,
          },
        },
      },
    });

  if (!product) {
    notFound();
  }

  const { monthStart, nextMonthStart } =
    getMonthRange(now);

  const [
    paymentSummary,
    thisMonthPaymentSummary,
    analyticsRows,
  ] = await Promise.all([
    prisma.productPayment.aggregate({
      where: {
        productId: product.id,
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
      _max: {
        paidAt: true,
      },
    }),

    prisma.productPayment.aggregate({
      where: {
        productId: product.id,
        paidAt: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    }),

    prisma.analyticsEvent.groupBy({
      by: ["eventType"],
      where: {
        productId: product.id,
        eventType: {
          in: [
            AnalyticsEventType.PRODUCT_VIEW,
            AnalyticsEventType.WHATSAPP_CLICK,
          ],
        },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const analyticsByType = new Map(
    analyticsRows.map((row) => [
      row.eventType,
      row._count._all,
    ]),
  );

  const productViews =
    analyticsByType.get(
      AnalyticsEventType.PRODUCT_VIEW,
    ) ?? 0;

  const whatsappClicks =
    analyticsByType.get(
      AnalyticsEventType.WHATSAPP_CLICK,
    ) ?? 0;

  const totalCollected = decimalToNumber(
    paymentSummary._sum.amount,
  );

  const thisMonthCollected =
    decimalToNumber(
      thisMonthPaymentSummary._sum.amount,
    );

  const subscriptionStatus =
    getSubscriptionStatus(
      product.isActive,
      product.subscriptionEndsAt,
      now,
    );

  const categoryInformation =
    getProductCategoryConfig(
      product.category,
    );

  const canEdit =
  canWriteProducts(user.role);

  const canCorrectFinancials =
    user.role === UserRole.OWNER ||
    user.role === UserRole.ADMIN;

  return (
    <section>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/panel/urunler"
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
          >
            ← Ürünlere dön
          </Link>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${categoryInformation.badgeClassName}`}
            >
              {categoryInformation.label}
            </span>

            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${subscriptionStatus.badgeClassName}`}
            >
              {subscriptionStatus.label}
            </span>
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-4xl">
            {product.name}
          </h1>

          <p className="mt-3 text-sm text-neutral-500">
            {categoryInformation.label} kategorisi ·{" "}
            {product.sortOrder}. sıra
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/urun/${product.slug}`}
            target="_blank"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
          >
            Sitede görüntüle
          </Link>

          {canEdit ? (
            <Link
              href={`/panel/urunler/${product.id}/duzenle`}
              className="rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Ürünü düzenle
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Aylık abonelik"
          value={formatCurrency(
            decimalToNumber(
              product.subscriptionFee,
            ),
          )}
          description="Güncel aylık ücret"
        />

        <MetricCard
          label="Toplam tahsilat"
          value={formatCurrency(totalCollected)}
          description={`${paymentSummary._count._all} ödeme kaydı`}
        />

        <MetricCard
          label="Bu ay tahsil edilen"
          value={formatCurrency(
            thisMonthCollected,
          )}
          description={`${thisMonthPaymentSummary._count._all} ödeme`}
        />

        <MetricCard
          label="Dönüşüm oranı"
          value={formatPercentage(
            whatsappClicks,
            productViews,
          )}
          description={`${formatNumber(
            whatsappClicks,
          )} WhatsApp tıklaması`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-black/[0.05]">
            <div className="border-b border-neutral-100 px-5 py-5 sm:px-6">
              <h2 className="text-base font-semibold text-neutral-950">
                Ürün ve abonelik bilgileri
              </h2>

              <p className="mt-1 text-xs text-neutral-500">
                Ürünün sistemdeki güncel kayıt
                bilgileri
              </p>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:p-6">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
                <Image
                  src={product.coverImage}
                  alt={product.name}
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InformationBox
                  label="Siteye eklenme"
                  value={formatDate(
                    product.createdAt,
                  )}
                />

                <InformationBox
                  label="Abonelik bitişi"
                  value={formatDate(
                    product.subscriptionEndsAt,
                  )}
                />

                <InformationBox
                  label="Son yenilenme"
                  value={formatDate(
                    product.lastRenewedAt,
                  )}
                />

                <InformationBox
                  label="Son ödeme"
                  value={
                    paymentSummary._max.paidAt
                      ? formatDate(
                          paymentSummary._max.paidAt,
                        )
                      : "Henüz ödeme yok"
                  }
                />

                <InformationBox
                  label="Kategori"
                  value={
                    categoryInformation.label
                  }
                />

                <InformationBox
                  label="Kategori sırası"
                  value={`${product.sortOrder}. sıra`}
                />

                <InformationBox
                  label="Ürün görüntüleme"
                  value={formatNumber(
                    productViews,
                  )}
                />

                <InformationBox
                  label="WhatsApp tıklaması"
                  value={formatNumber(
                    whatsappClicks,
                  )}
                />
              </div>
            </div>
          </section>

          <section
            className={`rounded-[24px] border p-5 sm:p-6 ${subscriptionStatus.cardClassName}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Abonelik durumu
                </p>

                <h2 className="mt-2 text-xl font-semibold text-neutral-950">
                  {subscriptionStatus.label}
                </h2>

                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {subscriptionStatus.description}
                </p>

                {canCorrectFinancials ? (
                  <Link
                    href={`/panel/urunler/${product.id}/abonelik-duzenle`}
                    className="mt-4 inline-flex items-center rounded-xl border border-neutral-300 bg-white/80 px-3 py-2 text-xs font-bold text-neutral-700 transition hover:border-neutral-950 hover:bg-neutral-950 hover:text-white"
                  >
                    Abonelik tarihlerini düzelt
                  </Link>
                ) : null}
              </div>

              {subscriptionStatus.remainingDays !==
              null ? (
                <div className="shrink-0 rounded-2xl bg-white/70 px-5 py-4 text-center shadow-sm">
                  <p className="text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
                    {
                      subscriptionStatus.remainingDays
                    }
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    kalan gün
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-black/[0.05]">
            <div className="border-b border-neutral-100 px-5 py-5 sm:px-6">
              <h2 className="text-base font-semibold text-neutral-950">
                Ödeme geçmişi
              </h2>

              <p className="mt-1 text-xs text-neutral-500">
                Ürün için kaydedilen abonelik
                ödemeleri
              </p>
            </div>

            {product.payments.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {product.payments.map(
                  (payment) => (
                    <article
                      key={payment.id}
                      className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_160px_140px] sm:items-center sm:px-6"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-neutral-950">
                            {
                              paymentTypeLabels[
                                payment.type
                              ]
                            }
                          </p>

                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                            Ödendi
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-neutral-500">
                          {formatDateTime(
                            payment.paidAt,
                          )}
                        </p>

                        {payment.note ? (
                          <p className="mt-2 text-xs leading-5 text-neutral-400">
                            {payment.note}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                          Abonelik dönemi
                        </p>

                        <p className="mt-1 text-xs font-medium text-neutral-700">
                          {formatDate(
                            payment.periodStart,
                          )}
                        </p>

                        <p className="mt-0.5 text-xs text-neutral-400">
                          →{" "}
                          {formatDate(
                            payment.periodEnd,
                          )}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <p className="text-left text-base font-semibold text-green-700 sm:text-right">
                          +
                          {formatCurrency(
                            decimalToNumber(
                              payment.amount,
                            ),
                          )}
                        </p>

                        {canCorrectFinancials ? (
                          <Link
                            href={`/panel/odemeler/${payment.id}`}
                            className="inline-flex h-8 items-center rounded-lg border border-neutral-200 bg-white px-2.5 text-[11px] font-bold text-neutral-600 transition hover:border-neutral-950 hover:bg-neutral-950 hover:text-white"
                          >
                            Düzenle
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  ),
                )}
              </div>
            ) : (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-neutral-700">
                  Henüz ödeme kaydı yok
                </p>

                <p className="mt-2 text-xs text-neutral-500">
                  Abonelik yenilendiğinde ödeme
                  geçmişi burada görünecek.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {canEdit ? (
            <RenewSubscriptionForm
              productId={product.id}
              defaultAmount={product.subscriptionFee.toString()}
            />
          ) : (
            <div className="rounded-[24px] bg-neutral-950 p-6 text-white">
              <h2 className="text-base font-semibold">
                Görüntüleme yetkisi
              </h2>

              <p className="mt-2 text-xs leading-5 text-white/60">
                Hesabınız ürün bilgilerini
                görüntüleyebilir ancak abonelik
                yenileme yetkisine sahip değildir.
              </p>
            </div>
          )}

          <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-6">
            <h2 className="text-base font-semibold text-neutral-950">
              Ürün özeti
            </h2>

            <div className="mt-5 divide-y divide-neutral-100">
              <SummaryRow
                label="Toplam görsel"
                value={formatNumber(
                  product._count.images + 1,
                )}
              />

              <SummaryRow
                label="Toplam etkinlik"
                value={formatNumber(
                  product._count.analyticsEvents,
                )}
              />

              <SummaryRow
                label="Ödeme sayısı"
                value={formatNumber(
                  paymentSummary._count._all,
                )}
              />

              <SummaryRow
                label="Yayın ayarı"
                value={
                  product.isActive
                    ? "Aktif"
                    : "Pasif"
                }
                last
              />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
};

function MetricCard({
  label,
  value,
  description,
}: MetricCardProps) {
  return (
    <div className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05]">
      <p className="text-xs font-medium text-neutral-500">
        {label}
      </p>

      <p className="mt-3 break-words text-2xl font-semibold tracking-[-0.04em] text-neutral-950">
        {value}
      </p>

      <p className="mt-2 text-xs text-neutral-400">
        {description}
      </p>
    </div>
  );
}

type InformationBoxProps = {
  label: string;
  value: string;
};

function InformationBox({
  label,
  value,
}: InformationBoxProps) {
  return (
    <div className="rounded-2xl bg-neutral-50 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-neutral-800">
        {value}
      </p>
    </div>
  );
}

type SummaryRowProps = {
  label: string;
  value: string;
  last?: boolean;
};

function SummaryRow({
  label,
  value,
  last = false,
}: SummaryRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-4 ${
        last ? "pb-0" : ""
      }`}
    >
      <span className="text-sm text-neutral-500">
        {label}
      </span>

      <span className="text-sm font-semibold text-neutral-900">
        {value}
      </span>
    </div>
  );
}