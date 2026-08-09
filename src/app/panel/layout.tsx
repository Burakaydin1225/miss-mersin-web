import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { logoutAction } from "@/app/panel/actions";
import { UserRole } from "@/generated/prisma/client";
import {
  isAdmin,
  isOwner,
  requireUser,
} from "@/lib/auth";

export const metadata: Metadata = {
  title: "Yönetim Paneli",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },
};

const roleLabels: Record<UserRole, string> = {
  [UserRole.OWNER]: "Ana Yönetici",
  [UserRole.ADMIN]: "Admin",
  [UserRole.EDITOR]: "Düzenleyici",
  [UserRole.VIEWER]: "Görüntüleyici",
};

const roleBadgeClassNames: Record<UserRole, string> = {
  [UserRole.OWNER]:
    "border-violet-200 bg-violet-50 text-violet-700",
  [UserRole.ADMIN]:
    "border-blue-200 bg-blue-50 text-blue-700",
  [UserRole.EDITOR]:
    "border-amber-200 bg-amber-50 text-amber-700",
  [UserRole.VIEWER]:
    "border-neutral-200 bg-neutral-50 text-neutral-600",
};

type PanelLayoutProps = {
  children: ReactNode;
};

const navigationLinkClassName =
  "shrink-0 rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950";

export default async function PanelLayout({
  children,
}: PanelLayoutProps) {
  const user = await requireUser();

  const canManageUsers =
    isAdmin(user.role);

  const canManageCategorySlots =
    isAdmin(user.role);

  const canManageSiteSettings =
    isAdmin(user.role);

  const canViewSystemLogs =
    isOwner(user.role);

  return (
    <div className="min-h-screen bg-[#f4f4f0]">
      <header className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/panel/hesabim"
            className="min-w-0 rounded-xl transition hover:opacity-75"
          >
            <p className="text-sm font-semibold text-neutral-950">
              Katalog Yönetimi
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="truncate text-xs text-neutral-500">
                {user.name}
              </p>

              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${roleBadgeClassNames[user.role]}`}
              >
                {roleLabels[user.role]}
              </span>
            </div>
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Çıkış yap
            </button>
          </form>
        </div>

        <nav className="border-t border-neutral-100">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 sm:px-6">
            <Link
              href="/panel"
              className={navigationLinkClassName}
            >
              Genel Bakış
            </Link>

            <Link
              href="/panel/urunler"
              className={navigationLinkClassName}
            >
              Ürünler
            </Link>

            {canManageCategorySlots ? (
              <Link
                href="/panel/kategori-alanlari"
                className={navigationLinkClassName}
              >
                Kategori Alanları
              </Link>
            ) : null}

            {canManageSiteSettings ? (
              <Link
                href="/panel/site-ayarlari"
                className={navigationLinkClassName}
              >
                Site Ayarları
              </Link>
            ) : null}

            <Link
              href="/panel/hesabim"
              className={navigationLinkClassName}
            >
              Hesabım
            </Link>

            {canManageUsers ? (
              <Link
                href="/panel/kullanicilar"
                className={navigationLinkClassName}
              >
                Kullanıcılar
              </Link>
            ) : null}

            {canViewSystemLogs ? (
              <Link
                href="/panel/sistem-hareketleri"
                className={navigationLinkClassName}
              >
                Sistem Hareketleri
              </Link>
            ) : null}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
