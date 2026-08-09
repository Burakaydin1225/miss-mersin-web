export type PublicAnalyticsEventType =
  | "PAGE_VIEW"
  | "PRODUCT_VIEW"
  | "WHATSAPP_CLICK"
  | "HEARTBEAT";

type TrackAnalyticsOptions = {
  eventType: PublicAnalyticsEventType;
  path?: string;
  productId?: string;
  metadata?: Record<string, unknown>;
};

const visitorStorageKey =
  "catalog_analytics_visitor_id";

const sessionStorageKey =
  "catalog_analytics_session_id";

let temporaryVisitorId: string | null = null;
let temporarySessionId: string | null = null;

function createClientId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function getVisitorId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const existingId =
      window.localStorage.getItem(
        visitorStorageKey,
      );

    if (existingId) {
      return existingId;
    }

    const newId = createClientId();

    window.localStorage.setItem(
      visitorStorageKey,
      newId,
    );

    return newId;
  } catch {
    if (!temporaryVisitorId) {
      temporaryVisitorId = createClientId();
    }

    return temporaryVisitorId;
  }
}

function getSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const existingId =
      window.sessionStorage.getItem(
        sessionStorageKey,
      );

    if (existingId) {
      return existingId;
    }

    const newId = createClientId();

    window.sessionStorage.setItem(
      sessionStorageKey,
      newId,
    );

    return newId;
  } catch {
    if (!temporarySessionId) {
      temporarySessionId = createClientId();
    }

    return temporarySessionId;
  }
}

function getTrafficSource(): string {
  if (typeof window === "undefined") {
    return "direct";
  }

  const currentUrl = new URL(
    window.location.href,
  );

  const utmSource =
    currentUrl.searchParams.get("utm_source");

  if (utmSource) {
    return utmSource.slice(0, 250);
  }

  if (!document.referrer) {
    return "direct";
  }

  try {
    const referrerUrl = new URL(
      document.referrer,
    );

    if (
      referrerUrl.hostname ===
      window.location.hostname
    ) {
      return "internal";
    }

    return referrerUrl.hostname.slice(0, 250);
  } catch {
    return "referral";
  }
}

export function isPublicAnalyticsPath(
  path: string,
): boolean {
  return (
    !path.startsWith("/panel") &&
    !path.startsWith("/yonetici-giris") &&
    !path.startsWith("/api")
  );
}

export function hasTrackedSessionEvent(
  key: string,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const storageKey =
      `catalog_analytics_event:${key}`;

    const alreadyTracked =
      window.sessionStorage.getItem(
        storageKey,
      );

    if (alreadyTracked) {
      return true;
    }

    window.sessionStorage.setItem(
      storageKey,
      "1",
    );

    return false;
  } catch {
    return false;
  }
}

export async function trackAnalyticsEvent({
  eventType,
  path,
  productId,
  metadata,
}: TrackAnalyticsOptions): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const currentPath =
    path ||
    `${window.location.pathname}${window.location.search}`;

  if (!isPublicAnalyticsPath(currentPath)) {
    return;
  }

  const visitorId = getVisitorId();
  const sessionId = getSessionId();

  if (!visitorId || !sessionId) {
    return;
  }

  const requestBody = {
    eventType,
    visitorId,
    sessionId,
    path: currentPath,
    productId,
    source: getTrafficSource(),
    referrer: document.referrer || undefined,
    metadata,
  };

  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      keepalive: true,
      cache: "no-store",
    });
  } catch {
    /*
     * Analitik isteğinin başarısız olması kullanıcının
     * sayfa deneyimini veya WhatsApp yönlendirmesini
     * engellememelidir.
     */
  }
}