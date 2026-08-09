import Image from "next/image";
import Link from "next/link";

import { DeleteProductForm } from "@/app/panel/urunler/DeleteProductForm";
import {
  canRemoveProducts,
  canWriteProducts,
  requireUser,
} from "@/lib/auth";
import {
  PRODUCT_CATEGORY_CONFIG,
  type ProductCategoryValue,
} from "@/lib/product-categories";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DAY_IN_MS = 24 * 60 * 60 * 1_000;

type SubscriptionStatusKey =
  | "ACTIVE"
  | "EXPIRING"
  | "EXPIRED"
  | "PASSIVE"
  | "UNLIMITED";

type SubscriptionStatus = {
  key: SubscriptionStatusKey;
  label: string;
  description: string;
  badgeClassName: string;
  borderClassName: string;
  remainingDays: number | null;
};

type SubscriptionProduct = {
  isActive: boolean;
  subscriptionEndsAt: Date | null;
};

function decimalToNumber(value: unknown): number {
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

function formatCurrency(value: number): string {
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
    month: "short",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function getSubscriptionStatus(
  product: SubscriptionProduct,
  now: Date,
): SubscriptionStatus {
  const subscriptionEndsAt =
    product.subscriptionEndsAt;

  if (
    subscriptionEndsAt &&
    subscriptionEndsAt.getTime() <= now.getTime()
  ) {
    return {
      key: "EXPIRED",
      label: "Süresi doldu",
      description:
        "Ürün ana sayfada gösterilmemeli.",
      badgeClassName:
        "border-red-200 bg-red-50 text-red-700",
      borderClassName: "border-l-red-500",
      remainingDays: 0,
    };
  }

  if (!product.isActive) {
    return {
      key: "PASSIVE",
      label: "Manuel pasif",
      description:
        "Ürün yönetici tarafından yayından kaldırılmış.",
      badgeClassName:
        "border-neutral-200 bg-neutral-100 text-neutral-600",
      borderClassName: "border-l-neutral-400",
      remainingDays: null,
    };
  }

  if (!subscriptionEndsAt) {
    return {
      key: "UNLIMITED",
      label: "Süresiz",
      description:
        "Abonelik bitiş tarihi tanımlanmamış.",
      badgeClassName:
        "border-blue-200 bg-blue-50 text-blue-700",
      borderClassName: "border-l-blue-500",
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
      key: "EXPIRING",
      label: `${remainingDays} gün kaldı`,
      description:
        "Abonelik yenileme tarihi yaklaşıyor.",
      badgeClassName:
        "border-orange-200 bg-orange-50 text-orange-700",
      borderClassName: "border-l-orange-500",
      remainingDays,
    };
  }

  return {
    key: "ACTIVE",
    label: "Aktif",
    description: `${remainingDays} gün abonelik süresi var.`,
    badgeClassName:
      "border-green-200 bg-green-50 text-green-700",
    borderClassName: "border-l-green-500",
    remainingDays,
  };
}

function isActiveSubscription(
  product: SubscriptionProduct,
  now: Date,
): boolean {
  if (!product.isActive) {
    return false;
  }

  return (
    product.subscriptionEndsAt === null ||
    product.subscriptionEndsAt.getTime() >
      now.getTime()
  );
}

export default async function ProductsPage() {
  const user = await requireUser();
  const now = new Date();

  const [products, paymentTotals] =
    await Promise.all([
      prisma.product.findMany({
        orderBy: [
          {
            category: "asc",
          },
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        include: {
          _count: {
            select: {
              images: true,
              analyticsEvents: true,
              payments: true,
            },
          },
        },
      }),

      prisma.productPayment.groupBy({
        by: ["productId"],
        where: {
          productId: {
            not: null,
          },
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
    ]);

  const canEdit =
    canWriteProducts(user.role);

  const canDelete =
    canRemoveProducts(user.role);

  const paymentInformationByProduct =
    new Map<
      string,
      {
        totalAmount: number;
        paymentCount: number;
        lastPaidAt: Date | null;
      }
    >();

  for (const paymentTotal of paymentTotals) {
    if (!paymentTotal.productId) {
      continue;
    }

    paymentInformationByProduct.set(
      paymentTotal.productId,
      {
        totalAmount: decimalToNumber(
          paymentTotal._sum.amount,
        ),
        paymentCount:
          paymentTotal._count._all,
        lastPaidAt:
          paymentTotal._max.paidAt,
      },
    );
  }

  const activeSubscriptionCount =
    products.filter((product) =>
      isActiveSubscription(product, now),
    ).length;

  const expiringSoonCount = products.filter(
    (product) =>
      getSubscriptionStatus(product, now).key ===
      "EXPIRING",
  ).length;

  const expiredSubscriptionCount =
    products.filter(
      (product) =>
        getSubscriptionStatus(product, now)
          .key === "EXPIRED",
    ).length;

  const expectedMonthlyRevenue =
    products.reduce((total, product) => {
      if (
        !isActiveSubscription(product, now)
      ) {
        return total;
      }

      return (
        total +
        decimalToNumber(
          product.subscriptionFee,
        )
      );
    }, 0);

  const categoryGroups =
    PRODUCT_CATEGORY_CONFIG.map(
      (category) => {
        const categoryProducts = products
          .filter(
            (product) =>
              product.category ===
              (category.value as ProductCategoryValue),
          )
          .sort(
            (
              firstProduct,
              secondProduct,
            ) => {
              if (
                firstProduct.sortOrder !==
                secondProduct.sortOrder
              ) {
                return (
                  firstProduct.sortOrder -
                  secondProduct.sortOrder
                );
              }

              return (
                firstProduct.createdAt.getTime() -
                secondProduct.createdAt.getTime()
              );
            },
          );

        const activeCount =
          categoryProducts.filter((product) =>
            isActiveSubscription(product, now),
          ).length;

        const expiredCount =
          categoryProducts.filter(
            (product) =>
              getSubscriptionStatus(
                product,
                now,
              ).key === "EXPIRED",
          ).length;

        const monthlyRevenue =
          categoryProducts.reduce(
            (total, product) => {
              if (
                !isActiveSubscription(
                  product,
                  now,
                )
              ) {
                return total;
              }

              return (
                total +
                decimalToNumber(
                  product.subscriptionFee,
                )
              );
            },
            0,
          );

        return {
          ...category,
          products: categoryProducts,
          activeCount,
          expiredCount,
          monthlyRevenue,
        };
      },
    );

  return (
    <section>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Katalog ve abonelik yönetimi
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
            Ürünler
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
            Ürünlerin kategorilerini, yayın
            durumlarını, abonelik tarihlerini,
            ücretlerini ve ödeme geçmişlerini takip
            edin.
          </p>
        </div>

        {canEdit ? (
          <Link
            href="/panel/urunler/yeni"
            className="flex h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Yeni ürün ekle
          </Link>
        ) : null}
      </div>

      <div className="-mx-4 mt-8 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-5">
        <SummaryCard
          label="Toplam ürün"
          value={formatNumber(products.length)}
          description="Kayıtlı ürün sayısı"
          className="bg-white"
        />

        <SummaryCard
          label="Aktif abonelik"
          value={formatNumber(
            activeSubscriptionCount,
          )}
          description="Yayında kalabilecek ürün"
          className="bg-green-50"
        />

        <SummaryCard
          label="Süresi yaklaşıyor"
          value={formatNumber(
            expiringSoonCount,
          )}
          description="7 gün veya daha az"
          className="bg-orange-50"
        />

        <SummaryCard
          label="Süresi doldu"
          value={formatNumber(
            expiredSubscriptionCount,
          )}
          description="Yenilenmesi gereken ürün"
          className="bg-red-50"
        />

        <SummaryCard
          label="Aylık beklenen"
          value={formatCurrency(
            expectedMonthlyRevenue,
          )}
          description="Aktif abonelik toplamı"
          className="bg-violet-50"
        />
      </div>

      <div className="-mx-4 mt-8 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {categoryGroups.map((category) => (
          <a
            key={category.value}
            href={`#${category.key}`}
            className="group min-w-[250px] shrink-0 rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-black/[0.05] transition hover:-translate-y-0.5 hover:shadow-md sm:min-w-0 sm:shrink"
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${category.badgeClassName}`}
              >
                {category.label}
              </span>

              <span className="text-xs text-neutral-400 transition group-hover:text-neutral-700">
                Bölüme git →
              </span>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold tracking-[-0.04em] text-neutral-950">
                  {category.products.length}
                </p>

                <p className="mt-1 text-xs text-neutral-500">
                  {category.activeCount} aktif ·{" "}
                  {category.expiredCount} süresi
                  dolmuş
                </p>
              </div>

              <p className="text-sm font-semibold text-neutral-800">
                {formatCurrency(
                  category.monthlyRevenue,
                )}
              </p>
            </div>
          </a>
        ))}
      </div>

      <div className="mt-8 space-y-8">
        {categoryGroups.map((category) => (
          <section
            key={category.value}
            id={category.key}
            className="scroll-mt-24 overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-black/[0.05]"
          >
            <div className="border-b border-neutral-100 px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`h-11 w-1.5 shrink-0 rounded-full ${category.accentClassName}`}
                  />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-[-0.02em] text-neutral-950">
                        {category.label} ürünleri
                      </h2>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${category.badgeClassName}`}
                      >
                        {category.label}
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      {category.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600">
                    {category.products.length} ürün
                  </span>

                  <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                    {category.activeCount} aktif
                  </span>

                  <span className="rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white">
                    {formatCurrency(
                      category.monthlyRevenue,
                    )}{" "}
                    / ay
                  </span>

                  {canEdit ? (
                    <Link
                      href="/panel/urunler/yeni"
                      className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                    >
                      Ürün ekle
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            {category.products.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {category.products.map(
                  (product) => {
                    const subscriptionStatus =
                      getSubscriptionStatus(
                        product,
                        now,
                      );

                    const paymentInformation =
                      paymentInformationByProduct.get(
                        product.id,
                      ) ?? {
                        totalAmount: 0,
                        paymentCount: 0,
                        lastPaidAt: null,
                      };

                    return (
                      <article
                        key={product.id}
                        className={`border-l-4 px-3 py-4 transition hover:bg-neutral-50/70 sm:px-5 sm:py-5 ${subscriptionStatus.borderClassName}`}
                      >
                        <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)] xl:items-stretch">
                          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-sm font-semibold text-white sm:size-11">
                              {product.sortOrder}
                            </div>

                            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:size-16">
                              <Image
                                src={product.coverImage}
                                alt={product.name}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-sm font-semibold text-neutral-950">
                                  {product.name}
                                </h3>

                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${subscriptionStatus.badgeClassName}`}
                                >
                                  {
                                    subscriptionStatus.label
                                  }
                                </span>
                              </div>

                              <p className="mt-1 hidden text-xs leading-5 text-neutral-400 sm:block">
                                {category.label} sıra{" "}
                                {product.sortOrder} ·{" "}
                                {product._count.images + 1}{" "}
                                görsel ·{" "}
                                {
                                  product._count
                                    .analyticsEvents
                                }{" "}
                                etkinlik
                              </p>

                              <p className="mt-1 hidden text-[11px] leading-5 text-neutral-500 sm:block">
                                {
                                  subscriptionStatus.description
                                }
                              </p>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
                              <InformationBox
                                label="Aylık ücret"
                                value={formatCurrency(
                                  decimalToNumber(
                                    product.subscriptionFee,
                                  ),
                                )}
                              />

                              <InformationBox
                                label="Toplam tahsilat"
                                value={formatCurrency(
                                  paymentInformation.totalAmount,
                                )}
                                description={`${paymentInformation.paymentCount} ödeme`}
                              />

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
                                description={
                                  product.lastRenewedAt
                                    ? `Son yenileme: ${formatDate(
                                        product.lastRenewedAt,
                                      )}`
                                    : paymentInformation.lastPaidAt
                                      ? `Son ödeme: ${formatDate(
                                          paymentInformation.lastPaidAt,
                                        )}`
                                      : "Henüz yenilenmedi"
                                }
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:mt-4 xl:justify-end">
                              <Link
                                href={`/panel/urunler/${product.id}`}
                                className="rounded-xl bg-neutral-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
                              >
                                Detaylar
                              </Link>

                              <Link
                                href={`/urun/${product.slug}`}
                                target="_blank"
                                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
                              >
                                Görüntüle
                              </Link>

                              {canEdit ? (
                                <Link
                                  href={`/panel/urunler/${product.id}/duzenle`}
                                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
                                >
                                  Düzenle
                                </Link>
                              ) : null}

                              {canDelete ? (
                                <DeleteProductForm
                                  productId={product.id}
                                  productName={product.name}
                                />
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="px-5 py-12 text-center">
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${category.badgeClassName}`}
                >
                  {category.label}
                </span>

                <p className="mt-4 text-sm font-medium text-neutral-700">
                  Bu kategoride henüz ürün bulunmuyor.
                </p>

                <p className="mt-2 text-xs text-neutral-500">
                  Eklenen ürünler kategori içindeki
                  sıra numarasına göre listelenecek.
                </p>

                {canEdit ? (
                  <Link
                    href="/panel/urunler/yeni"
                    className="mt-4 inline-flex text-sm font-semibold text-neutral-950 underline"
                  >
                    {category.label} ürünü ekle
                  </Link>
                ) : null}
              </div>
            )}
          </section>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="mt-8 rounded-[24px] border border-dashed border-neutral-300 bg-neutral-50 px-5 py-10 text-center">
          <p className="text-sm font-medium text-neutral-700">
            Katalogda henüz hiçbir ürün bulunmuyor.
          </p>

          {canEdit ? (
            <Link
              href="/panel/urunler/yeni"
              className="mt-4 inline-flex rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white"
            >
              İlk ürünü ekle
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  className: string;
};

function SummaryCard({
  label,
  value,
  description,
  className,
}: SummaryCardProps) {
  return (
    <div
      className={`min-w-[150px] shrink-0 rounded-[20px] p-3 shadow-sm ring-1 ring-black/[0.05] sm:min-w-0 sm:shrink sm:p-4 ${className}`}
    >
      <p className="text-xs font-medium text-neutral-500">
        {label}
      </p>

      <p className="mt-2 break-words text-xl font-semibold tracking-[-0.04em] text-neutral-950 sm:mt-3 sm:text-2xl">
        {value}
      </p>

      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-neutral-500 sm:text-[11px]">
        {description}
      </p>
    </div>
  );
}

type InformationBoxProps = {
  label: string;
  value: string;
  description?: string;
};

function InformationBox({
  label,
  value,
  description,
}: InformationBoxProps) {
  return (
    <div className="flex min-h-[112px] min-w-0 flex-col rounded-xl bg-neutral-50 px-3 py-3">
      <p className="min-h-7 text-[10px] font-semibold uppercase leading-4 tracking-wide text-neutral-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold leading-5 text-neutral-800">
        {value}
      </p>

      {description ? (
        <p className="mt-auto pt-2 text-[10px] leading-4 text-neutral-400">
          {description}
        </p>
      ) : (
        <span
          aria-hidden="true"
          className="mt-auto block h-4"
        />
      )}
    </div>
  );
}