type GtagEventParameters = Record<
  string,
  string | number | boolean | null | undefined
>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: "config" | "event" | "js",
      targetIdOrEventName: string | Date,
      parameters?: GtagEventParameters,
    ) => void;
  }
}

function canTrack(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.gtag === "function"
  );
}

export function trackEvent(
  eventName: string,
  parameters: GtagEventParameters = {},
): void {
  if (!canTrack()) {
    return;
  }

  window.gtag?.("event", eventName, {
    ...parameters,
  });
}

export function trackWhatsappClick(input: {
  productId?: string;
}): void {
  trackEvent("whatsapp_click", {
    method: "whatsapp",
    product_id: input.productId,
  });
}