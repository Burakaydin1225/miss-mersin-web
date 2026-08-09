import type { Metadata } from "next";
import { cache } from "react";

import prisma from "@/lib/prisma";
import {
  absoluteUrl,
  createSeoDescription,
  serializeJsonLd,
  siteConfig,
} from "@/lib/site-config";

type ProductSeoLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
};

const getProductForSeo = cache(
  async (slug: string) => {
    const now = new Date();

    return prisma.product.findFirst({
      where: {
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
      },

      select: {
        name: true,
        slug: true,
        shortDescription: true,
        description: true,
        coverImage: true,
        createdAt: true,
        updatedAt: true,
        images: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            imageUrl: true,
          },
          take: 5,
        },
      },
    });
  },
);

export async function generateMetadata({
  params,
}: Omit<
  ProductSeoLayoutProps,
  "children"
>): Promise<Metadata> {
  const { slug } = await params;
  const product =
    await getProductForSeo(slug);

  if (!product) {
    return {
      title: "İlan bulunamadı",
      robots: {
        index: false,
        follow: false,
        noarchive: true,
      },
    };
  }

  const description =
    createSeoDescription(
      product.shortDescription ||
        product.description,
      `${product.name} escort ilanının detaylarını ve görsellerini inceleyin.`,
    );

  const canonicalPath =
    `/urun/${product.slug}`;

  const images = [
    product.coverImage,
    ...product.images.map(
      (image) => image.imageUrl,
    ),
  ].filter(
    (imageUrl): imageUrl is string =>
      Boolean(imageUrl),
  ).filter(
    (imageUrl, index, allImages) =>
      allImages.indexOf(imageUrl) === index,
  );

  return {
    title: product.name,
    description,

    alternates: {
      canonical: canonicalPath,
    },

    openGraph: {
      type: "article",
      locale: "tr_TR",
      url: absoluteUrl(canonicalPath),
      siteName: siteConfig.name,
      title: product.name,
      description,
      publishedTime:
        product.createdAt.toISOString(),
      modifiedTime:
        product.updatedAt.toISOString(),
      images: images.map((imageUrl) => ({
        url: imageUrl,
        alt: `${product.name} escort ilanı`,
      })),
    },

    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images,
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
  };
}

export default async function ProductSeoLayout({
  children,
  params,
}: ProductSeoLayoutProps) {
  const { slug } = await params;
  const product =
    await getProductForSeo(slug);

  if (!product) {
    return children;
  }

  const canonicalUrl = absoluteUrl(
    `/urun/${product.slug}`,
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
        name: product.name,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbJsonLd,
          ),
        }}
      />

      {children}
    </>
  );
}