import type { MetadataRoute } from "next";

import { productBelongsToRegion } from "@/lib/product-regions";
import prisma from "@/lib/prisma";
import { absoluteUrl, seoRegions } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const products = await prisma.product.findMany({
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
    select: {
      slug: true,
      createdAt: true,
      updatedAt: true,
      name: true,
      shortDescription: true,
      description: true,
      cardTag: true,
      region: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const latestListingDate = products[0]?.updatedAt;

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: latestListingDate,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/hakkimizda"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/iletisim"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/ilan-yayinlama-kurallari"),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/gizlilik-politikasi"),
      changeFrequency: "yearly",
      priority: 0.25,
    },
    {
      url: absoluteUrl("/kullanim-kosullari"),
      changeFrequency: "yearly",
      priority: 0.25,
    },
  ];

  const regionRoutes: MetadataRoute.Sitemap = seoRegions
    .filter((region) =>
      products.some((product) => productBelongsToRegion(product, region)),
    )
    .map((region) => ({
      url: absoluteUrl(`/bolge/${region.slug}`),
      lastModified: latestListingDate,
      changeFrequency: "daily",
      priority: 0.8,
    }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/urun/${product.slug}`),
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...regionRoutes, ...productRoutes];
}
