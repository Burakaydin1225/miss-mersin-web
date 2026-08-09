import type { NextConfig } from "next";

import { getRequiredEnv, getRequiredEnvUrl } from "./src/lib/env";

const siteUrl = getRequiredEnvUrl("NEXT_PUBLIC_SITE_URL");
const canonicalHost = siteUrl.hostname;
const legacyDomain = getRequiredEnv("R2_LEGACY_DOMAIN");
const mediaUrl = getRequiredEnvUrl("R2_PUBLIC_URL");
const mediaHost = mediaUrl.hostname;

const remotePatterns = [
  {
    protocol: "https" as const,
    hostname: "images.unsplash.com",
    port: "",
    pathname: "/**",
  } as const,
  {
    protocol: "https" as const,
    hostname: mediaHost,
    port: "",
    pathname: "/**",
  } as const,
] satisfies NonNullable<NextConfig["images"]>["remotePatterns"];

const noIndexHeaders = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,

  images: {
    /**
     * Vercel Image Transformations limitinin dolmaması için
     * Next.js image optimization kapalı.
     *
     * Görseller direkt R2 / dış kaynak üzerinden servis edilir.
     */
    unoptimized: true,

    /**
     * next/image dış görselleri doğrulamaya devam eder.
     * Bu yüzden remotePatterns kalmalı.
     */
    remotePatterns,
  },

  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: legacyDomain,
          },
        ],
        destination: `https://${canonicalHost}/:path*`,
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: `www.${legacyDomain}`,
          },
        ],
        destination: `https://${canonicalHost}/:path*`,
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/panel/:path*",
        headers: noIndexHeaders,
      },
      {
        source: "/yonetici-giris",
        headers: noIndexHeaders,
      },
      {
        source: "/api/:path*",
        headers: noIndexHeaders,
      },
    ];
  },
};

export default nextConfig;
