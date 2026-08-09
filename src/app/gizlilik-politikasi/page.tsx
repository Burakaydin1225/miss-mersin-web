import type { Metadata } from "next";

import { PublicPageShell } from "@/components/PublicPageShell";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: `${siteConfig.name} gizlilik politikası ve veri işleme uygulamaları hakkında genel bilgilendirme.`,
  alternates: {
    canonical: "/gizlilik-politikasi",
  },
};

export default function PrivacyPage() {
  return (
    <PublicPageShell
      eyebrow="Yasal bilgilendirme"
      title="Gizlilik Politikası"
      description="Bu sayfa, platform kullanımı sırasında işlenebilecek veriler hakkında başlangıç seviyesinde bilgilendirme şablonudur."
    >
      <section>
        <h2 className="text-lg font-bold text-neutral-950">
          İşlenebilecek veriler
        </h2>

        <p className="mt-2">
          İletişim formları, ilan başvuruları,
          yönetici hesapları, güvenlik kayıtları
          ve anonim veya takma adlı kullanım
          istatistikleri kapsamında sınırlı
          veriler işlenebilir.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-neutral-950">
          Kullanım amacı
        </h2>

        <p className="mt-2">
          Veriler platformun çalıştırılması,
          güvenliğin sağlanması, taleplerin
          yanıtlanması, ilanların yönetilmesi ve
          hizmet kalitesinin ölçülmesi amacıyla
          kullanılabilir.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-neutral-950">
          Çerezler ve analiz
        </h2>

        <p className="mt-2">
          Platform, oturum güvenliği ve kullanım
          analizi için teknik tanımlayıcılar
          kullanabilir. Kullanılan analiz ve
          çerez araçları kesinleştiğinde bu bölüm
          ayrıntılı biçimde güncellenmelidir.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-neutral-950">
          Başvuru ve iletişim
        </h2>

        <p className="mt-2">
          Verilerinizle ilgili soru, düzeltme veya
          silme taleplerinizi iletişim sayfasında
          belirtilen kanallardan iletebilirsiniz.
        </p>
      </section>

      
    </PublicPageShell>
  );
}
