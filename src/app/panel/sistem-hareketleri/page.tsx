import Link from "next/link";

import {
  Prisma,
  UserRole,
} from "@/generated/prisma/client";
import { requireOwner } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type SystemLogsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    action?: string | string[];
    user?: string | string[];
    page?: string | string[];
  }>;
};

type ActivityCategory =
  | "PRODUCT"
  | "USER"
  | "PAYMENT"
  | "SETTINGS"
  | "AUTH"
  | "OTHER";

const roleLabels: Record<UserRole, string> = {
  [UserRole.OWNER]: "Ana Yönetici",
  [UserRole.ADMIN]: "Admin",
  [UserRole.EDITOR]: "Düzenleyici",
  [UserRole.VIEWER]: "Görüntüleyici",
};

const roleBadgeClassNames: Record<
  UserRole,
  string
> = {
  [UserRole.OWNER]:
    "border-violet-200 bg-violet-50 text-violet-700",
  [UserRole.ADMIN]:
    "border-blue-200 bg-blue-50 text-blue-700",
  [UserRole.EDITOR]:
    "border-amber-200 bg-amber-50 text-amber-700",
  [UserRole.VIEWER]:
    "border-neutral-200 bg-neutral-50 text-neutral-600",
};

const actionLabels: Record<string, string> = {
  PRODUCT_CREATE: "Ürün oluşturuldu",
  PRODUCT_UPDATE: "Ürün güncellendi",
  PRODUCT_DELETE: "Ürün silindi",
  PRODUCT_AND_PAYMENTS_DELETE:
    "Ürün ve ödemeler silindi",
  PRODUCT_SUBSCRIPTION_RENEW:
    "Abonelik yenilendi",

  USER_CREATE: "Kullanıcı oluşturuldu",
  USER_UPDATE: "Kullanıcı güncellendi",
  USER_ROLE_UPDATE: "Kullanıcı rolü değiştirildi",
  USER_STATUS_UPDATE:
    "Kullanıcı durumu değiştirildi",
  USER_DELETE: "Kullanıcı silindi",
  USER_PASSWORD_RESET:
    "Kullanıcı şifresi sıfırlandı",
  USER_PASSWORD_CHANGE:
    "Hesap şifresi değiştirildi",

  PAYMENT_CREATE: "Ödeme oluşturuldu",
  PAYMENT_UPDATE: "Ödeme güncellendi",
  PAYMENT_DELETE: "Ödeme silindi",

  SETTINGS_UPDATE: "Site ayarları güncellendi",

  LOGIN_SUCCESS: "Oturum açıldı",
  LOGOUT: "Oturum kapatıldı",
};

const categoryInformation: Record<
  ActivityCategory,
  {
    label: string;
    icon: string;
    badgeClassName: string;
    iconClassName: string;
  }
> = {
  PRODUCT: {
    label: "Ürün",
    icon: "Ü",
    badgeClassName:
      "border-blue-200 bg-blue-50 text-blue-700",
    iconClassName:
      "bg-blue-50 text-blue-700",
  },
  USER: {
    label: "Kullanıcı",
    icon: "K",
    badgeClassName:
      "border-violet-200 bg-violet-50 text-violet-700",
    iconClassName:
      "bg-violet-50 text-violet-700",
  },
  PAYMENT: {
    label: "Ödeme",
    icon: "₺",
    badgeClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    iconClassName:
      "bg-emerald-50 text-emerald-700",
  },
  SETTINGS: {
    label: "Ayar",
    icon: "A",
    badgeClassName:
      "border-amber-200 bg-amber-50 text-amber-700",
    iconClassName:
      "bg-amber-50 text-amber-700",
  },
  AUTH: {
    label: "Oturum",
    icon: "O",
    badgeClassName:
      "border-cyan-200 bg-cyan-50 text-cyan-700",
    iconClassName:
      "bg-cyan-50 text-cyan-700",
  },
  OTHER: {
    label: "Diğer",
    icon: "•",
    badgeClassName:
      "border-neutral-200 bg-neutral-50 text-neutral-600",
    iconClassName:
      "bg-neutral-100 text-neutral-600",
  },
};

function readSearchParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parsePageNumber(value: string): number {
  const parsedValue = Number.parseInt(value, 10);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1
  ) {
    return 1;
  }

  return parsedValue;
}

function getActivityCategory(
  action: string,
  entityType: string,
): ActivityCategory {
  if (
    action.startsWith("PRODUCT_") ||
    entityType === "Product"
  ) {
    if (
      action.includes("PAYMENT") ||
      action.includes("SUBSCRIPTION")
    ) {
      return "PAYMENT";
    }

    return "PRODUCT";
  }

  if (
    action.startsWith("USER_") ||
    entityType === "User"
  ) {
    return "USER";
  }

  if (
    action.startsWith("PAYMENT_") ||
    entityType === "ProductPayment"
  ) {
    return "PAYMENT";
  }

  if (
    action.startsWith("SETTINGS_") ||
    entityType === "SiteSettings"
  ) {
    return "SETTINGS";
  }

  if (
    action.includes("LOGIN") ||
    action.includes("LOGOUT") ||
    entityType === "Session"
  ) {
    return "AUTH";
  }

  return "OTHER";
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function formatShortDateTime(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(
    value,
  );
}

function getIstanbulDayStart(): Date {
  const dateParts =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

  const year = Number(
    dateParts.find(
      (part) => part.type === "year",
    )?.value,
  );

  const month = Number(
    dateParts.find(
      (part) => part.type === "month",
    )?.value,
  );

  const day = Number(
    dateParts.find(
      (part) => part.type === "day",
    )?.value,
  );

  /*
   * Türkiye yıl boyunca UTC+3 kullandığı için
   * İstanbul'daki 00:00 anı UTC'de bir önceki
   * günün 21:00 saatine karşılık gelir.
   */
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      -3,
      0,
      0,
      0,
    ),
  );
}

function getActionLabel(action: string): string {
  return (
    actionLabels[action] ??
    action
      .toLocaleLowerCase("tr-TR")
      .split("_")
      .map((part) => {
        if (!part) {
          return "";
        }

        return (
          part.charAt(0).toLocaleUpperCase("tr-TR") +
          part.slice(1)
        );
      })
      .join(" ")
  );
}

