import { AnalyticsEventType } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

const MINUTE_IN_MS = 60 * 1_000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;

const RAW_ANALYTICS_RETENTION_DAYS = 7;
const DAILY_ANALYTICS_RETENTION_DAYS = 90;
const DEFAULT_ACTIVE_SESSION_RETENTION_HOURS = 24;
const DEFAULT_TIMEZONE_OFFSET_MINUTES = 180;
const DEFAULT_ROLLUP_DAYS = 7;
const MAX_ROLLUP_DAYS = 30;

type RawAggregateRow = {
  eventType: string;
  productId: string | null;
  eventCount: number;
  uniqueVisitors: number;
};

type SummarizedDayResult = {
  date: string;
  summaryRows: number;
  sourceEvents: number;
};

type RunAnalyticsMaintenanceOptions = {
  date?: string;
  days?: number;
};

export class AnalyticsMaintenanceInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsMaintenanceInputError";
  }
}

function readIntegerEnvironmentValue(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    console.warn(
      `${name} geçersiz. Varsayılan değer kullanılacak: ${fallback}`,
    );

    return fallback;
  }

  return parsedValue;
}

function getTimezoneOffsetMinutes(): number {
  return readIntegerEnvironmentValue(
    "ANALYTICS_TIMEZONE_OFFSET_MINUTES",
    DEFAULT_TIMEZONE_OFFSET_MINUTES,
    -720,
    840,
  );
}

function getActiveSessionRetentionHours(): number {
  return readIntegerEnvironmentValue(
    "ANALYTICS_ACTIVE_SESSION_RETENTION_HOURS",
    DEFAULT_ACTIVE_SESSION_RETENTION_HOURS,
    1,
    720,
  );
}

function formatUtcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isValid ? date : null;
}

function requireDateKey(value: string): Date {
  const date = parseDateKey(value);

  if (!date) {
    throw new AnalyticsMaintenanceInputError(
      "Tarih YYYY-MM-DD biçiminde olmalıdır.",
    );
  }

  return date;
}

function addDays(dateKey: string, amount: number): string {
  const date = requireDateKey(dateKey);

  date.setUTCDate(date.getUTCDate() + amount);

  return formatUtcDateKey(date);
}

function getCurrentLocalDateKey(): string {
  const timezoneOffsetMinutes = getTimezoneOffsetMinutes();

  const shiftedDate = new Date(
    Date.now() + timezoneOffsetMinutes * MINUTE_IN_MS,
  );

  return formatUtcDateKey(shiftedDate);
}

function getPreviousCompleteDateKeys(numberOfDays: number): string[] {
  const currentLocalDate = getCurrentLocalDateKey();

  const yesterday = addDays(currentLocalDate, -1);

  const dateKeys: string[] = [];

  for (let dayIndex = numberOfDays - 1; dayIndex >= 0; dayIndex -= 1) {
    dateKeys.push(addDays(yesterday, -dayIndex));
  }

  return dateKeys;
}

function getUtcRangeForLocalDate(dateKey: string): {
  dateValue: Date;
  startAt: Date;
  endAt: Date;
} {
  const dateValue = requireDateKey(dateKey);

  const timezoneOffsetMinutes = getTimezoneOffsetMinutes();

  const startAt = new Date(
    dateValue.getTime() - timezoneOffsetMinutes * MINUTE_IN_MS,
  );

  const endAt = new Date(startAt.getTime() + DAY_IN_MS);

  return {
    dateValue,
    startAt,
    endAt,
  };
}

function isSupportedEventType(value: string): value is AnalyticsEventType {
  return (
    value === AnalyticsEventType.PAGE_VIEW ||
    value === AnalyticsEventType.PRODUCT_VIEW ||
    value === AnalyticsEventType.WHATSAPP_CLICK
  );
}

