import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SeoRegionLinks } from "@/components/SeoRegionLinks";
import { PRODUCT_CATEGORY_CONFIG } from "@/lib/product-categories";
import { productBelongsToRegion } from "@/lib/product-regions";
import prisma from "@/lib/prisma";
import {
  absoluteUrl,
  seoRegions,
  serializeJsonLd,
  siteConfig,
} from "@/lib/site-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: siteConfig.homeTitle,
  },
  description: siteConfig.description,
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.homeTitle,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.homeTitle,
    description: siteConfig.description,
  },
  other: {
    rating: "adult",
  },
};

function normalizeWhatsappNumber(value: string): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = `90${digits.slice(1)}`;
  }

  if (digits.length === 10 && digits.startsWith("5")) {
    digits = `90${digits}`;
  }

  return digits;
}

function isProductVisible(
  product: {
    isActive: boolean;
    subscriptionEndsAt: Date | null;
  },
  now: Date,
): boolean {
  if (!product.isActive) {
    return false;
  }

  if (!product.subscriptionEndsAt) {
    return true;
  }

  return product.subscriptionEndsAt.getTime() > now.getTime();
}

/*
 * İstatistikler gerçek veriye bağlı değilse bile
 * kendi içinde tutarlı görünmelidir.
 *
 * - Son 24 saat: aktif ilanların düşük ve gerçekçi günlük tahmini toplamından üretilir.
 * - Son 7 gün: haftalık seed ile haftada bir değişir.
 * - Aktif ziyaretçi: 15 dakikalık periyotlarla değişir.
 */
function createIstanbulDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function createIstanbulWeekKey(date: Date): string {
  const dateKey = createIstanbulDateKey(date);
  const localDate = new Date(`${dateKey}T00:00:00.000Z`);

  const dayOfWeek = localDate.getUTCDay() || 7;

  localDate.setUTCDate(localDate.getUTCDate() - dayOfWeek + 1);

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(localDate);
}

function createIstanbulIntervalKey(
  date: Date,
  intervalMinutes: number,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  }).formatToParts(date);

  const valueByType = new Map(parts.map((part) => [part.type, part.value]));

  const year = valueByType.get("year") ?? "0000";
  const month = valueByType.get("month") ?? "00";
  const day = valueByType.get("day") ?? "00";
  const hour = valueByType.get("hour") ?? "00";
  const minute = Number(valueByType.get("minute") ?? "0");

  const interval = Math.floor(minute / intervalMinutes);

  return `${year}-${month}-${day}-${hour}-${interval}`;
}

function createSeedFromText(value: string): number {
  return Array.from(value).reduce((seed, character) => {
    seed ^= character.charCodeAt(0);

    return Math.imul(seed, 16777619) >>> 0;
  }, 2166136261);
}

function createDailySeed(date: Date): number {
  return createSeedFromText(createIstanbulDateKey(date));
}

function createWeeklySeed(date: Date): number {
  return createSeedFromText(createIstanbulWeekKey(date));
}

function createIntervalSeed(date: Date, intervalMinutes: number): number {
  return createSeedFromText(createIstanbulIntervalKey(date, intervalMinutes));
}

function createSeededNumber(
  seed: number,
  salt: number,
  minimum: number,
  maximum: number,
): number {
  let value = (seed ^ (salt * 2654435761)) >>> 0;

  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;

  const normalizedValue = (value >>> 0) / 4294967295;

  return Math.floor(minimum + normalizedValue * (maximum - minimum + 1));
}

function getListingDailyViewRange(
  categoryValue: string,
  sortOrder: number,
): {
  minimum: number;
  maximum: number;
} {
  const position = Math.max(1, sortOrder);

  if (categoryValue === "VIP") {
    const maximum = Math.max(320, 900 - (position - 1) * 18);

    const minimum = Math.max(220, maximum - 260);

    return {
      minimum,
      maximum,
    };
  }

  if (categoryValue === "PREMIUM") {
    const maximum = Math.max(180, 560 - (position - 1) * 12);

    const minimum = Math.max(130, maximum - 180);

    return {
      minimum,
      maximum,
    };
  }

  const maximum = Math.max(90, 260 - (position - 1) * 7);

  const minimum = Math.max(60, maximum - 90);

  return {
    minimum,
    maximum,
  };
}

