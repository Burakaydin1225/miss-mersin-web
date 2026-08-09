import { ChangePasswordForm } from "@/app/panel/hesabim/ChangePasswordForm";
import { UserRole } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const roleLabels: Record<UserRole, string> = {
  [UserRole.OWNER]: "Ana Yönetici",
  [UserRole.ADMIN]: "Admin",
  [UserRole.EDITOR]: "Düzenleyici",
  [UserRole.VIEWER]: "Görüntüleyici",
};

const roleClassNames: Record<
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

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-4xl">
          Hesabım
        </h1>

        <p className="mt-3 text-sm leading-6 text-neutral-500">
          Hesap bilgilerinizi görüntüleyin ve giriş
          şifrenizi güvenli şekilde değiştirin.
        </p>
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Kullanıcı hesabı
            </p>

            <h2 className="mt-2 text-xl font-semibold text-neutral-950">
              {user.name}
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {user.email}
            </p>
          </div>

          <span
            className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${roleClassNames[user.role]}`}
          >
            {roleLabels[user.role]}
          </span>
        </div>
      </section>

      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Şifremi değiştir
          </h2>

          <p className="mt-1 text-sm leading-6 text-neutral-500">
            Yeni şifreniz mevcut şifrenizden farklı
            olmalıdır.
          </p>
        </div>

        <ChangePasswordForm />
      </section>
    </div>
  );
}