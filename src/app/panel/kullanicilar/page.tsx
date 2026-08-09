import { UserCreateForm } from "@/app/panel/kullanicilar/UserCreateForm";
import { UserActions } from "@/app/panel/kullanicilar/UserActions";
import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

const roleOrder: Record<UserRole, number> = {
  [UserRole.OWNER]: 0,
  [UserRole.ADMIN]: 1,
  [UserRole.EDITOR]: 2,
  [UserRole.VIEWER]: 3,
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

export default async function UsersPage() {
  const currentUser = await requireRole([
    UserRole.ADMIN,
  ]);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          sessions: true,
          auditLogs: true,
        },
      },
    },
  });

  users.sort((firstUser, secondUser) => {
    const roleDifference =
      roleOrder[firstUser.role] -
      roleOrder[secondUser.role];

    if (roleDifference !== 0) {
      return roleDifference;
    }

    return firstUser.name.localeCompare(
      secondUser.name,
      "tr",
    );
  });

  const activeUserCount = users.filter(
    (user) => user.isActive,
  ).length;

  const adminUserCount = users.filter(
    (user) =>
      user.role === UserRole.OWNER ||
      user.role === UserRole.ADMIN,
  ).length;

  const allowedRoles =
    currentUser.role === UserRole.OWNER
      ? [
          UserRole.ADMIN,
          UserRole.EDITOR,
          UserRole.VIEWER,
        ]
      : [
          UserRole.EDITOR,
          UserRole.VIEWER,
        ];

  function canManageUser(targetUser: {
    id: string;
    role: UserRole;
  }): boolean {
    if (targetUser.id === currentUser.id) {
      return false;
    }

    if (targetUser.role === UserRole.OWNER) {
      return false;
    }

    if (currentUser.role === UserRole.OWNER) {
      return true;
    }

    return (
      currentUser.role === UserRole.ADMIN &&
      (targetUser.role === UserRole.EDITOR ||
        targetUser.role === UserRole.VIEWER)
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-4xl">
          Kullanıcı Yönetimi
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
          Yönetim paneline erişebilen hesapları,
          rollerini ve aktiflik durumlarını buradan
          yönetin.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Toplam kullanıcı"
          value={users.length}
          description="Kayıtlı panel hesabı"
        />

        <SummaryCard
          label="Aktif kullanıcı"
          value={activeUserCount}
          description="Giriş yapabilen hesap"
        />

        <SummaryCard
          label="Yönetici hesap"
          value={adminUserCount}
          description="Ana Yönetici ve Admin"
        />
      </section>

      <UserCreateForm
        canCreateAdmin={
          currentUser.role === UserRole.OWNER
        }
      />

      <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-black/[0.05]">
        <div className="border-b border-neutral-100 px-5 py-5 sm:px-7">
          <h2 className="text-lg font-semibold text-neutral-950">
            Kayıtlı kullanıcılar
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Kullanıcı rolleri ve hesap durumları
          </p>
        </div>

        <div className="divide-y divide-neutral-100">
          {users.map((user) => {
            const isCurrentUser =
              user.id === currentUser.id;

            const canManage =
              canManageUser(user);

            return (
              <article
                key={user.id}
                className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_240px_320px] lg:items-start sm:px-7"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-neutral-950">
                      {user.name}
                    </h3>

                    {isCurrentUser ? (
                      <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-green-700">
                        Siz
                      </span>
                    ) : null}

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${roleBadgeClassNames[user.role]}`}
                    >
                      {roleLabels[user.role]}
                    </span>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                        user.isActive
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {user.isActive
                        ? "Aktif"
                        : "Pasif"}
                    </span>
                  </div>

                  <p className="mt-2 break-all text-sm text-neutral-500">
                    {user.email}
                  </p>

                  <p className="mt-3 text-xs text-neutral-400">
                    Oluşturulma:{" "}
                    {formatDateTime(
                      user.createdAt,
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                  <InformationBox
                    label="Açık oturum"
                    value={String(
                      user._count.sessions,
                    )}
                  />

                  <InformationBox
                    label="Sistem hareketi"
                    value={String(
                      user._count.auditLogs,
                    )}
                  />
                </div>

                <UserActions
                  userId={user.id}
                  userName={user.name}
                  currentRole={user.role}
                  isActive={user.isActive}
                  canManage={canManage}
                  isCurrentUser={isCurrentUser}
                  allowedRoles={allowedRoles}
                />
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05]">
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
  );
}

function InformationBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-neutral-50 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-neutral-800">
        {value}
      </p>
    </div>
  );
}