function serializeChanges(
  value: unknown,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function createPageUrl({
  q,
  action,
  user,
  page,
}: {
  q: string;
  action: string;
  user: string;
  page: number;
}): string {
  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (action) {
    params.set("action", action);
  }

  if (user) {
    params.set("user", user);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString
    ? `/panel/sistem-hareketleri?${queryString}`
    : "/panel/sistem-hareketleri";
}

export default async function SystemLogsPage({
  searchParams,
}: SystemLogsPageProps) {
  await requireOwner();

  const resolvedSearchParams =
    await searchParams;

  const q = readSearchParam(
    resolvedSearchParams.q,
  ).trim();

  const selectedAction = readSearchParam(
    resolvedSearchParams.action,
  ).trim();

  const selectedUserId = readSearchParam(
    resolvedSearchParams.user,
  ).trim();

  const requestedPage = parsePageNumber(
    readSearchParam(
      resolvedSearchParams.page,
    ),
  );

  const where: Prisma.AuditLogWhereInput = {
    ...(q
      ? {
          OR: [
            {
              description: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              action: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              actorName: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              actorEmail: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),

    ...(selectedAction
      ? {
          action: selectedAction,
        }
      : {}),

    ...(selectedUserId
      ? {
          userId: selectedUserId,
        }
      : {}),
  };

  const [
    totalLogs,
    totalAllLogs,
    users,
    actionRows,
    todayLogCount,
    productLogCount,
    userLogCount,
  ] = await Promise.all([
    prisma.auditLog.count({
      where,
    }),

    prisma.auditLog.count(),

    prisma.user.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    }),

    prisma.auditLog.findMany({
      distinct: ["action"],
      orderBy: {
        action: "asc",
      },
      select: {
        action: true,
      },
    }),

    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: getIstanbulDayStart(),
        },
      },
    }),

    prisma.auditLog.count({
      where: {
        entityType: "Product",
      },
    }),

    prisma.auditLog.count({
      where: {
        entityType: "User",
      },
    }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalLogs / PAGE_SIZE),
  );

  const currentPage = Math.min(
    requestedPage,
    totalPages,
  );

  const logs =
    await prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip:
        (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

  const firstVisibleLog =
    totalLogs === 0
      ? 0
      : (currentPage - 1) *
          PAGE_SIZE +
        1;

  const lastVisibleLog = Math.min(
    currentPage * PAGE_SIZE,
    totalLogs,
  );

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-4xl">
              Sistem Hareketleri
            </h1>

            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-violet-700">
              Yalnızca Ana Yönetici
            </span>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
            Ürün, kullanıcı, abonelik, ödeme ve
            yönetim işlemlerini yapan kişiyle
            birlikte buradan takip edebilirsiniz.
          </p>
        </div>

        <Link
          href="/panel"
          className="flex h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Genel bakışa dön
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Toplam hareket"
          value={formatNumber(
            totalAllLogs,
          )}
          description="Tüm zamanlar"
          icon="T"
          iconClassName="bg-neutral-100 text-neutral-700"
        />

        <SummaryCard
          label="Bugünkü hareket"
          value={formatNumber(
            todayLogCount,
          )}
          description="Bugün kaydedilen işlemler"
          icon="B"
          iconClassName="bg-blue-50 text-blue-700"
        />

        <SummaryCard
          label="Ürün hareketleri"
          value={formatNumber(
            productLogCount,
          )}
          description="Ürün kayıtları"
          icon="Ü"
          iconClassName="bg-emerald-50 text-emerald-700"
        />

        <SummaryCard
          label="Kullanıcı hareketleri"
          value={formatNumber(
            userLogCount,
          )}
          description="Kullanıcı işlemleri"
          icon="K"
          iconClassName="bg-violet-50 text-violet-700"
        />
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Kayıtları filtrele
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Açıklama, kullanıcı veya işlem türüne
            göre arama yapın.
          </p>
        </div>

        <form
          method="get"
          className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px_240px_auto]"
        >
          <div>
            <label
              htmlFor="q"
              className="text-xs font-medium text-neutral-600"
            >
              Arama
            </label>

            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Ürün, kullanıcı, açıklama..."
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950"
            />
          </div>

          <div>
            <label
              htmlFor="action"
              className="text-xs font-medium text-neutral-600"
            >
              İşlem türü
            </label>

            <select
              id="action"
              name="action"
              defaultValue={selectedAction}
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-950"
            >
              <option value="">
                Tüm işlemler
              </option>

              {actionRows.map((row) => (
                <option
                  key={row.action}
                  value={row.action}
                >
                  {getActionLabel(row.action)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="user"
              className="text-xs font-medium text-neutral-600"
            >
              İşlemi yapan
            </label>

            <select
              id="user"
              name="user"
              defaultValue={selectedUserId}
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-950"
            >
              <option value="">
                Tüm kullanıcılar
              </option>

              {users.map((user) => (
                <option
                  key={user.id}
                  value={user.id}
                >
                  {user.name} ·{" "}
                  {roleLabels[user.role]}
                  {!user.isActive
                    ? " · Pasif"
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex h-11 flex-1 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Filtrele
            </button>

            <Link
              href="/panel/sistem-hareketleri"
              className="flex h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
            >
              Temizle
            </Link>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-black/[0.05]">
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">
              Hareket geçmişi
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {totalLogs > 0
                ? `${formatNumber(
                    firstVisibleLog,
                  )}–${formatNumber(
                    lastVisibleLog,
                  )} arası gösteriliyor`
                : "Filtrelere uygun kayıt bulunamadı"}
            </p>
          </div>

          <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-500">
            {formatNumber(totalLogs)} kayıt
          </span>
        </div>

        {logs.length > 0 ? (
          <div className="divide-y divide-neutral-100">
            {logs.map((log) => {
              const category =
                getActivityCategory(
                  log.action,
                  log.entityType,
                );

              const information =
                categoryInformation[category];

              const actorName =
                log.actorName ??
                log.user?.name ??
                "Bilinmeyen kullanıcı";

              const actorEmail =
                log.actorEmail ??
                log.user?.email ??
                null;

              const actorRole =
                log.actorRole ??
                log.user?.role ??
                null;

              const serializedChanges =
                serializeChanges(log.changes);

              return (
                <article
                  key={log.id}
                  className="px-5 py-5 transition hover:bg-neutral-50/60 sm:px-7"
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${information.iconClassName}`}
                    >
                      {information.icon}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-neutral-950">
                              {getActionLabel(
                                log.action,
                              )}
                            </h3>

                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${information.badgeClassName}`}
                            >
                              {information.label}
                            </span>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-neutral-600">
                            {log.description}
                          </p>
                        </div>

                        <time
                          dateTime={log.createdAt.toISOString()}
                          title={formatDateTime(
                            log.createdAt,
                          )}
                          className="shrink-0 text-xs text-neutral-400"
                        >
                          {formatShortDateTime(
                            log.createdAt,
                          )}
                        </time>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-700">
                          {actorName}
                        </span>

                        {actorRole ? (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${roleBadgeClassNames[actorRole]}`}
                          >
                            {roleLabels[actorRole]}
                          </span>
                        ) : null}

                        {actorEmail ? (
                          <span className="text-xs text-neutral-400">
                            {actorEmail}
                          </span>
                        ) : null}

                        <span className="text-xs text-neutral-300">
                          •
                        </span>

                        <span className="text-xs text-neutral-400">
                          {log.entityType}
                          {log.entityId
                            ? ` · ${log.entityId}`
                            : ""}
                        </span>
                      </div>

                      {serializedChanges ? (
                        <details className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-neutral-600">
                            <span>
                              Değişiklik ayrıntıları
                            </span>

                            <span className="text-neutral-400">
                              JSON
                            </span>
                          </summary>

                          <div className="border-t border-neutral-100 bg-neutral-950 p-4">
                            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-neutral-200">
                              {serializedChanges}
                            </pre>
                          </div>
                        </details>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-16 text-center sm:px-7">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-neutral-100 text-lg font-bold text-neutral-500">
              0
            </span>

            <p className="mt-4 text-sm font-semibold text-neutral-800">
              Hareket kaydı bulunamadı
            </p>

            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Filtreleri temizleyin veya sistemde
              yeni işlem yapılmasını bekleyin.
            </p>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex flex-col gap-3 border-t border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-xs text-neutral-400">
              Sayfa {currentPage} / {totalPages}
            </p>

            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link
                  href={createPageUrl({
                    q,
                    action: selectedAction,
                    user: selectedUserId,
                    page: currentPage - 1,
                  })}
                  className="flex h-10 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50"
                >
                  Önceki
                </Link>
              ) : (
                <span className="flex h-10 cursor-not-allowed items-center justify-center rounded-xl border border-neutral-100 bg-neutral-50 px-4 text-xs font-semibold text-neutral-300">
                  Önceki
                </span>
              )}

              {currentPage < totalPages ? (
                <Link
                  href={createPageUrl({
                    q,
                    action: selectedAction,
                    user: selectedUserId,
                    page: currentPage + 1,
                  })}
                  className="flex h-10 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50"
                >
                  Sonraki
                </Link>
              ) : (
                <span className="flex h-10 cursor-not-allowed items-center justify-center rounded-xl border border-neutral-100 bg-neutral-50 px-4 text-xs font-semibold text-neutral-300">
                  Sonraki
                </span>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  icon: string;
  iconClassName: string;
};

function SummaryCard({
  label,
  value,
  description,
  icon,
  iconClassName,
}: SummaryCardProps) {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-500">
            {label}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
            {value}
          </p>

          <p className="mt-2 text-xs text-neutral-400">
            {description}
          </p>
        </div>

        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${iconClassName}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}