import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { ProductGallery } from "@/components/ProductGallery";
import { WhatsappButton } from "@/components/WhatsappButton";
import { getProductCategoryConfig } from "@/lib/product-categories";
import prisma from "@/lib/prisma";
import {
  absoluteUrl,
  createSeoDescription,
  getSeoRegionBySlug,
  serializeJsonLd,
  siteConfig,
} from "@/lib/site-config";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type ProductDetailTable = {
  title: string;
  hasHeader: boolean;
  rows: string[][];
};

type ProductSeoRecord = {
  name: string;
  region?: string | null;
};

function cleanSeoText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getProductRegionName(product: ProductSeoRecord): string {
  const regionInformation = product.region
    ? getSeoRegionBySlug(product.region)
    : null;

  return regionInformation?.shortName || "Mersin";
}

function createProductSeoTitle(
  product: ProductSeoRecord,
  categoryLabel: string,
): string {
  const productName = cleanSeoText(product.name);

  const suffix = ` | ${getProductRegionName(product)} ${categoryLabel} Escort İlanı`;

  const maximumTitleLength = 65;
  const maximumNameLength = Math.max(18, maximumTitleLength - suffix.length);

  const shortenedName =
    productName.length > maximumNameLength
      ? `${productName.slice(0, maximumNameLength - 1).trimEnd()}…`
      : productName;

  return `${shortenedName}${suffix}`;
}

function createProductSeoDescription(
  product: ProductSeoRecord,
  categoryLabel: string,
): string {
  const regionName = getProductRegionName(product);

  return createSeoDescription(
    `${cleanSeoText(product.name)}, ${regionName} bölgesinde ${categoryLabel} escort ilanı. Güncel profil detayları ve iletişim seçeneklerini ${siteConfig.name}'da inceleyin.`,
  );
}

function getVisibleProductWhere(slug: string, now: Date) {
  return {
    slug,
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
  };
}

function createDailyListingViewCount(
  date: Date,
  productId: string,
  categoryValue: string,
  sortOrder: number,
): number {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(date);

  const seedText = `${dateKey}:${productId}:${categoryValue}:${sortOrder}`;

  let seed = 2166136261;

  for (const character of seedText) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }

  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;

  const normalizedValue = (seed >>> 0) / 4294967295;

  const position = Math.max(1, sortOrder);

  let minimum = 60;
  let maximum = 260;

  if (categoryValue === "VIP") {
    maximum = Math.max(320, 900 - (position - 1) * 18);

    minimum = Math.max(220, maximum - 260);
  } else if (categoryValue === "PREMIUM") {
    maximum = Math.max(180, 560 - (position - 1) * 12);

    minimum = Math.max(130, maximum - 180);
  } else {
    maximum = Math.max(90, 260 - (position - 1) * 7);

    minimum = Math.max(60, maximum - 90);
  }

  return Math.floor(minimum + normalizedValue * (maximum - minimum + 1));
}

