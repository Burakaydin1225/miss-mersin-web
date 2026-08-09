"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
} from "react";

const gaMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

type GtagWindow = Window & {
  gtag?: (
    command: "config" | "event" | "js",
    targetIdOrEventName: string | Date,
    parameters?: Record<
      string,
      string | number | boolean | null | undefined
    >,
  ) => void;
};

export function GoogleAnalytics() {
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(
    null,
  );

  useEffect(() => {
    if (
      !gaMeasurementId ||
      typeof window === "undefined"
    ) {
      return;
    }

    const currentPath =
      window.location.pathname +
      window.location.search;

    if (previousPathRef.current === null) {
      previousPathRef.current = currentPath;
      return;
    }

    if (previousPathRef.current === currentPath) {
      return;
    }

    previousPathRef.current = currentPath;

    const gtagWindow = window as GtagWindow;

    if (typeof gtagWindow.gtag !== "function") {
      return;
    }

    gtagWindow.gtag("config", gaMeasurementId, {
      page_path: currentPath,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  if (!gaMeasurementId) {
    return null;
  }

  return (
    <>
      <Script
        id="google-analytics-script"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
        strategy="afterInteractive"
      />

      <Script
        id="google-analytics-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = window.gtag || gtag;
            gtag('js', new Date());
            gtag('config', '${gaMeasurementId}', {
              page_path: window.location.pathname + window.location.search,
              page_location: window.location.href,
              page_title: document.title
            });
          `,
        }}
      />
    </>
  );
}