async function summarizeAnalyticsDate(
  dateKey: string,
): Promise<SummarizedDayResult> {
  const { dateValue, startAt, endAt } = getUtcRangeForLocalDate(dateKey);

  const rawRows = await prisma.$queryRaw<RawAggregateRow[]>`
      SELECT
        "eventType"::text AS "eventType",
        "productId" AS "productId",
        COUNT(*)::int AS "eventCount",
        COUNT(DISTINCT "visitorHash")::int
          AS "uniqueVisitors"
      FROM "AnalyticsEvent"
      WHERE
        "createdAt" >= ${startAt}
        AND "createdAt" < ${endAt}
      GROUP BY
        "eventType",
        "productId"
    `;

  const aggregateRows = rawRows.filter((row) =>
    isSupportedEventType(row.eventType),
  );

  const productIds = Array.from(
    new Set(
      aggregateRows
        .map((row) => row.productId)
        .filter((productId): productId is string => Boolean(productId)),
    ),
  );

  const products =
    productIds.length > 0
      ? await prisma.product.findMany({
          where: {
            id: {
              in: productIds,
            },
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

  const productNameById = new Map(
    products.map((product) => [product.id, product.name]),
  );

  const summaryData = aggregateRows.map((row) => ({
    date: dateValue,
    eventType: row.eventType as AnalyticsEventType,
    scopeKey: row.productId ? `product:${row.productId}` : "global",
    productId: row.productId,
    productName: row.productId
      ? (productNameById.get(row.productId) ?? null)
      : null,
    eventCount: Number(row.eventCount),
    uniqueVisitors: Number(row.uniqueVisitors),
  }));

  await prisma.$transaction(async (transaction) => {
    /*
     * Aynı gün tekrar özetlenirse eski sonuçlar
     * tamamen silinip yeniden oluşturulur.
     */
    await transaction.dailyAnalytics.deleteMany({
      where: {
        date: dateValue,
      },
    });

    if (summaryData.length > 0) {
      await transaction.dailyAnalytics.createMany({
        data: summaryData,
      });
    }
  });

  const sourceEvents = summaryData.reduce(
    (total, row) => total + row.eventCount,
    0,
  );

  return {
    date: dateKey,
    summaryRows: summaryData.length,
    sourceEvents,
  };
}

function resolveDatesToProcess(
  options: RunAnalyticsMaintenanceOptions,
): string[] {
  if (options.date) {
    requireDateKey(options.date);

    const currentLocalDate = getCurrentLocalDateKey();

    if (options.date > currentLocalDate) {
      throw new AnalyticsMaintenanceInputError(
        "Gelecekteki bir tarih özetlenemez.",
      );
    }

    return [options.date];
  }

  const numberOfDays = options.days ?? DEFAULT_ROLLUP_DAYS;

  if (
    !Number.isInteger(numberOfDays) ||
    numberOfDays < 1 ||
    numberOfDays > MAX_ROLLUP_DAYS
  ) {
    throw new AnalyticsMaintenanceInputError(
      `Gün sayısı 1 ile ${MAX_ROLLUP_DAYS} arasında olmalıdır.`,
    );
  }

  return getPreviousCompleteDateKeys(numberOfDays);
}

export async function runAnalyticsMaintenance(
  options: RunAnalyticsMaintenanceOptions = {},
) {
  const dateKeys = resolveDatesToProcess(options);

  const summarizedDays: SummarizedDayResult[] = [];

  /*
   * Veritabanına ani yük bindirmemek için
   * günleri sırayla özetliyoruz.
   */
  for (const dateKey of dateKeys) {
    const result = await summarizeAnalyticsDate(dateKey);

    summarizedDays.push(result);
  }

  const retentionDays = RAW_ANALYTICS_RETENTION_DAYS;

  const activeSessionRetentionHours = getActiveSessionRetentionHours();

  /*
   * Bugün dahil son 7 yerel takvim gününü koru.
   * Saat bazlı "7 x 24 saat" hesabı günün ilk saatlerini
   * erken silebildiği için kesim Türkiye gün başlangıcından yapılır.
   */
  const oldestRetainedDateKey = addDays(
    getCurrentLocalDateKey(),
    -(retentionDays - 1),
  );

  const oldestDailyAnalyticsDateKey = addDays(
    getCurrentLocalDateKey(),
    -(DAILY_ANALYTICS_RETENTION_DAYS - 1),
  );

  const { startAt: rawEventCutoff } =
    getUtcRangeForLocalDate(oldestRetainedDateKey);

  const { dateValue: oldestDailyAnalyticsDate } =
    getUtcRangeForLocalDate(oldestDailyAnalyticsDateKey);

  const activeSessionCutoff = new Date(
    Date.now() - activeSessionRetentionHours * HOUR_IN_MS,
  );

  const [deletedAnalyticsEvents, deletedDailyAnalytics, deletedActiveSessions] =
    await prisma.$transaction([
      prisma.analyticsEvent.deleteMany({
        where: {
          createdAt: {
            lt: rawEventCutoff,
          },
        },
      }),

      prisma.dailyAnalytics.deleteMany({
        where: {
          date: {
            lt: oldestDailyAnalyticsDate,
          },
        },
      }),

      prisma.activeSession.deleteMany({
        where: {
          lastSeenAt: {
            lt: activeSessionCutoff,
          },
        },
      }),
    ]);

  return {
    ok: true,
    timezoneOffsetMinutes: getTimezoneOffsetMinutes(),
    retentionDays,
    dailyAnalyticsRetentionDays: DAILY_ANALYTICS_RETENTION_DAYS,
    activeSessionRetentionHours,
    summarizedDays,
    deleted: {
      analyticsEvents: deletedAnalyticsEvents.count,
      dailyAnalytics: deletedDailyAnalytics.count,
      activeSessions: deletedActiveSessions.count,
    },
  };
}
