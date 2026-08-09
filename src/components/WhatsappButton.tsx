"use client";

import type {
  ComponentPropsWithoutRef,
  MouseEvent,
} from "react";

import { trackAnalyticsEvent } from "@/lib/analytics-client";
import { trackWhatsappClick } from "@/lib/analytics";

type WhatsappButtonProps = Omit<
  ComponentPropsWithoutRef<"a">,
  "href"
> & {
  href: string;
  productId: string;
  productName?: string;
};

export function WhatsappButton({
  href,
  productId,
  productName,
  target = "_blank",
  rel = "noopener noreferrer",
  onClick,
  children,
  ...anchorProps
}: WhatsappButtonProps) {
  function handleClick(
    event: MouseEvent<HTMLAnchorElement>,
  ) {
    void trackAnalyticsEvent({
      eventType: "WHATSAPP_CLICK",
      path: window.location.pathname,
      productId,
      metadata: productName
        ? {
            productName,
          }
        : undefined,
    });

    trackWhatsappClick({
      productId,
    });

    onClick?.(event);
  }

  return (
    <a
      {...anchorProps}
      href={href}
      target={target}
      rel={rel}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}