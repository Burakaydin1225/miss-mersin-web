import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site-config";

export const runtime = "edge";

export const alt =
  "Escort ilanları";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          color: "white",
          background:
            "radial-gradient(circle at 15% 10%, rgba(217,70,239,.48), transparent 34%), radial-gradient(circle at 90% 90%, rgba(34,211,238,.38), transparent 34%), #050505",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 700,
            color: "#f5b8ff",
          }}
        >
          {siteConfig.name}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 960,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 66,
              lineHeight: 1.05,
              fontWeight: 900,
              letterSpacing: "-2px",
            }}
          >
            Escort bulun
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 28,
              lineHeight: 1.35,
              color: "rgba(255,255,255,.72)",
            }}
          >
            Escort ilanları
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: "rgba(255,255,255,.56)",
          }}
        >
          Mersin geneli · Doğrudan iletişim · Güncel ilanlar
        </div>
      </div>
    ),
    size,
  );
}
