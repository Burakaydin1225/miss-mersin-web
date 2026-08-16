import Link from "next/link";

import { TopProductsTable } from "@/components/panel/TopProductsTable";

import {
  AnalyticsEventType,
  ProductCategory,
  SubscriptionPaymentType,
} from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MINUTE_IN_MS = 60 * 1_000;
const DAY_IN_MS = 24 * 60 * MINUTE_IN_MS;

type DayChartData = {
  date: Date;
  dateKey: string;
  label: string;
  pageViews: number;
  productViews: number;
  whatsappClicks: number;
};

type ProductAnalytics = {
  productId: string;
  productName: string;
  slug: string | null;
  views: number;
  clicks: number;
};

const categoryInformation: Record<
  ProductCategory,
  {
    label: string;
    badgeClassName: string;
    barClassName: string;
  }
> = {
  [ProductCategory.VIP]: {
    label: "VIP",
    badgeClassName: "border-violet-200 bg-violet-50 text-violet-700",
    barClassName: "bg-violet-600",
  },
  [ProductCategory.PREMIUM]: {
    label: "Premium",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
    barClassName: "bg-amber-500",
  },
  [ProductCategory.GOLD]: {
    label: "Gold",
    badgeClassName: "border-yellow-300 bg-yellow-50 text-yellow-700",
    barClassName: "bg-yellow-500",
  },
};

const paymentTypeLabels: Record<SubscriptionPaymentType, string> = {
  [SubscriptionPaymentType.INITIAL]: "İlk ödeme",
  [SubscriptionPaymentType.RENEWAL]: "Yenileme",
  [SubscriptionPaymentType.MANUAL]: "Manuel ödeme",
};

function getTimezoneOffsetMinutes(): number {
  const parsedValue = Number.parseInt(
    process.env.ANALYTICS_TIMEZONE_OFFSET_MINUTES ?? "180",
    10,
  );

  if (!Number.isInteger(parsedValue)) {
    return 180;
  }

  return parsedValue;
}

function getLocalDateInformation() {
  const timezoneOffsetMinutes = getTimezoneOffsetMinutes();

  const now = new Date();

  const shiftedNow = new Date(
    now.getTime() + timezoneOffsetMinutes * MINUTE_IN_MS,
  );

  const dateValue = new Date(
    Date.UTC(
      shiftedNow.getUTCFullYear(),
      shiftedNow.getUTCMonth(),
      shiftedNow.getUTCDate(),
    ),
  );

  const startAt = new Date(
    dateValue.getTime() - timezoneOffsetMinutes * MINUTE_IN_MS,
  );

  const endAt = new Date(startAt.getTime() + DAY_IN_MS);

  return {
    now,
    dateValue,
    startAt,
    endAt,
    timezoneOffsetMinutes,
  };
}

function getLocalMonthRange(now: Date, timezoneOffsetMinutes: number) {
  const shiftedNow = new Date(
    now.getTime() + timezoneOffsetMinutes * MINUTE_IN_MS,
  );

  const localMonthStart = new Date(
    Date.UTC(shiftedNow.getUTCFullYear(), shiftedNow.getUTCMonth(), 1),
  );

  const localNextMonthStart = new Date(
    Date.UTC(shiftedNow.getUTCFullYear(), shiftedNow.getUTCMonth() + 1, 1),
  );

  return {
    monthStartAt: new Date(
      localMonthStart.getTime() - timezoneOffsetMinutes * MINUTE_IN_MS,
    ),
    nextMonthStartAt: new Date(
      localNextMonthStart.getTime() - timezoneOffsetMinutes * MINUTE_IN_MS,
    ),
  };
}