function normalizeWhatsappNumber(value: string | null | undefined): string {
  let digits = (value ?? "").replace(/\D/g, "");

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

function createWhatsappUrl(
  phoneNumber: string | null | undefined,
  encodedMessage: string,
): string {
  const normalizedNumber = normalizeWhatsappNumber(phoneNumber);

  if (!normalizedNumber) {
    return `https://wa.me/?text=${encodedMessage}`;
  }

  return `https://wa.me/${normalizedNumber}?text=${encodedMessage}`;
}

function normalizeTableCell(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function getDetailTheme(categoryValue: string) {
  switch (categoryValue) {
    case "VIP":
      return {
        accent: "#d946ef",
        secondary: "#8b5cf6",
        soft: "rgba(217,70,239,0.08)",
        border: "rgba(217,70,239,0.34)",
        glow: "0 22px 65px rgba(217,70,239,0.13)",
      };

    case "PREMIUM":
      return {
        accent: "#ff7a00",
        secondary: "#f59e0b",
        soft: "rgba(255,122,0,0.08)",
        border: "rgba(255,122,0,0.34)",
        glow: "0 22px 65px rgba(255,122,0,0.12)",
      };

    default:
      return {
        accent: "#eab308",
        secondary: "#facc15",
        soft: "rgba(234,179,8,0.09)",
        border: "rgba(234,179,8,0.36)",
        glow: "0 22px 65px rgba(234,179,8,0.12)",
      };
  }
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const now = new Date();

  const product = await prisma.product.findFirst({
    where: getVisibleProductWhere(slug, now),
    select: {
      name: true,
      slug: true,
      category: true,
      coverImage: true,
      region: true,
    },
  });

  if (!product) {
    return {
      title: "İlan bulunamadı",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const categoryInformation = getProductCategoryConfig(product.category);

  const description = createProductSeoDescription(
    product,
    categoryInformation.label,
  );

  const title = createProductSeoTitle(product, categoryInformation.label);

  const url = absoluteUrl(`/urun/${product.slug}`);

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url,
      siteName: siteConfig.name,
      title,
      description,
      images: product.coverImage
        ? [
            {
              url: product.coverImage,
              alt: `${product.name} görseli`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.coverImage ? [product.coverImage] : undefined,
    },
    other: {
      rating: "adult",
    },
  };
}

function parseProductDetailTable(value: unknown): ProductDetailTable | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (!Array.isArray(record.rows)) {
    return null;
  }

  const normalizedRows = record.rows
    .map((row) => {
      if (!Array.isArray(row)) {
        return [];
      }

      /*
       * Şimdilik en fazla 3 sütun destekliyoruz.
       * Admin panelinde de 2 veya 3 sütun
       * seçilebilecek.
       */
      return row.slice(0, 3).map(normalizeTableCell);
    })
    .filter((row) => row.some((cell) => cell.length > 0));

  if (normalizedRows.length === 0) {
    return null;
  }

  const maximumColumnCount = Math.max(
    ...normalizedRows.map((row) => row.length),
  );

  const columnCount = Math.min(3, Math.max(2, maximumColumnCount));

  const rows = normalizedRows.map((row) =>
    Array.from(
      {
        length: columnCount,
      },
      (_, index) => row[index] ?? "",
    ),
  );

  const title =
    typeof record.title === "string" && record.title.trim()
      ? record.title.trim()
      : "İlan özellikleri";

  return {
    title,
    hasHeader: record.hasHeader === true,
    rows,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const now = new Date();

  /*
   * Ürün yalnızca:
   *
   * - Manuel olarak aktifse
   * - Abonelik bitiş tarihi yoksa
   * - Veya abonelik tarihi henüz dolmadıysa
   *
   * görüntülenebilir.
   *
   * Süresi biten ürünün eski bağlantısı
   * bilinse bile detay sayfası açılmaz.
   */
  const product = await prisma.product.findFirst({
    where: getVisibleProductWhere(slug, now),
    include: {
      images: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      whatsappButtons: {
        where: {
          isActive: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          label: true,
          phoneNumber: true,
          sortOrder: true,
          isActive: true,
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const settings = await prisma.siteSettings.findUnique({
    where: {
      id: "default",
    },
  });

  const galleryImages = [
    product.coverImage,
    ...product.images.map((image) => image.imageUrl),
  ].filter((image, index, allImages) => allImages.indexOf(image) === index);

  const dailyListingViewCount = createDailyListingViewCount(
    now,
    product.id,
    product.category,
    product.sortOrder,
  );

  const whatsappMessage = encodeURIComponent(
    "Merhaba, Miss Mersin sitesinden geldim. Bilgi almak istiyorum.",
  );

  const productWhatsappButtons = product.whatsappButtons.map((button) => ({
    id: button.id,
    label: button.label.trim() || "WhatsApp ile bilgi al",
    href: createWhatsappUrl(button.phoneNumber, whatsappMessage),
  }));

  const fallbackWhatsappNumber =
    product.whatsappNumber || settings?.whatsappNumber;

  const whatsappButtons =
    productWhatsappButtons.length > 0
      ? productWhatsappButtons
      : [
          {
            id: "fallback",
            label: "WhatsApp ile bilgi al",
            href: createWhatsappUrl(fallbackWhatsappNumber, whatsappMessage),
          },
        ];

  const categoryInformation = getProductCategoryConfig(product.category);

  const detailRegionInformation = product.region
    ? getSeoRegionBySlug(product.region)
    : null;

  const returnHref = detailRegionInformation
    ? `/bolge/${detailRegionInformation.slug}`
    : "/";

  const returnLabel = detailRegionInformation
    ? `${detailRegionInformation.shortName} ilanlarına dön`
    : "İlanlara dön";

  const detailTheme = getDetailTheme(product.category);

  const detailTable = parseProductDetailTable(product.detailTable);

  const tableHeaderRow = detailTable?.hasHeader ? detailTable.rows[0] : null;

  const tableBodyRows = detailTable?.hasHeader
    ? detailTable.rows.slice(1)
    : (detailTable?.rows ?? []);

  const productUrl = absoluteUrl(`/urun/${product.slug}`);

  const productSeoDescription = createProductSeoDescription(
    product,
    categoryInformation.label,
  );

  const productSeoTitle = createProductSeoTitle(
    product,
    categoryInformation.label,
  );

  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Ana sayfa",
      item: siteConfig.url,
    },
    detailRegionInformation
      ? {
          "@type": "ListItem",
          position: 2,
          name: `${detailRegionInformation.shortName} Escort İlanları`,
          item: absoluteUrl(`/bolge/${detailRegionInformation.slug}`),
        }
      : {
          "@type": "ListItem",
          position: 2,
          name: categoryInformation.label,
          item: `${siteConfig.url}/#${categoryInformation.key}`,
        },
    {
      "@type": "ListItem",
      position: 3,
      name: product.name,
      item: productUrl,
    },
  ];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${productUrl}#breadcrumb`,
    itemListElement: breadcrumbItems,
  };

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${productUrl}#webpage`,
    url: productUrl,
    name: productSeoTitle,
    description: productSeoDescription,
    inLanguage: "tr-TR",
    datePublished: product.createdAt.toISOString(),
    dateModified: product.updatedAt.toISOString(),
    isFamilyFriendly: false,
    isPartOf: {
      "@id": `${siteConfig.url}/#website`,
    },
    breadcrumb: {
      "@id": `${productUrl}#breadcrumb`,
    },
    primaryImageOfPage: product.coverImage
      ? {
          "@type": "ImageObject",
          url: product.coverImage,
        }
      : undefined,
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#f4f4f0]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 12% 8%, rgba(217,70,239,0.09), transparent 28%), radial-gradient(circle at 92% 18%, rgba(34,211,238,0.08), transparent 24%)",
      }}
    >
      <AnalyticsTracker
        eventType="PRODUCT_VIEW"
        productId={product.id}
        heartbeat={false}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(webPageJsonLd),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(breadcrumbJsonLd),
        }}
      />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/95 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={returnHref}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-white/30 hover:bg-white/15 active:scale-[0.98]"
          >
            <span aria-hidden="true" className="text-base">
              ←
            </span>
            {returnLabel}
          </Link>

          <span
            className="rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em]"
            style={{
              color: detailTheme.accent,
              borderColor: detailTheme.border,
              backgroundColor: "rgba(255,255,255,0.08)",
              boxShadow: `0 0 18px ${detailTheme.accent}33`,
            }}
          >
            {categoryInformation.label}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8 lg:pb-16">
        <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-start lg:gap-10">
          <section
            className="min-w-0 rounded-[30px] border bg-white/80 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:p-3"
            style={{
              borderColor: detailTheme.border,
              boxShadow: detailTheme.glow,
            }}
          >
            <ProductGallery productName={product.name} images={galleryImages} />
          </section>

          <section className="w-full min-w-0 lg:sticky lg:top-24 lg:max-w-[410px] lg:justify-self-end lg:self-start">
            <div
              className="overflow-hidden rounded-[30px] border bg-white/95 shadow-[0_24px_70px_rgba(0,0,0,0.09)] backdrop-blur-sm"
              style={{
                borderColor: detailTheme.border,
                boxShadow: detailTheme.glow,
              }}
            >
              <div
                className="h-1.5"
                style={{
                  background: `linear-gradient(90deg, ${detailTheme.accent}, ${detailTheme.secondary}, #22d3ee)`,
                }}
              />

              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em]"
                    style={{
                      color: detailTheme.accent,
                      borderColor: detailTheme.border,
                      backgroundColor: detailTheme.soft,
                    }}
                  >
                    {categoryInformation.label}
                  </span>

                  {detailRegionInformation ? (
                    <Link
                      href={`/bolge/${detailRegionInformation.slug}`}
                      className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-neutral-600 transition hover:border-neutral-300 hover:bg-white"
                    >
                      Bölge: {detailRegionInformation.shortName}
                    </Link>
                  ) : null}

                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                    <span
                      className="size-2 rounded-full"
                      style={{
                        background: detailTheme.accent,
                        boxShadow: `0 0 10px ${detailTheme.accent}`,
                      }}
                    />
                    Güncel ilan
                  </span>
                </div>

                <h1 className="mt-5 text-[32px] font-black leading-[1.08] tracking-[-0.045em] text-neutral-950 sm:text-[40px]">
                  {product.name}
                </h1>

                {detailRegionInformation ? (
                  <p className="mt-3 text-sm font-semibold text-neutral-500">
                    Bu ilan {detailRegionInformation.shortName} bölgesinde
                    listeleniyor.
                  </p>
                ) : null}

                <p className="mt-4 text-sm leading-6 text-neutral-600">
                  {productSeoDescription}
                </p>

                {product.shortDescription ? (
                  <div
                    data-nosnippet
                    className="mt-5 rounded-2xl border px-4 py-3.5"
                    style={{
                      borderColor: detailTheme.border,
                      background: detailTheme.soft,
                    }}
                  >
                    <p className="text-sm font-medium leading-6 text-neutral-700">
                      {product.shortDescription}
                    </p>
                  </div>
                ) : null}

                <section
                  data-nosnippet
                  className="mt-6 border-t border-neutral-100 pt-6"
                >
                  <h2 className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
                    İlan hakkında
                  </h2>

                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-neutral-650 sm:text-[15px]">
                    {product.description}
                  </p>
                </section>

                {detailTable ? (
                  <section data-nosnippet className="mt-7">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h2 className="text-sm font-black text-neutral-950">
                        {detailTable.title}
                      </h2>

                      <span
                        className="h-px flex-1"
                        style={{
                          background: `linear-gradient(90deg, ${detailTheme.accent}66, transparent)`,
                        }}
                      />
                    </div>

                    <div
                      className="overflow-hidden rounded-2xl border bg-white"
                      style={{
                        borderColor: detailTheme.border,
                      }}
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[300px] table-fixed border-collapse">
                          {tableHeaderRow ? (
                            <thead>
                              <tr
                                style={{
                                  background: `linear-gradient(90deg, #090909, ${detailTheme.accent}33, #090909)`,
                                }}
                              >
                                {tableHeaderRow.map((cell, cellIndex) => (
                                  <th
                                    key={`header-${cellIndex}`}
                                    scope="col"
                                    className="border-r border-white/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.09em] text-white last:border-r-0"
                                  >
                                    {cell || "—"}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                          ) : null}

                          <tbody className="divide-y divide-neutral-100">
                            {tableBodyRows.map(
                              (row: string[], rowIndex: number) => (
                                <tr
                                  key={`row-${rowIndex}`}
                                  className="odd:bg-white even:bg-neutral-50/80"
                                >
                                  {row.map(
                                    (cell: string, cellIndex: number) => (
                                      <td
                                        key={`cell-${rowIndex}-${cellIndex}`}
                                        className={`border-r border-neutral-100 px-3 py-3.5 text-xs leading-5 text-neutral-600 last:border-r-0 ${
                                          !tableHeaderRow && cellIndex === 0
                                            ? "font-bold text-neutral-950"
                                            : ""
                                        }`}
                                      >
                                        {cell || "—"}
                                      </td>
                                    ),
                                  )}
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                ) : null}

                <div
                  data-nosnippet
                  className="mt-7 flex items-center gap-3 rounded-2xl border p-4"
                  style={{
                    borderColor: detailTheme.border,
                    background: `linear-gradient(135deg, ${detailTheme.soft}, rgba(255,255,255,0.92))`,
                  }}
                >
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${detailTheme.accent}, ${detailTheme.secondary})`,
                      boxShadow: `0 10px 25px ${detailTheme.accent}33`,
                    }}
                  >
                    ↗
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-neutral-950">
                      Son 24 saatte{" "}
                      {new Intl.NumberFormat("tr-TR").format(
                        dailyListingViewCount,
                      )}{" "}
                      kişi inceledi
                    </p>

                    <p className="mt-0.5 text-xs text-neutral-500">
                      Güncel tekil ziyaretçi sayısı
                    </p>
                  </div>
                </div>

                <div data-nosnippet className="mt-7 hidden space-y-3 lg:block">
                  {whatsappButtons.map((button) => (
                    <WhatsappButton
                      key={button.id}
                      href={button.href}
                      productId={product.id}
                      productName={product.name}
                      className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#1fa855] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(31,168,85,0.24)] transition hover:-translate-y-0.5 hover:bg-[#198f49] active:scale-[0.98]"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="size-5 fill-current"
                      >
                        <path d="M12.04 2a9.84 9.84 0 0 0-8.45 14.88L2 22l5.25-1.55A9.98 9.98 0 1 0 12.04 2Zm0 17.96a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.11.92.93-3.03-.2-.31a8.03 8.03 0 1 1 6.81 3.73Zm4.43-6.02c-.24-.12-1.44-.71-1.66-.79-.23-.08-.39-.12-.56.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2a7.27 7.27 0 0 1-1.34-1.67c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.56-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
                      </svg>

                      {button.label}
                    </WhatsappButton>
                  ))}
                </div>

                <p className="mt-3 hidden text-center text-xs leading-5 text-neutral-400 lg:block">
                  Hazır mesajla ilan sahibine yönlendirilirsiniz.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <div
        data-nosnippet
        className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/92 p-3 shadow-[0_-12px_35px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto max-h-[42vh] max-w-xl space-y-2 overflow-y-auto">
          {whatsappButtons.map((button) => (
            <WhatsappButton
              key={`mobile-${button.id}`}
              href={button.href}
              productId={product.id}
              productName={product.name}
              className="flex min-h-13 w-full items-center justify-center gap-3 rounded-2xl bg-[#1fa855] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(31,168,85,0.24)] transition active:scale-[0.98]"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-5 fill-current"
              >
                <path d="M12.04 2a9.84 9.84 0 0 0-8.45 14.88L2 22l5.25-1.55A9.98 9.98 0 1 0 12.04 2Zm0 17.96a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.11.92.93-3.03-.2-.31a8.03 8.03 0 1 1 6.81 3.73Zm4.43-6.02c-.24-.12-1.44-.71-1.66-.79-.23-.08-.39-.12-.56.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2a7.27 7.27 0 0 1-1.34-1.67c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.56-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
              </svg>

              {button.label}
            </WhatsappButton>
          ))}
        </div>
      </div>
    </div>
  );
}