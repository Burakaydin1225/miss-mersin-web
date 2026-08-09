import { productRegions } from "./product-regions";

const DEFAULT_SITE_URL = "https://www.beylikduzu25.com";

function normalizeSiteUrl(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return DEFAULT_SITE_URL;
  }

  const withProtocol =
    trimmedValue.startsWith("http://") || trimmedValue.startsWith("https://")
      ? trimmedValue
      : `https://${trimmedValue}`;

  try {
    const parsedUrl = new URL(withProtocol);

    if (
      parsedUrl.hostname === "beylikduzu24.com" ||
      parsedUrl.hostname === "www.beylikduzu24.com"
    ) {
      parsedUrl.hostname = "www.beylikduzu25.com";
    }

    if (
      parsedUrl.hostname !== "localhost" &&
      parsedUrl.hostname !== "127.0.0.1"
    ) {
      parsedUrl.protocol = "https:";
    }

    parsedUrl.pathname = "";
    parsedUrl.search = "";
    parsedUrl.hash = "";

    return parsedUrl.toString().replace(/\/+$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}

const resolvedSiteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL,
);

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Miss İstanbul",

  shortName: process.env.NEXT_PUBLIC_SITE_SHORT_NAME?.trim() || "Miss İstanbul",

  url: resolvedSiteUrl,

  homeTitle: "Beylikdüzü Escort İlanları | Miss İstanbul",

  homeHeading: "Beylikdüzü Escort İlanları",

  description:
    "Beylikdüzü escort ilanlarını VIP, Premium ve Gold kategorilerinde inceleyin. Güncel profil, bölge ve iletişim detayları Miss İstanbul'da.",

  homeIntro:
    "Beylikdüzü başta olmak üzere Avcılar, Esenyurt ve çevre bölgelerdeki güncel ilanları kategori ve bölge seçenekleriyle inceleyin.",

  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "",

  contactWhatsapp:
    process.env.NEXT_PUBLIC_CONTACT_WHATSAPP?.trim() || "05344385541",
} as const;

export function absoluteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${siteConfig.url}${normalizedPath}`;
}

export function createSeoDescription(
  value: string | null | undefined,
  fallback: string = siteConfig.description,
): string {
  const normalizedValue = (value ?? "").replace(/\s+/g, " ").trim();

  if (!normalizedValue) {
    return fallback;
  }

  if (normalizedValue.length <= 155) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, 152).trimEnd()}...`;
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export const seoRegions = productRegions;

export type SeoRegion = (typeof seoRegions)[number];

export function getSeoRegionBySlug(slug: string): SeoRegion | null {
  return seoRegions.find((region) => region.slug === slug) ?? null;
}