function createListingDailyViewCount(
  date: Date,
  product: {
    id: string;
    category: string;
    sortOrder: number;
  },
): number {
  const seed = createSeedFromText(
    `${createIstanbulDateKey(date)}:${product.id}:${product.category}:${product.sortOrder}`,
  );

  const range = getListingDailyViewRange(product.category, product.sortOrder);

  return createSeededNumber(seed, 1, range.minimum, range.maximum);
}

function createListingWeeklyViewCount(
  date: Date,
  product: {
    id: string;
    category: string;
    sortOrder: number;
  },
): number {
  const seed = createSeedFromText(
    `${createIstanbulWeekKey(date)}:${product.id}:${product.category}:${product.sortOrder}:week`,
  );

  const range = getListingDailyViewRange(product.category, product.sortOrder);

  return createSeededNumber(
    seed,
    2,
    Math.round(range.minimum * 3.8),
    Math.round(range.maximum * 6.2),
  );
}

function getCategoryNeonTheme(categoryValue: string) {
  switch (categoryValue) {
    case "VIP":
      return {
        accent: "#67e8f9",
        secondary: "#06b6d4",
        tertiary: "#8b5cf6",
        titleColor: "#ecfeff",
        titleBackground:
          "linear-gradient(90deg, #00141a 0%, #073344 48%, #00141a 100%)",
        frameBackground:
          "linear-gradient(135deg, #083344 0%, #06b6d4 28%, #67e8f9 48%, #8b5cf6 61%, #164e63 79%, #001419 100%)",
        glow:
          "0 0 0 1px rgba(103,232,249,0.30), 0 10px 24px rgba(8,51,68,0.16)",
        hoverGlow:
          "0 0 0 1px rgba(255,255,255,0.38), 0 14px 30px rgba(8,145,178,0.22)",
        divider: "rgba(103,232,249,0.66)",
        icon: "👑",
        cornerLabel: "VIP",
        cornerIcon: "♛",
        cornerBackground:
          "linear-gradient(135deg, rgba(0,20,26,0.96), rgba(8,145,178,0.94) 58%, rgba(124,58,237,0.9))",
        cardOverlay:
          "linear-gradient(145deg, rgba(103,232,249,0.16), transparent 38%, rgba(139,92,246,0.12) 76%, transparent)",
      };

    case "PREMIUM":
      return {
        accent: "#f0abfc",
        secondary: "#d946ef",
        tertiary: "#f59e0b",
        titleColor: "#fff4ff",
        titleBackground:
          "linear-gradient(90deg, #120014 0%, #3b0a46 48%, #120014 100%)",
        frameBackground:
          "linear-gradient(135deg, #4a044e 0%, #d946ef 28%, #f0abfc 47%, #f59e0b 58%, #7e22ce 76%, #25002b 100%)",
        glow:
          "0 0 0 1px rgba(240,171,252,0.34), 0 10px 24px rgba(88,28,135,0.18)",
        hoverGlow:
          "0 0 0 1px rgba(255,255,255,0.42), 0 14px 30px rgba(126,34,206,0.24)",
        divider: "rgba(240,171,252,0.72)",
        icon: "💎",
        cornerLabel: "PREMIUM",
        cornerIcon: "◆",
        cornerBackground:
          "linear-gradient(135deg, rgba(15,0,18,0.96), rgba(126,34,206,0.94) 56%, rgba(245,158,11,0.92))",
        cardOverlay:
          "linear-gradient(145deg, rgba(240,171,252,0.18), transparent 34%, rgba(245,158,11,0.12) 72%, transparent)",
      };

    default:
      return {
        accent: "#fde68a",
        secondary: "#f59e0b",
        tertiary: "#b45309",
        titleColor: "#fff8d6",
        titleBackground:
          "linear-gradient(90deg, #171000 0%, #4a3100 48%, #171000 100%)",
        frameBackground:
          "linear-gradient(135deg, #3f2a00 0%, #d97706 27%, #fde68a 49%, #f59e0b 60%, #92400e 78%, #211200 100%)",
        glow:
          "0 0 0 1px rgba(253,230,138,0.30), 0 10px 24px rgba(120,53,15,0.16)",
        hoverGlow:
          "0 0 0 1px rgba(255,255,255,0.36), 0 14px 30px rgba(180,83,9,0.22)",
        divider: "rgba(253,230,138,0.66)",
        icon: "⚜️",
        cornerLabel: "GOLD",
        cornerIcon: "✦",
        cornerBackground:
          "linear-gradient(135deg, rgba(28,18,0,0.97), rgba(180,83,9,0.94) 58%, rgba(245,158,11,0.92))",
        cardOverlay:
          "linear-gradient(145deg, rgba(253,230,138,0.15), transparent 38%, rgba(180,83,9,0.11) 76%, transparent)",
      };
  }
}

