import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { getProductCategoryConfig } from "@/lib/product-categories";
import { productBelongsToRegion } from "@/lib/product-regions";
import prisma from "@/lib/prisma";
import {
  absoluteUrl,
  getSeoRegionBySlug,
  seoRegions,
  serializeJsonLd,
  siteConfig,
} from "@/lib/site-config";

export const dynamic = "force-dynamic";

type RegionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function getCategoryNeonTheme(categoryValue: string) {
  switch (categoryValue) {
    case "VIP":
      return {
        accent: "#67e8f9",
        secondary: "#06b6d4",
        titleColor: "#ecfeff",
        titleBackground:
          "linear-gradient(90deg, #00141a 0%, #073344 48%, #00141a 100%)",
        frameBackground:
          "linear-gradient(135deg, #083344 0%, #06b6d4 28%, #67e8f9 48%, #8b5cf6 61%, #164e63 79%, #001419 100%)",
        glow:
          "0 0 0 1px rgba(103,232,249,0.30), 0 8px 18px rgba(8,51,68,0.14)",
        divider: "rgba(103,232,249,0.66)",
        cornerLabel: "VIP",
        cornerBackground:
          "linear-gradient(135deg, rgba(0,20,26,0.96), rgba(8,145,178,0.94) 58%, rgba(124,58,237,0.9))",
        cardOverlay:
          "linear-gradient(145deg, rgba(103,232,249,0.13), transparent 38%, rgba(139,92,246,0.10) 76%, transparent)",
      };

    case "PREMIUM":
      return {
        accent: "#f0abfc",
        secondary: "#d946ef",
        titleColor: "#fff4ff",
        titleBackground:
          "linear-gradient(90deg, #120014 0%, #3b0a46 48%, #120014 100%)",
        frameBackground:
          "linear-gradient(135deg, #4a044e 0%, #d946ef 28%, #f0abfc 47%, #f59e0b 58%, #7e22ce 76%, #25002b 100%)",
        glow:
          "0 0 0 1px rgba(240,171,252,0.30), 0 8px 18px rgba(88,28,135,0.15)",
        divider: "rgba(240,171,252,0.72)",
        cornerLabel: "PREMIUM",
        cornerBackground:
          "linear-gradient(135deg, rgba(15,0,18,0.96), rgba(126,34,206,0.94) 56%, rgba(245,158,11,0.92))",
        cardOverlay:
          "linear-gradient(145deg, rgba(240,171,252,0.15), transparent 34%, rgba(245,158,11,0.10) 72%, transparent)",
      };

    default:
      return {
        accent: "#fde68a",
        secondary: "#f59e0b",
        titleColor: "#fff8d6",
        titleBackground:
          "linear-gradient(90deg, #171000 0%, #4a3100 48%, #171000 100%)",
        frameBackground:
          "linear-gradient(135deg, #3f2a00 0%, #d97706 27%, #fde68a 49%, #f59e0b 60%, #92400e 78%, #211200 100%)",
        glow:
          "0 0 0 1px rgba(253,230,138,0.28), 0 8px 18px rgba(120,53,15,0.14)",
        divider: "rgba(253,230,138,0.66)",
        cornerLabel: "GOLD",
        cornerBackground:
          "linear-gradient(135deg, rgba(28,18,0,0.97), rgba(180,83,9,0.94) 58%, rgba(245,158,11,0.92))",
        cardOverlay:
          "linear-gradient(145deg, rgba(253,230,138,0.12), transparent 38%, rgba(180,83,9,0.09) 76%, transparent)",
      };
  }
}

const getRegionProducts = cache(async (slug: string) => {
  const region = getSeoRegionBySlug(slug);

  if (!region) {
    return [];
  }

  const now = new Date();

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { subscriptionEndsAt: null },
        { subscriptionEndsAt: { gt: now } },
      ],
    },
    orderBy: [
      { category: "asc" },
      { sortOrder: "asc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      coverImage: true,
      cardTag: true,
      region: true,
      category: true,
      images: {
        orderBy: { sortOrder: "asc" },
        select: { imageUrl: true },
        take: 2,
      },
    },
  });

  return products
    .filter((product) => productBelongsToRegion(product, region))
    .slice(0, 60);
});