function addDays(date: Date, numberOfDays: number): Date {
  return new Date(date.getTime() + numberOfDays * DAY_IN_MS);
}

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getLocalDateKeyFromTimestamp(
  date: Date,
  timezoneOffsetMinutes: number,
): string {
  return getDateKey(
    new Date(date.getTime() + timezoneOffsetMinutes * MINUTE_IN_MS),
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function decimalToNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsedValue = Number(value.toString());

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
}

function formatPercentage(clicks: number, views: number): string {
  if (views <= 0) {
    return "0%";
  }

  const value = (clicks / views) * 100;

  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function formatUpdateTime(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
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

function getDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function getBarHeight(value: number, maximumValue: number): number {
  if (value <= 0 || maximumValue <= 0) {
    return 0;
  }

  return Math.max(7, Math.round((value / maximumValue) * 100));
}

type PanelPageProps = {
  searchParams?: Promise<{
    range?: string;
  }>;
};

export default async function PanelPage({ searchParams }: PanelPageProps) {
  const user = await requireUser();
  const resolvedSearchParams = (await searchParams) ?? {};
  const chartRangeDays = resolvedSearchParams.range === "30" ? 30 : 7;

  const {
    now,
    dateValue: todayDate,
    startAt: todayStartAt,
    endAt: todayEndAt,
    timezoneOffsetMinutes,
  } = getLocalDateInformation();

  const { monthStartAt, nextMonthStartAt } = getLocalMonthRange(
    now,
    timezoneOffsetMinutes,
  );

  const chartStartDate = addDays(todayDate, -(chartRangeDays - 1));
  const sevenDayStartAt = addDays(todayStartAt, -6);
  const sevenDaysLater = addDays(now, 7);

  const activeSessionThreshold = new Date(Date.now() - 5 * MINUTE_IN_MS);

  const [
    settings,
    totalProducts,
    activeProducts,
    todayPageViews,
    todayProductViews,
    todayWhatsappClicks,
    todayUniqueVisitors,
    activeVisitors,
    rangeDailySummaries,
    todayChartEvents,
    sevenDayProductTotals,
    activeSubscriptionSummary,
    thisMonthPaymentSummary,
    totalPaymentSummary,
    expiringSoonCount,
    expiredSubscriptionCount,
    categoryRevenueRows,
    recentPayments,
    subscriptionAlertProducts,
  ] = await Promise.all([
    prisma.siteSettings.findUnique({
      where: {
        id: "default",
      },
      select: {
        companyName: true,
      },
    }),

    prisma.product.count(),

    prisma.product.count({
      where: {
        isActive: true,
      },
    }),

    prisma.analyticsEvent.count({
      where: {
        eventType: AnalyticsEventType.PAGE_VIEW,
        createdAt: {
          gte: todayStartAt,
          lt: todayEndAt,
        },
      },
    }),

    prisma.analyticsEvent.count({
      where: {
        eventType: AnalyticsEventType.PRODUCT_VIEW,
        createdAt: {
          gte: todayStartAt,
          lt: todayEndAt,
        },
      },
    }),

    prisma.analyticsEvent.count({
      where: {
        eventType: AnalyticsEventType.WHATSAPP_CLICK,
        createdAt: {
          gte: todayStartAt,
          lt: todayEndAt,
        },
      },
    }),

    prisma.analyticsEvent.findMany({
      where: {
        eventType: AnalyticsEventType.PAGE_VIEW,
        createdAt: {
          gte: todayStartAt,
          lt: todayEndAt,
        },
      },
      distinct: ["visitorHash"],
      select: {
        visitorHash: true,
      },
    }),

    prisma.activeSession.findMany({
      where: {
        lastSeenAt: {
          gte: activeSessionThreshold,
        },
      },
      distinct: ["visitorHash"],
      select: {
        visitorHash: true,
      },
    }),

    prisma.dailyAnalytics.findMany({
      where: {
        date: {
          gte: chartStartDate,
          lt: todayDate,
        },
        eventType: {
          in: [
            AnalyticsEventType.PAGE_VIEW,
            AnalyticsEventType.PRODUCT_VIEW,
            AnalyticsEventType.WHATSAPP_CLICK,
          ],
        },
      },
      select: {
        date: true,
        eventType: true,
        eventCount: true,
      },
    }),

    prisma.analyticsEvent.findMany({
      where: {
        createdAt: {
          gte: todayStartAt,
          lt: todayEndAt,
        },
        eventType: {
          in: [
            AnalyticsEventType.PAGE_VIEW,
            AnalyticsEventType.PRODUCT_VIEW,
            AnalyticsEventType.WHATSAPP_CLICK,
          ],
        },
      },
      select: {
        eventType: true,
        createdAt: true,
      },
    }),

    prisma.analyticsEvent.groupBy({
      by: ["productId", "eventType"],
      where: {
        createdAt: {
          gte: sevenDayStartAt,
          lt: todayEndAt,
        },
        productId: {
          not: null,
        },
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

    prisma.product.aggregate({
      where: {
        isActive: true,
        OR: [
          {
            subscriptionEndsAt: null,
          },
          {
            subscriptionEndsAt: {
              gt: now,
            },
          },
        ],
      },
      _count: {
        _all: true,
      },
      _sum: {
        subscriptionFee: true,
      },
    }),

    prisma.productPayment.aggregate({
      where: {
        paidAt: {
          gte: monthStartAt,
          lt: nextMonthStartAt,
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.productPayment.aggregate({
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.product.count({
      where: {
        isActive: true,
        subscriptionEndsAt: {
          gt: now,
          lte: sevenDaysLater,
        },
      },
    }),

    prisma.product.count({
      where: {
        subscriptionEndsAt: {
          lte: now,
        },
      },
    }),

    prisma.product.groupBy({
      by: ["category"],
      where: {
        isActive: true,
        OR: [
          {
            subscriptionEndsAt: null,
          },
          {
            subscriptionEndsAt: {
              gt: now,
            },
          },
        ],
      },
      _count: {
        _all: true,
      },
      _sum: {
        subscriptionFee: true,
      },
    }),

    prisma.productPayment.findMany({
      orderBy: {
        paidAt: "desc",
      },
      take: 6,
      select: {
        id: true,
        productId: true,
        productName: true,
        category: true,
        amount: true,
        type: true,
        paidAt: true,
      },
    }),

    prisma.product.findMany({
      where: {
        OR: [
          {
            subscriptionEndsAt: {
              lte: now,
            },
          },
          {
            isActive: true,
            subscriptionEndsAt: {
              gt: now,
              lte: sevenDaysLater,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        category: true,
        subscriptionFee: true,
        subscriptionEndsAt: true,
        isActive: true,
      },
    }),
  ]);

  const expectedMonthlyRevenue = decimalToNumber(
    activeSubscriptionSummary._sum.subscriptionFee,
  );

  const thisMonthCollected = decimalToNumber(
    thisMonthPaymentSummary._sum.amount,
  );

  const totalCollected = decimalToNumber(totalPaymentSummary._sum.amount);

  const activeSubscriptionCount = activeSubscriptionSummary._count._all;

  const chartByDate = new Map<string, DayChartData>();

  for (let index = 0; index < chartRangeDays; index += 1) {
    const date = addDays(chartStartDate, index);
    const dateKey = getDateKey(date);

    chartByDate.set(dateKey, {
      date,
      dateKey,
      label: getDayLabel(date),
      pageViews: 0,
      productViews: 0,
      whatsappClicks: 0,
    });
  }

  for (const row of rangeDailySummaries) {
    const dateKey = getDateKey(row.date);
    const day = chartByDate.get(dateKey);

    if (!day) continue;

    if (row.eventType === AnalyticsEventType.PAGE_VIEW) {
      day.pageViews += row.eventCount;
    } else if (row.eventType === AnalyticsEventType.PRODUCT_VIEW) {
      day.productViews += row.eventCount;
    } else if (row.eventType === AnalyticsEventType.WHATSAPP_CLICK) {
      day.whatsappClicks += row.eventCount;
    }
  }

  for (const row of todayChartEvents) {
    const dateKey = getLocalDateKeyFromTimestamp(row.createdAt, timezoneOffsetMinutes);
    const day = chartByDate.get(dateKey);

    if (!day) continue;

    if (row.eventType === AnalyticsEventType.PAGE_VIEW) {
      day.pageViews += 1;
    } else if (row.eventType === AnalyticsEventType.PRODUCT_VIEW) {
      day.productViews += 1;
    } else if (row.eventType === AnalyticsEventType.WHATSAPP_CLICK) {
      day.whatsappClicks += 1;
    }
  }

  const chartData = Array.from(chartByDate.values());

  const chartMaximum = Math.max(
    1,
    ...chartData.flatMap((day) => [day.pageViews, day.productViews, day.whatsappClicks]),
  );

  const productAnalyticsMap = new Map<string, ProductAnalytics>();

  for (const row of sevenDayProductTotals) {
    if (!row.productId) {
      continue;
    }

    const existing = productAnalyticsMap.get(row.productId) ?? {
      productId: row.productId,
      productName: "Ürün",
      slug: null,
      views: 0,
      clicks: 0,
    };

    const eventCount = row._count._all;

    if (row.eventType === AnalyticsEventType.PRODUCT_VIEW) {
      existing.views += eventCount;
    }

    if (row.eventType === AnalyticsEventType.WHATSAPP_CLICK) {
      existing.clicks += eventCount;
    }

    productAnalyticsMap.set(row.productId, existing);
  }

  const productIds = Array.from(productAnalyticsMap.keys());

  const currentProducts =
    productIds.length > 0
      ? await prisma.product.findMany({
          where: {
            id: {
              in: productIds,
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        })
      : [];

  for (const product of currentProducts) {
    const analytics = productAnalyticsMap.get(product.id);

    if (!analytics) {
      continue;
    }

    analytics.productName = product.name;
    analytics.slug = product.slug;
  }

  const topProducts = Array.from(productAnalyticsMap.values())
    .sort((firstProduct, secondProduct) => {
      if (secondProduct.views !== firstProduct.views) {
        return secondProduct.views - firstProduct.views;
      }

      return secondProduct.clicks - firstProduct.clicks;
    })
    .slice(0, 20);

  const selectedRangePageViews = chartData.reduce(
    (total, day) => total + day.pageViews,
    0,
  );

  const selectedRangeProductViews = chartData.reduce(
    (total, day) => total + day.productViews,
    0,
  );

  const selectedRangeWhatsappClicks = chartData.reduce(
    (total, day) => total + day.whatsappClicks,
    0,
  );

  const todayConversionRate = formatPercentage(
    todayWhatsappClicks,
    todayProductViews,
  );

  const categoryRevenueMap = new Map<
    ProductCategory,
    {
      productCount: number;
      revenue: number;
    }
  >();

  for (const category of Object.values(ProductCategory)) {
    categoryRevenueMap.set(category, {
      productCount: 0,
      revenue: 0,
    });
  }

  for (const row of categoryRevenueRows) {
    categoryRevenueMap.set(row.category, {
      productCount: row._count._all,
      revenue: decimalToNumber(row._sum.subscriptionFee),
    });
  }

  const categoryRevenueData = Object.values(ProductCategory).map(
    (category) => ({
      category,
      ...categoryInformation[category],
      ...categoryRevenueMap.get(category)!,
    }),
  );

  const maximumCategoryRevenue = Math.max(
    1,
    ...categoryRevenueData.map((category) => category.revenue),
  );

  const subscriptionAlerts = subscriptionAlertProducts
    .flatMap((product) => {
      const subscriptionEndsAt = product.subscriptionEndsAt;

      if (!subscriptionEndsAt) {
        return [];
      }

      const remainingMilliseconds =
        subscriptionEndsAt.getTime() - now.getTime();

      const isExpired = remainingMilliseconds <= 0;

      const remainingDays = isExpired
        ? 0
        : Math.max(1, Math.ceil(remainingMilliseconds / DAY_IN_MS));

      const overdueDays = isExpired
        ? Math.max(0, Math.floor(Math.abs(remainingMilliseconds) / DAY_IN_MS))
        : 0;

      const statusLabel = isExpired
        ? overdueDays > 0
          ? `${overdueDays} gün önce doldu`
          : "Süresi doldu"
        : remainingDays === 1
          ? "1 gün kaldı"
          : `${remainingDays} gün kaldı`;

      const statusClassName = isExpired
        ? "border-red-200 bg-red-50 text-red-700"
        : remainingDays <= 3
          ? "border-orange-200 bg-orange-50 text-orange-700"
          : "border-amber-200 bg-amber-50 text-amber-700";

      return [
        {
          ...product,
          subscriptionEndsAt,
          isExpired,
          remainingDays,
          statusLabel,
          statusClassName,
        },
      ];
    })
    .sort((firstProduct, secondProduct) => {
      if (firstProduct.isExpired !== secondProduct.isExpired) {
        return firstProduct.isExpired ? -1 : 1;
      }

      const firstEndTime = firstProduct.subscriptionEndsAt.getTime();

      const secondEndTime = secondProduct.subscriptionEndsAt.getTime();

      if (firstProduct.isExpired) {
        return secondEndTime - firstEndTime;
      }

      return firstEndTime - secondEndTime;
    })
    .slice(0, 12);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">
            {settings?.companyName ?? "Firma Kataloğu"}
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-4xl">
            Merhaba, {user.name}
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500">
            Katalog performansını, abonelik gelirlerini ve yaklaşan yenilemeleri
            buradan takip edebilirsiniz.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-xs text-neutral-400">
            Son güncelleme {formatUpdateTime(now)}
          </p>

          <Link
            href="/panel/urunler/yeni"
            className="flex h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Yeni ürün
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-neutral-950">Finans özeti</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Tahsilat ve aktif aboneliklerin güncel parasal görünümü
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Bu ay tahsilat"
            value={formatCurrency(thisMonthCollected)}
            description={`${formatNumber(thisMonthPaymentSummary._count._all)} ödeme kaydı`}
            icon="₺"
            iconClassName="bg-emerald-50 text-emerald-700"
          />
          <MetricCard
            label="Aktif abonelik değeri"
            value={formatCurrency(expectedMonthlyRevenue)}
            description={`${formatNumber(activeSubscriptionCount)} aktif ilanın kayıtlı abonelik ücretleri toplamı`}
            icon="A"
            iconClassName="bg-blue-50 text-blue-700"
          />
          <MetricCard
            label="Tüm zamanlar tahsilat"
            value={formatCurrency(totalCollected)}
            description={`${formatNumber(totalPaymentSummary._count._all)} toplam ödeme`}
            icon="T"
            iconClassName="bg-violet-50 text-violet-700"
          />
        </div>
      </section>

      <details className="group rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
        <summary className="flex cursor-pointer list-none flex-col gap-4 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-neutral-950">Abonelik takibi</h2>
              {subscriptionAlerts.length > 0 ? (
                <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700">
                  {formatNumber(subscriptionAlerts.length)} işlem bekliyor
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Süresi dolan ve 7 gün içinde yenilenmesi gereken ürünler
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-neutral-500 group-open:hidden">Listeyi aç</span>
            <span className="hidden text-xs font-semibold text-neutral-500 group-open:inline">Listeyi kapat</span>
            <span className="flex size-9 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500 transition group-open:rotate-180">↓</span>
          </div>
        </summary>

        <div className="mt-5 flex justify-end">
          <Link href="/panel/urunler" className="text-sm font-semibold text-neutral-700 transition hover:text-neutral-950">
            Tüm ürünleri görüntüle →
          </Link>
        </div>

        {subscriptionAlerts.length > 0 ? (
          <div className="mt-6 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100">
            {subscriptionAlerts.map((product) => {
              const information = categoryInformation[product.category];

              return (
                <Link
                  key={product.id}
                  href={`/panel/urunler/${product.id}`}
                  className="group flex flex-col gap-4 px-4 py-4 transition hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${product.statusClassName}`}
                    >
                      {product.isExpired ? "!" : product.remainingDays}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-neutral-900">
                          {product.name}
                        </p>

                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${information.badgeClassName}`}
                        >
                          {information.label}
                        </span>

                        {!product.isActive ? (
                          <span className="rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neutral-500">
                            Pasif
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400">
                        <span
                          className={`font-semibold ${
                            product.isExpired
                              ? "text-red-600"
                              : product.remainingDays <= 3
                                ? "text-orange-600"
                                : "text-amber-600"
                          }`}
                        >
                          {product.statusLabel}
                        </span>

                        <span aria-hidden="true">·</span>

                        <span>
                          Bitiş: {formatDateTime(product.subscriptionEndsAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 pl-[52px] sm:pl-0">
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-neutral-900">
                        {formatCurrency(
                          decimalToNumber(product.subscriptionFee),
                        )}
                      </p>

                      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                        Aylık ücret
                      </p>
                    </div>

                    <span className="flex size-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-sm text-neutral-500 transition group-hover:border-neutral-950 group-hover:bg-neutral-950 group-hover:text-white">
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-green-200 bg-green-50 px-5 py-10 text-center">
            <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-white text-lg font-bold text-green-700 shadow-sm">
              ✓
            </span>

            <p className="mt-4 text-sm font-semibold text-green-900">
              Yaklaşan abonelik yenilemesi yok
            </p>

            <p className="mt-2 text-xs leading-5 text-green-700">
              Önümüzdeki 7 gün içinde süresi dolacak veya süresi geçmiş ürün
              bulunmuyor.
            </p>
          </div>
        )}
      </details>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-neutral-950">
            Bugünkü performans
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Ziyaretçi ve iletişim hareketleri
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Bugünkü ziyaretçi"
            value={formatNumber(todayUniqueVisitors.length)}
            description={`${formatNumber(todayPageViews)} sayfa görüntüleme`}
            icon="Z"
            iconClassName="bg-blue-50 text-blue-700"
          />

          <MetricCard
            label="Ürün görüntüleme"
            value={formatNumber(todayProductViews)}
            description="Bugünkü toplam inceleme"
            icon="Ü"
            iconClassName="bg-violet-50 text-violet-700"
          />

          <MetricCard
            label="WhatsApp tıklaması"
            value={formatNumber(todayWhatsappClicks)}
            description={`${todayConversionRate} dönüşüm oranı`}
            icon="W"
            iconClassName="bg-green-50 text-green-700"
          />

          <MetricCard
            label="Yakın zamanda aktif"
            value={formatNumber(activeVisitors.length)}
            description="Son 5 dakika içinde"
            icon="A"
            iconClassName="bg-orange-50 text-orange-700"
            live
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">Performans</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Sayfa, ürün ve WhatsApp hareketlerini dönemsel karşılaştır
              </p>
            </div>
            <div className="flex rounded-xl bg-neutral-100 p-1">
              <Link href="/panel?range=7" className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${chartRangeDays === 7 ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-900"}`}>
                7 gün
              </Link>
              <Link href="/panel?range=30" className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${chartRangeDays === 30 ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-900"}`}>
                30 gün
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-neutral-900" />Sayfa görüntüleme</span>
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-violet-500" />Ürün görüntüleme</span>
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#1fa855]" />WhatsApp</span>
          </div>

          <div className="mt-7 overflow-x-auto pb-2">
            <div className="grid min-w-[720px] gap-2" style={{ gridTemplateColumns: `repeat(${chartRangeDays}, minmax(${chartRangeDays === 30 ? "22px" : "72px"}, 1fr))` }}>
              {chartData.map((day) => (
                <div key={day.dateKey} className="flex min-w-0 flex-col">
                  <div className="mb-2 text-center">
                    <p className="text-[10px] font-semibold text-neutral-700">{formatNumber(day.pageViews)}</p>
                    {chartRangeDays === 7 ? <p className="text-[9px] text-neutral-400">{day.productViews} Ü · {day.whatsappClicks} W</p> : null}
                  </div>
                  <div className="flex h-52 items-end justify-center gap-1 rounded-xl bg-neutral-50 px-1.5 pt-4">
                    <div title={`${day.pageViews} sayfa görüntüleme`} className="w-2.5 rounded-t bg-neutral-900" style={{ height: `${getBarHeight(day.pageViews, chartMaximum)}%` }} />
                    <div title={`${day.productViews} ürün görüntüleme`} className="w-2.5 rounded-t bg-violet-500" style={{ height: `${getBarHeight(day.productViews, chartMaximum)}%` }} />
                    <div title={`${day.whatsappClicks} WhatsApp tıklaması`} className="w-2.5 rounded-t bg-[#1fa855]" style={{ height: `${getBarHeight(day.whatsappClicks, chartMaximum)}%` }} />
                  </div>
                  <p className="mt-2 truncate text-center text-[9px] font-medium capitalize text-neutral-500">
                    {chartRangeDays === 30 ? day.dateKey.slice(8, 10) : day.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 border-t border-neutral-100 pt-5 sm:grid-cols-3">
            <SummaryValue label={`${chartRangeDays} günlük sayfa görüntüleme`} value={formatNumber(selectedRangePageViews)} />
            <SummaryValue label={`${chartRangeDays} günlük ürün görüntüleme`} value={formatNumber(selectedRangeProductViews)} />
            <SummaryValue label={`${chartRangeDays} günlük WhatsApp`} value={formatNumber(selectedRangeWhatsappClicks)} />
          </div>

          {chartRangeDays === 30 ? (
            <p className="mt-4 text-xs leading-5 text-neutral-400">
              30 günlük görünüm günlük özet kayıtlarını kullanır. Eski özetler daha önce silindiyse grafik kademeli olarak dolacaktır.
            </p>
          ) : null}
        </div>

        <div className="rounded-[28px] bg-neutral-950 p-6 text-white shadow-sm sm:p-7">
          <p className="text-sm font-medium text-white/60">Ürün ve abonelik durumu</p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.04em]">{formatNumber(activeSubscriptionCount)}</p>
          <p className="mt-1 text-sm text-white/60">aktif abonelik</p>
          <div className="mt-8 space-y-4">
            <StatusRow label="Toplam ürün" value={formatNumber(totalProducts)} />
            <StatusRow label="Yayınlanan ürün" value={formatNumber(activeProducts)} />
            <StatusRow label="Pasif ürün" value={formatNumber(totalProducts - activeProducts)} />
            <StatusRow label="7 gün içinde bitecek" value={formatNumber(expiringSoonCount)} valueClassName="text-orange-300" />
            <StatusRow label="Süresi dolmuş" value={formatNumber(expiredSubscriptionCount)} valueClassName="text-red-300" last />
          </div>
          <Link href="/panel/urunler" className="mt-8 flex h-12 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100">
            Ürünleri yönet
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">
              Kategori gelirleri
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Aktif aboneliklerin aylık gelir dağılımı
            </p>
          </div>

          <div className="mt-6 space-y-5">
            {categoryRevenueData.map((category) => {
              const width =
                category.revenue <= 0
                  ? 0
                  : Math.max(
                      4,
                      Math.round(
                        (category.revenue / maximumCategoryRevenue) * 100,
                      ),
                    );

              return (
                <div key={category.category}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${category.badgeClassName}`}
                      >
                        {category.label}
                      </span>

                      <span className="text-xs text-neutral-400">
                        {category.productCount} ürün
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-neutral-900">
                      {formatCurrency(category.revenue)}
                    </p>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={`h-full rounded-full ${category.barClassName}`}
                      style={{
                        width: `${width}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl bg-neutral-50 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-neutral-500">
                Toplam beklenen aylık gelir
              </p>

              <p className="text-lg font-semibold text-neutral-950">
                {formatCurrency(expectedMonthlyRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">
                Son ödemeler
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                En son kaydedilen abonelik tahsilatları
              </p>
            </div>

            <span className="text-xs text-neutral-400">Son 6 kayıt</span>
          </div>

          {recentPayments.length > 0 ? (
            <div className="mt-6 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100">
              {recentPayments.map((payment) => {
                const information = categoryInformation[payment.category];

                const content = (
                  <>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-neutral-900">
                          {payment.productName}
                        </p>

                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${information.badgeClassName}`}
                        >
                          {information.label}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-neutral-400">
                        {paymentTypeLabels[payment.type]} ·{" "}
                        {formatDateTime(payment.paidAt)}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-semibold text-green-700">
                      +{formatCurrency(decimalToNumber(payment.amount))}
                    </p>
                  </>
                );

                if (payment.productId) {
                  return (
                    <Link
                      key={payment.id}
                      href={`/panel/urunler/${payment.productId}`}
                      className="flex items-center justify-between gap-4 px-4 py-4 transition hover:bg-neutral-50"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-4 px-4 py-4"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-5 py-12 text-center">
              <p className="text-sm font-medium text-neutral-700">
                Henüz ödeme kaydı yok
              </p>

              <p className="mt-2 text-xs text-neutral-500">
                Yeni ürün veya abonelik yenilemesi kaydedildiğinde burada
                görünecek.
              </p>
            </div>
          )}
        </div>
      </section>

      <TopProductsTable
        products={topProducts.map((product) => ({
          ...product,
          conversion: product.views > 0 ? (product.clicks / product.views) * 100 : 0,
        }))}
      />
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
  icon: string;
  iconClassName: string;
  live?: boolean;
};

function MetricCard({
  label,
  value,
  description,
  icon,
  iconClassName,
  live = false,
}: MetricCardProps) {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-neutral-500">{label}</p>

            {live ? (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-60" />

                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
            ) : null}
          </div>

          <p className="mt-3 break-words text-2xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-3xl">
            {value}
          </p>

          <p className="mt-2 text-xs text-neutral-400">{description}</p>
        </div>

        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${iconClassName}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

type SummaryValueProps = {
  label: string;
  value: string;
};

function SummaryValue({ label, value }: SummaryValueProps) {
  return (
    <div className="rounded-2xl bg-neutral-50 px-4 py-4">
      <p className="text-xs text-neutral-500">{label}</p>

      <p className="mt-2 text-xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

type StatusRowProps = {
  label: string;
  value: string;
  valueClassName?: string;
  last?: boolean;
};

function StatusRow({
  label,
  value,
  valueClassName = "text-white",
  last = false,
}: StatusRowProps) {
  return (
    <div
      className={`flex items-center justify-between ${
        last ? "" : "border-b border-white/10 pb-4"
      }`}
    >
      <span className="text-sm text-white/60">{label}</span>

      <span className={`text-sm font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}
