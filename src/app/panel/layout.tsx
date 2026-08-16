import type { Metadata } from "next";
import type { ReactNode } from "react";

import { logoutAction } from "@/app/panel/actions";
import { PanelSidebar } from "@/components/panel/PanelSidebar";
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
    "border-violet-300/30 bg-violet-400/10 text-violet-200",
  [UserRole.ADMIN]:
    "border-blue-300/30 bg-blue-400/10 text-blue-200",
  [UserRole.EDITOR]:
    "border-amber-300/30 bg-amber-400/10 text-amber-200",
  [UserRole.VIEWER]:
    "border-white/15 bg-white/5 text-white/60",
};

type PanelLayoutProps = {
  children: ReactNode;
};

export default async function PanelLayout({
  children,
}: PanelLayoutProps) {
  const user = await requireUser();

  const canManageUsers = isAdmin(user.role);
  const canManageCategorySlots = isAdmin(user.role);
  const canManageSiteSettings = isAdmin(user.role);
  const canViewSystemLogs = isOwner(user.role);

  const items = [
    {
      href: "/panel",
      label: "Genel Bakış",
      icon: "G",
    },
    {
      href: "/panel/urunler",
      label: "Ürünler",
      icon: "Ü",
    },
    ...(canManageSiteSettings
      ? [
          {
            href: "/panel/odemeler",
            label: "Ödemeler",
            icon: "₺",
          },
        ]
      : []),
    ...(canManageCategorySlots
      ? [
          {
            href: "/panel/kategori-alanlari",
            label: "Kategori Alanları",
            icon: "K",
          },
        ]
      : []),
    ...(canManageSiteSettings
      ? [
          {
            href: "/panel/site-ayarlari",
            label: "Site Ayarları",
            icon: "S",
          },
        ]
      : []),
    {
      href: "/panel/hesabim",
      label: "Hesabım",
      icon: "H",
    },
    ...(canManageUsers
      ? [
          {
            href: "/panel/kullanicilar",
            label: "Kullanıcılar",
            icon: "K",
          },
        ]
      : []),
    ...(canViewSystemLogs
      ? [
          {
            href: "/panel/sistem-hareketleri",
            label: "Sistem Hareketleri",
            icon: "L",
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#f4f4f0]">
      <PanelSidebar
        userName={user.name}
        roleLabel={roleLabels[user.role]}
        roleClassName={roleBadgeClassNames[user.role]}
        items={items}
        logoutAction={logoutAction}
      />

      <div className="lg:pl-[248px]">
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