function getAdvertisementTheme() {
  return {
    frame: "linear-gradient(115deg, #ff00c8, #8b5cf6, #00d9ff)",
    icon: "linear-gradient(135deg, #ff00c8, #7c3aed)",
    badge: "linear-gradient(90deg, #ff00c8, #8b5cf6)",
    arrow: "linear-gradient(135deg, #22d3ee, #34d399)",
    glow: "0 0 22px rgba(217,70,239,0.28)",
  };
}

export default async function HomePage() {
  const now = new Date();

  const [settings, allProducts, categorySlotSettings] = await Promise.all([
    prisma.siteSettings.findUnique({
      where: {
        id: "default",
      },
    }),

    /*
     * Tüm ürünleri çekiyoruz.
     *
     * Süresi dolmuş veya pasif ürünleri tamamen
     * sorgudan çıkarırsak, o ürünün sıra numarası
     * da kaybolur.
     *
     * Burada tüm kayıtları alıp görünürlük
     * kontrolünü aşağıda yapıyoruz. Böylece
     * kapanan ürünün yeri reklam alanına dönüşür.
     */
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
        images: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            imageUrl: true,
          },
          take: 2,
        },
      },
    }),

    prisma.categoryDisplaySetting.findMany({
      select: {
        category: true,
        slotCount: true,
      },
    }),
  ]);

  const companyName = siteConfig.name;

  const advertisementWhatsappNumber = normalizeWhatsappNumber(
    settings?.whatsappNumber ?? "",
  );

  /*
   * Panelde belirlenen kategori kapasitesini
   * kategori adına göre hızlıca okuyabilmek için
   * bir harita oluşturuyoruz.
   */
  const slotCountByCategory = new Map<string, number>(
    categorySlotSettings.map((setting) => [
      setting.category,
      setting.slotCount,
    ]),
  );

  /*
   * Gerçekten katalogda gösterilebilecek ürünler:
   *
   * - Manuel olarak aktif olmalı
   * - Bitiş tarihi yoksa süresizdir
   * - Bitiş tarihi varsa henüz dolmamış olmalı
   */
  const visibleProducts = allProducts.filter((product) =>
    isProductVisible(product, now),
  );

  const activeRegionSlugs = seoRegions
    .filter((region) =>
      visibleProducts.some((product) =>
        productBelongsToRegion(
          product,
          region,
        ),
      ),
    )
    .map((region) => region.slug);

  const groupedCategories = PRODUCT_CATEGORY_CONFIG.map((category) => {
    /*
     * Kategorideki tüm kayıtlar.
     *
     * En yüksek sıra numarasını hesaplarken
     * süresi dolmuş ve pasif ürünleri de dahil
     * ediyoruz. Böylece onların sırası reklam
     * alanı olarak korunur.
     */
    const allCategoryProducts = allProducts
      .filter((product) => product.category === category.value)
      .sort(
        (firstProduct, secondProduct) =>
          firstProduct.sortOrder - secondProduct.sortOrder,
      );

    /*
     * Katalogda gösterilebilecek kategori
     * ürünleri.
     */
    const visibleCategoryProducts = allCategoryProducts.filter((product) =>
      isProductVisible(product, now),
    );

    /*
     * Panelde belirlenen kart alanı sayısını
     * okuyoruz. Güvenlik için kayıtlı en yüksek
     * ürün sırasından daha küçük bir değer
     * kullanmıyoruz.
     *
     * Örnek:
     * VIP kapasitesi 50 ve en yüksek ürün sırası
     * 4 ise toplam 50 alan oluşturulur.
     */
    const highestProductPosition = allCategoryProducts.reduce(
      (maximum, product) => Math.max(maximum, product.sortOrder),
      0,
    );

    const configuredSlotCount = slotCountByCategory.get(category.value) ?? 0;

    const totalSlotCount = Math.max(
      configuredSlotCount,
      highestProductPosition,
    );

    const visibleProductByPosition = new Map(
      visibleCategoryProducts.map((product) => [product.sortOrder, product]),
    );

    const items = Array.from(
      {
        length: totalSlotCount,
      },
      (_, index) => {
        const sortOrder = index + 1;

        const product = visibleProductByPosition.get(sortOrder);

        if (product) {
          return {
            type: "product" as const,
            sortOrder,
            product,
          };
        }

        return {
          type: "advertisement" as const,
          sortOrder,
        };
      },
    );

    return {
      ...category,
      products: visibleCategoryProducts,
      items,
      advertisementCount: items.filter((item) => item.type === "advertisement")
        .length,
    };
  }).filter((category) => category.items.length > 0);

  const productIndexById = new Map(
    visibleProducts.map((product, index) => [product.id, index]),
  );



  const dailySeed = createDailySeed(now);
  const weeklySeed = createWeeklySeed(now);

  /*
   * Aktif ziyaretçi 15 dakikada bir değişir.
   * 30 dakikada bir değişmesini istersen
   * buradaki 15 değerini 30 yap.
   */
  const activeSeed = createIntervalSeed(now, 15);

  const listingViewsLast24 = visibleProducts.reduce(
    (total, product) => total + createListingDailyViewCount(now, product),
    0,
  );

  const listingViewsLast7Days = visibleProducts.reduce(
    (total, product) => total + createListingWeeklyViewCount(now, product),
    0,
  );

  const last24ExtraViews =
    listingViewsLast24 > 0
      ? createSeededNumber(
          dailySeed,
          4,
          Math.max(80, Math.round(listingViewsLast24 * 0.04)),
          Math.max(180, Math.round(listingViewsLast24 * 0.09)),
        )
      : 0;

  const last7ExtraViews =
    listingViewsLast7Days > 0
      ? createSeededNumber(
          weeklySeed,
          5,
          Math.max(350, Math.round(listingViewsLast7Days * 0.035)),
          Math.max(900, Math.round(listingViewsLast7Days * 0.08)),
        )
      : 0;

  const last24HoursViews =
    listingViewsLast24 > 0
      ? listingViewsLast24 + last24ExtraViews
      : createSeededNumber(dailySeed, 1, 450, 1200);

  const last7DaysViews =
    listingViewsLast7Days > 0
      ? listingViewsLast7Days + last7ExtraViews
      : createSeededNumber(weeklySeed, 2, 2500, 9500);

  const activeVisitorCount = createSeededNumber(
    activeSeed,
    3,
    Math.max(6, Math.round(last24HoursViews / 1800)),
    Math.max(18, Math.round(last24HoursViews / 650)),
  );

  const itemListId = `${siteConfig.url}/#listing-catalog`;

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": itemListId,
    name: siteConfig.homeHeading,
    numberOfItems: Math.min(visibleProducts.length, 50),
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: visibleProducts.slice(0, 50).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: absoluteUrl(`/urun/${product.slug}`),
    })),
  };

  const collectionPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteConfig.url}/#webpage`,
    url: siteConfig.url,
    name: siteConfig.homeTitle,
    description: siteConfig.description,
    inLanguage: "tr-TR",
    isPartOf: {
      "@id": `${siteConfig.url}/#website`,
    },
    mainEntity: {
      "@id": itemListId,
    },
  };

  const announcementText =
    "✦ Güncel ilanlar sürekli yenilenmektedir • Reklam ve yayın bilgisi için WhatsApp üzerinden iletişime geçebilirsiniz •";

  return (
    <div className="min-h-screen bg-[#f4f4f0]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(collectionPageJsonLd),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(itemListJsonLd),
        }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes site-gold-shimmer {
              0%, 100% {
                background-position: 0% 50%;
                opacity: 0.76;
                filter: brightness(0.9);
                text-shadow:
                  0 0 7px rgba(255, 211, 106, 0.62),
                  0 0 16px rgba(245, 158, 11, 0.48);
                transform: scale(1);
              }
              18% {
                opacity: 1;
                filter: brightness(1.34);
                text-shadow:
                  0 0 11px rgba(255, 248, 214, 0.98),
                  0 0 26px rgba(245, 158, 11, 0.94),
                  0 0 46px rgba(180, 83, 9, 0.68);
              }
              36% {
                opacity: 0.82;
                filter: brightness(1);
              }
              58% {
                background-position: 100% 50%;
                opacity: 1;
                filter: brightness(1.48);
                text-shadow:
                  0 0 12px rgba(255, 251, 225, 1),
                  0 0 30px rgba(245, 158, 11, 1),
                  0 0 54px rgba(180, 83, 9, 0.82);
                transform: scale(1.018);
              }
              76% {
                opacity: 0.86;
                filter: brightness(1.05);
              }
            }

            @keyframes announcement-marquee {
              0% {
                transform: translate3d(0, 0, 0);
              }
              100% {
                transform: translate3d(-50%, 0, 0);
              }
            }

            .site-gold-title {
              display: inline-block;
              background-size: 240% auto;
              animation: site-gold-shimmer 2.35s ease-in-out infinite !important;
              transform-origin: center;
              will-change: background-position, opacity, filter, transform;
            }

            .announcement-track {
              display: flex;
              width: max-content;
              min-width: 200%;
              transform: translate3d(0, 0, 0);
              animation: announcement-marquee 22s linear infinite !important;
              will-change: transform;
            }

            .announcement-group {
              display: flex;
              min-width: 100vw;
              flex: 0 0 auto;
              align-items: center;
              justify-content: space-around;
              gap: 2rem;
              padding-right: 2rem;
            }

            .announcement-item {
              flex: 0 0 auto;
              white-space: nowrap;
            }
            .product-card-sheen {
              pointer-events: none;
              position: absolute;
              inset: 0;
              z-index: 20;
              opacity: 0;
              background: linear-gradient(
                115deg,
                transparent 0%,
                rgba(255,255,255,0.05) 42%,
                rgba(255,255,255,0.16) 50%,
                transparent 58%
              );
              transition: opacity 160ms ease;
            }

            @media (hover: hover) and (pointer: fine) {
              .group:hover .product-card-sheen {
                opacity: 1;
              }
            }

          `,
        }}
      />

      <header className="relative border-b border-fuchsia-400/40 bg-black shadow-[0_0_26px_rgba(217,70,239,0.28)]">
        <div
          data-nosnippet
          className="overflow-hidden border-b border-amber-300/25 bg-[linear-gradient(90deg,#160d00_0%,#4a2800_50%,#160d00_100%)]"
        >
          <div className="announcement-track py-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-amber-100 sm:py-2 sm:text-xs">
            {[0, 1].map((groupIndex) => (
              <div
                key={`announcement-group-${groupIndex}`}
                aria-hidden={groupIndex === 1 ? "true" : undefined}
                className="announcement-group"
              >
                {[0, 1, 2].map((itemIndex) => (
                  <span
                    key={`announcement-${groupIndex}-${itemIndex}`}
                    className="announcement-item"
                  >
                    {announcementText}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-2.5 py-2.5 sm:min-h-20 sm:flex-row sm:justify-between sm:gap-5 sm:px-4 sm:py-3">
          <Link
            href="/"
            aria-label={`${companyName} ana sayfa`}
            className="site-gold-title whitespace-nowrap bg-[linear-gradient(90deg,#fff8d6_0%,#ffd36a_18%,#f59e0b_40%,#fff3b0_58%,#b45309_78%,#ffd36a_100%)] bg-clip-text px-2 text-center text-[clamp(1.62rem,5.4vw,3.2rem)] font-black tracking-[0.11em] text-transparent sm:px-0 sm:text-left"
          >
            {companyName}
          </Link>

          <section
            data-nosnippet
            aria-label="Site istatistikleri"
            className="grid w-full max-w-[560px] grid-cols-3 gap-1.5 sm:w-auto sm:min-w-[420px] sm:gap-2"
          >
            <div className="min-w-0 rounded-lg border border-fuchsia-400/35 bg-white/[0.06] px-1.5 py-1.5 text-center backdrop-blur sm:px-2.5 sm:py-2">
              <p className="truncate text-[7px] font-bold uppercase tracking-[0.08em] text-fuchsia-200/70 sm:text-[8px]">
                Son 24 saat
              </p>
              <p className="mt-0.5 text-sm font-black leading-none tracking-[-0.03em] text-white sm:text-base">
                {new Intl.NumberFormat("tr-TR").format(last24HoursViews)}
              </p>
            </div>

            <div className="min-w-0 rounded-lg border border-cyan-400/35 bg-white/[0.06] px-1.5 py-1.5 text-center backdrop-blur sm:px-2.5 sm:py-2">
              <p className="truncate text-[7px] font-bold uppercase tracking-[0.08em] text-cyan-200/70 sm:text-[8px]">
                Son 7 gün
              </p>
              <p className="mt-0.5 text-sm font-black leading-none tracking-[-0.03em] text-white sm:text-base">
                {new Intl.NumberFormat("tr-TR").format(last7DaysViews)}
              </p>
            </div>

            <div className="min-w-0 rounded-lg border border-emerald-400/35 bg-white/[0.06] px-1.5 py-1.5 text-center backdrop-blur sm:px-2.5 sm:py-2">
              <p className="flex items-center justify-center gap-1 truncate text-[7px] font-bold uppercase tracking-[0.08em] text-emerald-200/70 sm:text-[8px]">
                <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                Aktif
              </p>
              <p className="mt-0.5 text-sm font-black leading-none tracking-[-0.03em] text-white sm:text-base">
                {new Intl.NumberFormat("tr-TR").format(activeVisitorCount)}
              </p>
            </div>
          </section>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-2.5 pb-12 pt-4 sm:px-4 sm:pt-6 xl:max-w-[1500px]">
        <section
  aria-labelledby="home-page-title"
  className="mb-4 rounded-[16px] border border-black/[0.07] bg-white/90 px-3 py-3 shadow-sm sm:mb-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-4 sm:py-3.5"
>
  <div className="min-w-0 text-center sm:max-w-[520px] sm:text-left">
    <h1
      id="home-page-title"
      className="text-lg font-black tracking-[-0.035em] text-neutral-950 sm:text-xl"
    >
      {siteConfig.homeHeading}
    </h1>

    <p className="mt-1 text-[11px] leading-5 text-neutral-500 sm:text-xs">
      {siteConfig.homeIntro}
    </p>
  </div>

  <SeoRegionLinks regionSlugs={activeRegionSlugs} />
</section>

        {groupedCategories.length > 0 ? (
          <div className="space-y-7 sm:space-y-9">
            {groupedCategories.map((category) => (
              <section
                key={category.value}
                id={category.key}
                className="scroll-mt-24"
              >
                <div
                  className="mb-3 flex items-center gap-3 overflow-hidden rounded-[18px] border px-3 py-2.5 sm:px-5 sm:py-3.5"
                  style={{
                    borderColor: getCategoryNeonTheme(category.value).divider,
                    background: `linear-gradient(90deg, ${
                      getCategoryNeonTheme(category.value).accent
                    }22 0%, rgba(255,255,255,0.96) 48%, rgba(255,255,255,0.72) 100%)`,
                    boxShadow: `0 0 18px ${
                      getCategoryNeonTheme(category.value).accent
                    }30`,
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-9 w-1.5 shrink-0 rounded-full sm:h-11"
                      style={{
                        background: getCategoryNeonTheme(category.value).accent,
                        boxShadow: `0 0 14px ${
                          getCategoryNeonTheme(category.value).accent
                        }`,
                      }}
                    />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2
                          className="animate-pulse text-xl font-black tracking-[-0.04em] sm:text-3xl"
                          style={{
                            color: getCategoryNeonTheme(category.value).accent,
                            textShadow: `0 0 8px ${
                              getCategoryNeonTheme(category.value).accent
                            }, 0 0 18px ${
                              getCategoryNeonTheme(category.value).accent
                            }88`,
                          }}
                        >
                          <span className="mr-2 align-middle drop-shadow-[0_0_10px_rgba(255,255,255,0.55)]">
                            {getCategoryNeonTheme(category.value).icon}
                          </span>
                          {category.label}
                        </h2>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 xl:gap-3">
                  {category.items.map((item) => {
                    const neonTheme = getCategoryNeonTheme(category.value);

                    if (item.type === "advertisement") {
                      const advertisementTheme = getAdvertisementTheme();

                      const advertisementMessage = encodeURIComponent(
                        `Merhaba, ${companyName} sitesindeki ${category.label} kategorisinin ${item.sortOrder}. reklam alanı için yazıyorum. Yayın süresi, ücret ve detaylı bilgi alabilir miyim?`,
                      );

                      const advertisementHref = advertisementWhatsappNumber
                        ? `https://wa.me/${advertisementWhatsappNumber}?text=${advertisementMessage}`
                        : `https://wa.me/?text=${advertisementMessage}`;

                      return (
                        <a
                          data-nosnippet
                          key={`advertisement-${category.value}-${item.sortOrder}`}
                          href={advertisementHref}
                          target="_blank"
                          rel="nofollow sponsored noopener noreferrer"
                          className="group block h-full rounded-[20px] p-[2px] transition duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
                          style={{
                            background: advertisementTheme.frame,
                            boxShadow: advertisementTheme.glow,
                          }}
                        >
                          <div className="flex h-full min-h-[124px] overflow-hidden rounded-[16px] bg-[linear-gradient(135deg,#ffffff_0%,#fff7ff_48%,#effcff_100%)] sm:min-h-[140px] lg:min-h-[150px]">
                            <div
                              className="relative flex w-[88px] shrink-0 items-center justify-center overflow-hidden sm:w-[104px] lg:w-[112px]"
                              style={{
                                background: advertisementTheme.icon,
                              }}
                            >
                              <div className="flex size-13 items-center justify-center rounded-2xl border border-white/60 bg-black/15 text-white shadow-lg backdrop-blur-[2px] transition group-hover:scale-105">
                                <svg
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                  className="size-7 fill-current"
                                >
                                  <path d="M12.04 2a9.84 9.84 0 0 0-8.43 14.92L2 22l5.22-1.58A9.96 9.96 0 1 0 12.04 2Zm0 17.9a8.05 8.05 0 0 1-4.1-1.12l-.3-.18-3.1.94.96-3.02-.2-.31a7.84 7.84 0 1 1 6.74 3.69Zm4.31-5.87c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.62.77-.76.93-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.18-.7-.63-1.18-1.4-1.32-1.64-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.4-.58 1.6-1.13.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.46-.28Z" />
                                </svg>
                              </div>

                              <span className="absolute left-2 top-2 rounded-full border border-white/40 bg-black/25 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur">
                                Sıra {item.sortOrder}
                              </span>
                            </div>

                            <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2.5 sm:px-3 lg:px-4">
                              <div className="min-w-0 flex-1">
                                <span
                                  className="inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-white"
                                  style={{
                                    background: advertisementTheme.badge,
                                    boxShadow: "0 0 14px rgba(217,70,239,0.32)",
                                  }}
                                >
                                  Reklam alanı
                                </span>

                                <h3 className="mt-1 text-[13px] font-black tracking-[-0.01em] text-neutral-950 sm:text-sm lg:text-[15px]">
                                  Bu alana reklam verebilirsiniz
                                </h3>

                                <p className="mt-0.5 line-clamp-1 text-[11px] leading-[16px] text-neutral-600 sm:line-clamp-2 sm:text-xs">
                                  Tanıtım ve reklam bilgisi için WhatsApp
                                  üzerinden ulaşın.
                                </p>
                              </div>

                              <span
                                className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-neutral-950 shadow-lg transition group-hover:translate-x-0.5 sm:size-8 sm:text-sm"
                                style={{
                                  background: advertisementTheme.arrow,
                                }}
                              >
                                →
                              </span>
                            </div>
                          </div>
                        </a>
                      );
                    }

                    const product = item.product;

                    const productIndex =
                      productIndexById.get(product.id) ?? 999;

                    /*
                     * Kapak ve ek görsellerden
                     * benzersiz bir liste
                     * oluşturuyoruz.
                     */
                    const uniqueProductImageUrls = [
                      product.coverImage,
                      ...product.images.map((image) => image.imageUrl),
                    ].filter(
                      (imageUrl, imageIndex, imageUrls) =>
                        Boolean(imageUrl) &&
                        imageUrls.indexOf(imageUrl) === imageIndex,
                    );

                    /*
                     * Kartta her zaman üç görsel
                     * alanı bulunur. Üründe üçten
                     * az görsel varsa mevcut
                     * görseller tekrar kullanılır.
                     */
                    const productImageUrls = Array.from(
                      {
                        length: 3,
                      },
                      (_, imageIndex) =>
                        uniqueProductImageUrls[
                          imageIndex % uniqueProductImageUrls.length
                        ],
                    );

                    return (
                      <Link
                        key={product.id}
                        href={`/urun/${product.slug}`}
                        aria-label={`${product.name} ilanını görüntüle`}
                        className="group relative block overflow-hidden rounded-[18px] p-[2px] transition duration-200 md:hover:-translate-y-0.5 active:scale-[0.995] sm:rounded-[21px]"
                        style={{
                          background: neonTheme.frameBackground,
                          boxShadow: neonTheme.glow,
                        }}
                      >

                        <div className="relative z-10 overflow-hidden rounded-[16px] bg-neutral-950 sm:rounded-[19px]">
                          <span aria-hidden="true" className="product-card-sheen" />

                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 z-[15]"
                            style={{
                              background: neonTheme.cardOverlay,
                            }}
                          />

                          <div
                            className="relative flex min-h-[34px] items-center gap-2 overflow-hidden border-b px-2.5 py-1.5 sm:min-h-[40px] sm:px-3 sm:py-2 lg:min-h-[42px]"
                            style={{
                              background: neonTheme.titleBackground,
                              borderColor: neonTheme.divider,
                            }}
                          >
                            <span
                              aria-hidden="true"
                              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/25 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white backdrop-blur-[2px] sm:px-2.5 sm:text-[9px]"
                              style={{
                                background: neonTheme.cornerBackground,
                                boxShadow: `0 0 14px ${neonTheme.secondary}70`,
                              }}
                            >
                              <span className="text-[10px] leading-none sm:text-xs">
                                {neonTheme.cornerIcon}
                              </span>
                              {neonTheme.cornerLabel}
                            </span>

                            <h3
                              className="relative min-w-0 flex-1 truncate text-[12px] font-black tracking-[0.01em] sm:text-sm"
                              style={{
                                color: neonTheme.titleColor,
                                textShadow: `0 0 8px ${neonTheme.accent}, 0 0 16px ${neonTheme.accent}88`,
                              }}
                            >
                              {product.name}
                            </h3>

                            {product.cardTag ? (
                              <span
                                className="max-w-[36%] shrink-0 truncate rounded-full border px-2 py-1 text-center text-[7px] font-black uppercase leading-none tracking-[0.035em] text-white shadow-lg sm:max-w-[40%] sm:px-2.5 sm:text-[8px] sm:tracking-[0.055em] lg:max-w-[38%]"
                                style={{
                                  borderColor: `${neonTheme.accent}99`,
                                  background: `linear-gradient(135deg, ${neonTheme.accent}, rgba(0,0,0,0.92))`,
                                  boxShadow: `0 0 12px ${neonTheme.accent}70`,
                                }}
                                title={product.cardTag}
                              >
                                {product.cardTag}
                              </span>
                            ) : null}
                          </div>

                        <div className="relative grid grid-cols-3 overflow-hidden">
                          {productImageUrls.map((imageUrl, imageIndex) => (
                            <div
                              key={`${product.id}-card-image-${imageIndex}`}
                              className="relative aspect-[5/3] min-w-0 overflow-hidden bg-neutral-200 sm:aspect-[4/3] lg:aspect-square"
                              style={
                                imageIndex < 2
                                  ? {
                                      borderRight: `1px solid ${neonTheme.divider}`,
                                    }
                                  : undefined
                              }
                            >
                              <Image
                                src={imageUrl}
                                alt={`${product.name} görsel ${imageIndex + 1}`}
                                fill
                                priority={productIndex === 0 && imageIndex === 0}
                                loading={
                                  productIndex === 0 && imageIndex === 0
                                    ? "eager"
                                    : "lazy"
                                }
                                sizes="(max-width: 640px) 33vw, (max-width: 1024px) 17vw, 9vw"
                                className="object-cover saturate-[1.08] contrast-[1.03] transition duration-200 md:group-hover:scale-[1.02]"
                              />

                              <div
                                aria-hidden="true"
                                className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
                                style={{
                                  background: `linear-gradient(135deg, ${neonTheme.accent}22, transparent 55%)`,
                                }}
                              />
                            </div>
                          ))}

                        </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] bg-white px-5 py-12 text-center shadow-sm ring-1 ring-black/[0.05]">
            <p className="text-sm font-medium text-neutral-700">
              Henüz yayınlanmış ilan bulunmuyor.
            </p>
          </div>
        )}

      </main>

      <footer className="border-t border-black/[0.05] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 xl:max-w-[1500px]">
          <nav
            aria-label="Alt menü"
            className="flex flex-wrap justify-center gap-x-5 gap-y-2"
          >
            <Link
              href="/hakkimizda"
              className="text-xs font-medium text-neutral-500 transition hover:text-neutral-950"
            >
              Hakkımızda
            </Link>

            <Link
              href="/iletisim"
              className="text-xs font-medium text-neutral-500 transition hover:text-neutral-950"
            >
              İletişim
            </Link>

            <Link
              href="/ilan-yayinlama-kurallari"
              className="text-xs font-medium text-neutral-500 transition hover:text-neutral-950"
            >
              İlan kuralları
            </Link>

            <Link
              href="/gizlilik-politikasi"
              className="text-xs font-medium text-neutral-500 transition hover:text-neutral-950"
            >
              Gizlilik
            </Link>

            <Link
              href="/kullanim-kosullari"
              className="text-xs font-medium text-neutral-500 transition hover:text-neutral-950"
            >
              Kullanım koşulları
            </Link>
          </nav>

          <p className="mt-5 text-center text-xs text-neutral-400">
            © {new Date().getFullYear()} {companyName}
          </p>
        </div>
      </footer>
    </div>
  );
}