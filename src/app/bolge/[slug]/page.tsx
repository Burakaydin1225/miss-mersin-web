import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { getProductCategoryConfig } from "@/lib/product-categories";
import {
  productBelongsToRegion,
} from "@/lib/product-regions";
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

const getRegionProducts = cache(
  async (slug: string) => {
    const region = getSeoRegionBySlug(slug);

    if (!region) {
      return [];
    }

    const now = new Date();

    const products =
      await prisma.product.findMany({
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
        orderBy: [
          {
            category: "asc",
          },
          {
            sortOrder: "asc",
          },
          {
            createdAt: "desc",
          },
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
        },
      });

    return products
      .filter((product) =>
        productBelongsToRegion(
          product,
          region,
        ),
      )
      .slice(0, 60);
  },
);

export async function generateMetadata({
  params,
}: RegionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const region = getSeoRegionBySlug(slug);

  if (!region) {
    return {
      title: "Bölge bulunamadı",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const products =
    await getRegionProducts(region.slug);

  const hasListings = products.length > 0;
  const url = absoluteUrl(
    `/bolge/${region.slug}`,
  );

  const socialImage =
    products[0]?.coverImage;

  return {
    title: {
      absolute: region.title,
    },
    description: region.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url,
      siteName: siteConfig.name,
      title: region.title,
      description: region.description,
      images: socialImage
        ? [
            {
              url: socialImage,
              alt: `${region.shortName} güncel ilanları`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: socialImage
        ? "summary_large_image"
        : "summary",
      title: region.title,
      description: region.description,
      images: socialImage
        ? [socialImage]
        : undefined,
    },
    robots: {
      index: hasListings,
      follow: true,
      googleBot: {
        index: hasListings,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    other: {
      rating: "adult",
    },
  };
}

export default async function RegionPage({
  params,
}: RegionPageProps) {
  const { slug } = await params;
  const region = getSeoRegionBySlug(slug);

  if (!region) {
    notFound();
  }

  const displayedProducts =
    await getRegionProducts(region.slug);

  const categoryCounts =
    displayedProducts.reduce(
      (counts, product) => {
        const category =
          getProductCategoryConfig(
            product.category,
          );

        counts.set(
          category.label,
          (counts.get(category.label) ?? 0) +
            1,
        );

        return counts;
      },
      new Map<string, number>(),
    );

  const relatedRegions =
    region.nearbyRegionSlugs
      .map((relatedSlug) =>
        seoRegions.find(
          (item) =>
            item.slug === relatedSlug,
        ),
      )
      .filter(
        (
          item,
        ): item is (typeof seoRegions)[number] =>
          Boolean(item),
      );

  const pageUrl = absoluteUrl(
    `/bolge/${region.slug}`,
  );

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
    numberOfItems:
      displayedProducts.length,
    itemListElement:
      displayedProducts
        .slice(0, 50)
        .map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: product.name,
          url: absoluteUrl(
            `/urun/${product.slug}`,
          ),
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
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbJsonLd,
          ),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            collectionJsonLd,
          ),
        }}
      />

      {displayedProducts.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(
              itemListJsonLd,
            ),
          }}
        />
      ) : null}

      <header className="border-b border-fuchsia-400/40 bg-black shadow-[0_0_26px_rgba(217,70,239,0.28)]">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3 xl:max-w-[1500px]">
          <Link
            href="/"
            className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/80 transition hover:border-white/30 hover:text-white sm:text-sm"
          >
            ← Ana sayfa
          </Link>

          <Link
            href="/"
            aria-label={`${siteConfig.name} ana sayfa`}
            className="bg-[linear-gradient(90deg,#fff8d6_0%,#ffd36a_22%,#f59e0b_50%,#fff3b0_72%,#b45309_100%)] bg-clip-text text-lg font-black tracking-[0.1em] text-transparent drop-shadow-[0_0_12px_rgba(245,158,11,0.9)] sm:text-xl"
          >
            {siteConfig.name}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 pb-12 pt-5 sm:px-4 sm:pt-7 xl:max-w-[1500px]">
        <section className="overflow-hidden rounded-[24px] border border-fuchsia-300/45 bg-white shadow-sm sm:rounded-[28px]">
          <div className="h-1.5 bg-[linear-gradient(90deg,#d946ef,#8b5cf6,#22d3ee)]" />

          <div className="px-4 py-6 sm:px-7 sm:py-8">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-500 sm:text-xs">
              Bölge ilanları
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-neutral-950 sm:text-5xl">
              {region.h1}
            </h1>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-neutral-600 sm:text-base">
              {region.intro}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-black text-neutral-700">
                {displayedProducts.length} aktif ilan
              </span>

              {Array.from(
                categoryCounts.entries(),
              ).map(
                ([categoryLabel, count]) => (
                  <span
                    key={categoryLabel}
                    className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-[11px] font-bold text-fuchsia-700"
                  >
                    {categoryLabel}: {count}
                  </span>
                ),
              )}
            </div>
          </div>
        </section>

        <nav
          aria-label="Diğer bölge ilanları"
          className="mt-4 flex gap-2 overflow-x-auto pb-1"
        >
          {seoRegions.map((item) => (
            <Link
              key={item.slug}
              href={`/bolge/${item.slug}`}
              aria-current={
                item.slug === region.slug
                  ? "page"
                  : undefined
              }
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold transition ${
                item.slug === region.slug
                  ? "border-fuchsia-400 bg-fuchsia-100 text-fuchsia-700"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-950"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <section
          aria-labelledby="region-listings-title"
          className="mt-7"
        >
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2
                id="region-listings-title"
                className="text-xl font-black tracking-[-0.03em] text-neutral-950 sm:text-2xl"
              >
                {region.shortName} güncel ilanları
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Yalnızca bu bölgeyle eşleşen aktif ilanlar listelenir.
              </p>
            </div>
          </div>

          {displayedProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {displayedProducts.map(
                (product, productIndex) => {
                  const category =
                    getProductCategoryConfig(
                      product.category,
                    );

                  return (
                    <Link
                      key={product.id}
                      href={`/urun/${product.slug}`}
                      aria-label={`${product.name} ilanını görüntüle`}
                      className="group overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200">
                        <Image
                          src={product.coverImage}
                          alt={`${product.name} görseli`}
                          fill
                          priority={
                            productIndex < 4
                          }
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />

                        <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
                          {category.label}
                        </span>

                        {product.cardTag ? (
                          <span
                            data-nosnippet
                            className="absolute right-2 top-2 max-w-[56%] rounded-full bg-fuchsia-600 px-2.5 py-1 text-center text-[9px] font-black leading-tight text-white shadow-lg sm:text-[10px]"
                          >
                            {product.cardTag}
                          </span>
                        ) : null}
                      </div>

                      <div className="p-4">
                        <h3 className="line-clamp-1 text-sm font-black text-neutral-950">
                          {product.name}
                        </h3>

                        {product.shortDescription ? (
                          <p
                            data-nosnippet
                            className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-500"
                          >
                            {product.shortDescription}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs leading-5 text-neutral-400">
                            İlan ayrıntıları için karta dokunun.
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-5 py-12 text-center">
              <h3 className="text-base font-black text-neutral-900">
                Bu bölgede aktif ilan bulunmuyor
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Yeni bir ilan yayınlandığında bu sayfada otomatik olarak listelenecek. Bu sayfa, ilgisiz bölgelerdeki ilanlarla doldurulmaz.
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

        <section className="mt-10 rounded-[24px] border border-black/10 bg-white px-5 py-7 shadow-sm sm:px-7">
          <h2 className="text-xl font-black tracking-[-0.03em] text-neutral-950 sm:text-2xl">
            {region.contentTitle}
          </h2>

          <div className="mt-4 grid gap-4 text-sm leading-7 text-neutral-600 md:grid-cols-2">
            {region.contentParagraphs.map(
              (paragraph) => (
                <p key={paragraph}>
                  {paragraph}
                </p>
              ),
            )}
          </div>

          <ul className="mt-5 grid gap-2 sm:grid-cols-3">
            {region.selectionHighlights.map(
              (highlight) => (
                <li
                  key={highlight}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-bold leading-5 text-neutral-700"
                >
                  {highlight}
                </li>
              ),
            )}
          </ul>
        </section>

        {relatedRegions.length > 0 ? (
          <section
            aria-labelledby="related-regions-title"
            className="mt-7 rounded-[24px] border border-black/10 bg-white px-5 py-6 shadow-sm sm:px-7"
          >
            <h2
              id="related-regions-title"
              className="text-lg font-black text-neutral-950"
            >
              Yakındaki diğer bölge sayfaları
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {relatedRegions.map(
                (relatedRegion) => (
                  <Link
                    key={relatedRegion.slug}
                    href={`/bolge/${relatedRegion.slug}`}
                    className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs font-bold text-fuchsia-700 transition hover:border-fuchsia-400 hover:bg-fuchsia-100"
                  >
                    {relatedRegion.name}
                  </Link>
                ),
              )}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-black/[0.06] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-center sm:flex-row sm:text-left xl:max-w-[1500px]">
          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} {siteConfig.name}
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="text-xs font-semibold text-neutral-500 transition hover:text-neutral-950"
            >
              Ana sayfa
            </Link>
            <Link
              href="/iletisim"
              className="text-xs font-semibold text-neutral-500 transition hover:text-neutral-950"
            >
              İletişim
            </Link>
            <Link
              href="/ilan-yayinlama-kurallari"
              className="text-xs font-semibold text-neutral-500 transition hover:text-neutral-950"
            >
              İlan kuralları
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
