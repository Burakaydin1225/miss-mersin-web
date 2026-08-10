import type { NextConfig } from "next";

const canonicalHost = "www.erdemli25.com";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
    port: "",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "media.erdemli25.com",
    port: "",
    pathname: "/**",
  },
];

const r2PublicUrl = process.env.R2_PUBLIC_URL?.trim();

if (r2PublicUrl) {
  try {
    const parsedR2Url = new URL(r2PublicUrl);

    if (parsedR2Url.hostname !== "media.erdemli24.com") {
      remotePatterns.push({
        protocol: "https",
        hostname: parsedR2Url.hostname,
        port: "",
        pathname: "/**",
      });
    }
  } catch {
    console.warn(
      "R2_PUBLIC_URL geçersiz olduğu için image remotePatterns içine eklenmedi.",
    );
  }
}

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
            value: "erdemli24.com",
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
            value: "www.erdemli24.com",
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
