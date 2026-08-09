import type { Metadata } from "next";

import { PublicPageShell } from "@/components/PublicPageShell";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Kullanım Koşulları",
  description: `${siteConfig.name} platformunun kullanım koşulları ve ilan sahiplerinin sorumlulukları.`,
  alternates: {
    canonical: "/kullanim-kosullari",
  },
};

export default function TermsPage() {
  return (
    <PublicPageShell
      eyebrow="Yasal bilgilendirme"
      title="Kullanım Koşulları"
      description="Platformu kullanan ziyaretçiler ve ilan sahipleri aşağıdaki temel koşulları kabul etmiş sayılır."
    >
      <section>
        <h2 className="text-lg font-bold text-neutral-950">
          Platformun rolü
        </h2>

        <p className="mt-2">
          Platform, ilan sahipleriyle hizmet
          arayan kişileri buluşturan bir yayın
          alanıdır. Taraflar arasındaki görüşme,
          fiyatlandırma, sözleşme, izin, belge ve
          hizmetin yerine getirilmesi tarafların
          sorumluluğundadır.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-neutral-950">
          İlan sahibinin sorumluluğu
        </h2>

        <p className="mt-2">
          İlan sahibi, paylaştığı bilgi ve
          görsellerin doğruluğundan, gerekli
          izinlerden ve sunduğu hizmetten
          sorumludur.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-neutral-950">
          İçerik kaldırma
        </h2>

        <p className="mt-2">
          Yanıltıcı, güncel olmayan, hak ihlali
          içeren veya platform kurallarına aykırı
          ilanlar bildirim üzerine incelenebilir,
          geçici olarak durdurulabilir veya
          kaldırılabilir.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-neutral-950">
          Değişiklikler
        </h2>

        <p className="mt-2">
          Platform özellikleri ve bu koşullar
          gerektiğinde güncellenebilir. Güncel
          metin yayımlandığı tarihten itibaren
          geçerli olur.
        </p>
      </section>

      
    </PublicPageShell>
  );
}
