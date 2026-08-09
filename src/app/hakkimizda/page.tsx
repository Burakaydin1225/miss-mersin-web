import type { Metadata } from "next";

import { PublicPageShell } from "@/components/PublicPageShell";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: `${siteConfig.name} platformunun amacı ve çalışma yapısı hakkında bilgi edinin.`,
  alternates: {
    canonical: "/hakkimizda",
  },
};

export default function AboutPage() {
  return (
    <PublicPageShell
      eyebrow="Platform hakkında"
      title="Hakkımızda"
      description=" Beylikdüzü escort ile müşteriyi buluşturan ilan platformuyuz."
    >
      <section>
        <h2 className="text-lg font-bold text-neutral-950">
          Amacımız
        </h2>

        <p className="mt-2">
          Türkiye genelinde hizmet veren ajans
          sahiplerinin ve firmaların ilanlarını
          tek yerde sunarak hizmet için daha
          hızlı ulaşılmasını amaçlıyoruz.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-neutral-950">
          Platform nasıl çalışır?
        </h2>

        <p className="mt-2">
          Ziyaretçiler ilanları ve
          bilgilerini inceler, ilan sahibiyle
          doğrudan iletişime geçer. Platform,
          taraflar arasındaki sözleşmenin veya
          hizmetin doğrudan tarafı değildir.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-neutral-950">
          İçerik yaklaşımımız
        </h2>

        <p className="mt-2">
          İlanların açık, güncel ve yanıltıcı
          olmayan bilgiler içermesini bekliyoruz.
          Uygunsuz veya şüpheli ilanlar bildirim
          sonrasında incelenebilir ve yayından
          kaldırılabilir.
        </p>
      </section>
    </PublicPageShell>
  );
}
