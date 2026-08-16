import { SiteSettingsForm } from "@/app/panel/site-ayarlari/SiteSettingsForm";
import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SiteSettingsPage() {
  await requireRole([
    UserRole.ADMIN,
  ]);

  const settings =
    await prisma.siteSettings.findUnique({
      where: {
        id: "default",
      },
      select: {
        companyName: true,
        headline: true,
        description: true,
        whatsappNumber: true,
        whatsappMessage: true,
        primaryColor: true,
      },
    });

  const initialSettings = {
    companyName:
      settings?.companyName ??
      "Firma Kataloğu",
    headline:
      settings?.headline ??
      "Ürünlerimiz",
    description:
      settings?.description ??
      "Detaylarını incelemek istediğiniz ürüne dokunun.",
    whatsappNumber:
      settings?.whatsappNumber ??
      "905555555555",
    whatsappMessage:
      settings?.whatsappMessage ??
      "Merhaba, ürün hakkında bilgi almak istiyorum.",
    primaryColor:
      settings?.primaryColor ??
      "#171717",
  };

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Genel ayarlar
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-4xl">
          Site Ayarları
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-500">
          Site adını, genel açıklamaları ve reklam
          alanlarında kullanılan ana WhatsApp
          numarasını buradan güncelleyebilirsiniz.
        </p>
      </section>

      <SiteSettingsForm
        initialSettings={initialSettings}
      />
    </div>
  );
}