export async function generateMetadata({
  params,
}: RegionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const region = getSeoRegionBySlug(slug);

  if (!region) {
    return {
      title: "Bölge bulunamadı",
      robots: { index: false, follow: false },
    };
  }

  const products = await getRegionProducts(region.slug);
  const url = absoluteUrl(`/bolge/${region.slug}`);
  const socialImage = products[0]?.coverImage;

  return {
    title: { absolute: region.title },
    description: region.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url,
      siteName: siteConfig.name,
      title: region.title,
      description: region.description,
      images: socialImage
        ? [{ url: socialImage, alt: `${region.shortName} güncel ilanları` }]
        : undefined,
    },
    twitter: {
      card: socialImage ? "summary_large_image" : "summary",
      title: region.title,
      description: region.description,
      images: socialImage ? [socialImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    other: { rating: "adult" },
  };
}

export default async function RegionPage({ params }: RegionPageProps) {
  const { slug } = await params;
  const region = getSeoRegionBySlug(slug);

  if (!region) {
    notFound();
  }

  const displayedProducts = await getRegionProducts(region.slug);

  const categoryCounts = displayedProducts.reduce((counts, product) => {
    const category = getProductCategoryConfig(product.category);
    counts.set(category.label, (counts.get(category.label) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  const relatedRegions = region.nearbyRegionSlugs
    .map((relatedSlug) => seoRegions.find((item) => item.slug === relatedSlug))
    .filter(
      (item): item is (typeof seoRegions)[number] => Boolean(item),
    );

  const navigationRegions = [region, ...relatedRegions];
  const pageUrl = absoluteUrl(`/bolge/${region.slug}`);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana sayfa",
        item: siteConfig.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: region.name,
        item: pageUrl,
      },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: region.h1,
    numberOfItems: displayedProducts.length,
    itemListElement: displayedProducts.slice(0, 50).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: absoluteUrl(`/urun/${product.slug}`),
    })),
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: region.h1,
    description: region.description,
    url: pageUrl,
    inLanguage: "tr-TR",
    isFamilyFriendly: false,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionJsonLd) }}
      />
      {displayedProducts.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }}
        />
      ) : null}

      <header className="border-b border-fuchsia-400/35 bg-black shadow-[0_0_20px_rgba(217,70,239,0.20)]">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:min-h-16 sm:px-4 xl:max-w-[1500px]">
          <Link
            href="/"
            className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-[11px] font-bold text-white/85 transition hover:border-white/30 hover:text-white sm:text-sm"
          >
            ← Ana sayfa
          </Link>

          <Link
            href="/"
            aria-label={`${siteConfig.name} ana sayfa`}
            className="bg-[linear-gradient(90deg,#fff8d6_0%,#ffd36a_22%,#f59e0b_50%,#fff3b0_72%,#b45309_100%)] bg-clip-text text-base font-black tracking-[0.1em] text-transparent drop-shadow-[0_0_10px_rgba(245,158,11,0.75)] sm:text-xl"
          >
            {siteConfig.name}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-2.5 pb-12 pt-3 sm:px-4 sm:pt-5 xl:max-w-[1500px]">
        <section className="overflow-hidden rounded-[18px] border border-fuchsia-300/35 bg-white shadow-sm sm:rounded-[24px]">
          <div className="h-1 bg-[linear-gradient(90deg,#d946ef,#8b5cf6,#22d3ee)]" />

          <div className="px-3.5 py-4 sm:px-6 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.17em] text-fuchsia-500 sm:text-[11px]">
                  Bölge ilanları
                </p>
                <h1 className="mt-1.5 text-[24px] font-black leading-[1.04] tracking-[-0.045em] text-neutral-950 sm:text-4xl">
                  {region.h1}
                </h1>
              </div>

              <span className="shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[10px] font-black text-neutral-700 sm:text-xs">
                {displayedProducts.length} aktif
              </span>
            </div>

            <p className="mt-2.5 line-clamp-2 max-w-4xl text-[11px] leading-5 text-neutral-500 sm:text-sm sm:leading-6">
              {region.intro}
            </p>

            {categoryCounts.size > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Array.from(categoryCounts.entries()).map(
                  ([categoryLabel, count]) => (
                    <span
                      key={categoryLabel}
                      className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1 text-[9px] font-bold text-fuchsia-700 sm:text-[10px]"
                    >
                      {categoryLabel}: {count}
                    </span>
                  ),
                )}
              </div>
            ) : null}
          </div>
        </section>

        <nav
          aria-label="İlgili bölge sayfaları"
          className="mt-3 flex gap-1.5 overflow-x-auto border-b border-neutral-200 pb-2"
        >
          {navigationRegions.map((item) => (
            <Link
              key={item.slug}
              href={`/bolge/${item.slug}`}
              aria-current={item.slug === region.slug ? "page" : undefined}
              className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition sm:px-3 sm:py-2 sm:text-xs ${
                item.slug === region.slug
                  ? "border-fuchsia-400 bg-fuchsia-100 text-fuchsia-700"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-950"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <section aria-labelledby="region-listings-title" className="mt-4">
          <div className="mb-2.5">
            <h2
              id="region-listings-title"
              className="text-lg font-black tracking-[-0.03em] text-neutral-950 sm:text-2xl"
            >
              {region.shortName} güncel ilanları
            </h2>
            <p className="mt-0.5 text-[10px] text-neutral-500 sm:text-xs">
              Yalnızca bu bölgeyle eşleşen aktif ilanlar listelenir.
            </p>
          </div>

          {displayedProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-[3px] sm:gap-1.5 md:grid-cols-3 lg:grid-cols-4 xl:gap-2">
              {displayedProducts.map((product, productIndex) => {
                const neonTheme = getCategoryNeonTheme(product.category);

                const uniqueProductImageUrls = [
                  product.coverImage,
                  ...product.images.map((image) => image.imageUrl),
                ].filter(
                  (imageUrl, imageIndex, imageUrls) =>
                    Boolean(imageUrl) &&
                    imageUrls.indexOf(imageUrl) === imageIndex,
                );

                const productImageUrls = Array.from(
                  { length: 3 },
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
                    className="group relative block overflow-hidden rounded-[13px] p-px transition duration-200 active:scale-[0.995] sm:rounded-[17px] sm:p-[1.5px] md:hover:-translate-y-0.5"
                    style={{
                      background: neonTheme.frameBackground,
                      boxShadow: neonTheme.glow,
                    }}
                  >
                    <div className="relative z-10 overflow-hidden rounded-[12px] bg-neutral-950 sm:rounded-[15px]">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-[15]"
                        style={{ background: neonTheme.cardOverlay }}
                      />

                      <div
                        className="relative z-20 flex min-h-[25px] items-center justify-between gap-1 border-b px-1.5 py-[3px] sm:min-h-[34px] sm:px-2.5 sm:py-1"
                        style={{
                          background: neonTheme.titleBackground,
                          borderColor: neonTheme.divider,
                        }}
                      >
                        <span
                          className="inline-flex min-w-0 shrink items-center rounded-[6px] border border-white/25 px-1.5 py-1 text-[7px] font-black uppercase leading-none tracking-[0.08em] text-white sm:rounded-full sm:px-2 sm:text-[8px]"
                          style={{
                            background: neonTheme.cornerBackground,
                            boxShadow: `0 0 10px ${neonTheme.secondary}55`,
                          }}
                        >
                          <span className="truncate">{neonTheme.cornerLabel}</span>
                        </span>

                        {product.cardTag ? (
                          <span
                            data-nosnippet
                            className="min-w-0 max-w-[58%] truncate rounded-[6px] border px-1.5 py-1 text-right text-[7px] font-black uppercase leading-none tracking-[0.025em] text-white sm:max-w-[55%] sm:rounded-full sm:px-2 sm:text-[8px]"
                            style={{
                              borderColor: `${neonTheme.accent}99`,
                              background: `linear-gradient(135deg, rgba(0,0,0,0.90), ${neonTheme.accent}88)`,
                              boxShadow: `0 0 9px ${neonTheme.accent}50`,
                            }}
                            title={product.cardTag}
                          >
                            {product.cardTag}
                          </span>
                        ) : (
                          <span
                            className="truncate text-[7px] font-black uppercase tracking-[0.08em] sm:text-[8px]"
                            style={{ color: neonTheme.titleColor }}
                          >
                            Güncel
                          </span>
                        )}
                      </div>

                      <div className="relative grid grid-cols-3 overflow-hidden">
                        {productImageUrls.map((imageUrl, imageIndex) => (
                          <div
                            key={`${product.id}-region-card-image-${imageIndex}`}
                            className="relative aspect-[5/8] min-w-0 overflow-hidden bg-neutral-200 sm:aspect-[4/3] lg:aspect-square"
                            style={
                              imageIndex < 2
                                ? { borderRight: `1px solid ${neonTheme.divider}` }
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
                              sizes="(max-width: 640px) 16.7vw, (max-width: 768px) 16.7vw, (max-width: 1024px) 11vw, 9vw"
                              className="object-cover saturate-[1.06] contrast-[1.03] transition duration-200 md:group-hover:scale-[1.02]"
                            />
                          </div>
                        ))}
                      </div>

                      <div
                        className="relative z-20 flex min-h-[24px] items-center justify-center border-t px-2 py-[3px] sm:min-h-[31px] sm:px-3 sm:py-1"
                        style={{
                          borderColor: neonTheme.divider,
                          background: `linear-gradient(90deg, rgba(0,0,0,0.96), ${neonTheme.secondary}55, rgba(0,0,0,0.96))`,
                        }}
                      >
                        <h3
                          className="max-w-full truncate text-center text-[10px] font-black uppercase tracking-[0.02em] sm:text-[12px]"
                          style={{
                            color: neonTheme.titleColor,
                            textShadow: `0 0 7px ${neonTheme.accent}CC`,
                          }}
                        >
                          {product.name}
                        </h3>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-10 text-center">
              <h3 className="text-base font-black text-neutral-900">
                Bu bölgede aktif ilan bulunmuyor
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Yeni bir ilan yayınlandığında bu sayfada otomatik olarak listelenecek.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex rounded-full bg-neutral-950 px-5 py-2.5 text-xs font-black text-white transition hover:bg-neutral-800"
              >
                Tüm ilanlara dön
              </Link>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[20px] border border-black/10 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
          <h2 className="text-lg font-black tracking-[-0.03em] text-neutral-950 sm:text-2xl">
            {region.contentTitle}
          </h2>
          <div className="mt-3 grid gap-3 text-xs leading-6 text-neutral-600 sm:text-sm sm:leading-7 md:grid-cols-2">
            {region.contentParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {region.selectionHighlights.map((highlight) => (
              <li
                key={highlight}
                className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[11px] font-bold leading-5 text-neutral-700 sm:text-xs"
              >
                {highlight}
              </li>
            ))}
          </ul>
        </section>

        {relatedRegions.length > 0 ? (
          <section
            aria-labelledby="related-regions-title"
            className="mt-5 rounded-[20px] border border-black/10 bg-white px-4 py-5 shadow-sm sm:px-6"
          >
            <h2
              id="related-regions-title"
              className="text-base font-black text-neutral-950"
            >
              Yakındaki diğer bölge sayfaları
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {relatedRegions.map((relatedRegion) => (
                <Link
                  key={relatedRegion.slug}
                  href={`/bolge/${relatedRegion.slug}`}
                  className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1.5 text-[10px] font-bold text-fuchsia-700 transition hover:border-fuchsia-400 hover:bg-fuchsia-100 sm:text-xs"
                >
                  {relatedRegion.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-black/[0.06] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-center sm:flex-row sm:text-left xl:max-w-[1500px]">
          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} {siteConfig.name}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/" className="text-xs font-semibold text-neutral-500 transition hover:text-neutral-950">
              Ana sayfa
            </Link>
            <Link href="/iletisim" className="text-xs font-semibold text-neutral-500 transition hover:text-neutral-950">
              İletişim
            </Link>
            <Link href="/ilan-yayinlama-kurallari" className="text-xs font-semibold text-neutral-500 transition hover:text-neutral-950">
              İlan kuralları
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}