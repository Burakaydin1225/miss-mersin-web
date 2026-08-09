import type { Metadata } from "next";

import { PublicPageShell } from "@/components/PublicPageShell";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "İlan Yayınlama Kuralları",
  description: `${siteConfig.name} üzerindeki ilanların yayın, içerik, görsel ve iletişim kurallarını inceleyin.`,
  alternates: {
    canonical:
      "/ilan-yayinlama-kurallari",
  },
};

export default function ListingRulesPage() {
  return (
    <PublicPageShell
      eyebrow="İlan politikası"
      title="İlan Yayınlama Kuralları"
      description="Platformdaki ilanların doğru, güvenilir ve anlaşılır olması için aşağıdaki temel kurallar uygulanır."
    >
      <ol className="list-decimal space-y-4 pl-5">
        <li>İlan yalnızca platformun yayın kapsamıyla ilgili olmalıdır.</li>

        <li>
          Hizmet bilgileri gerçeğe uygun
          olmalı; yanıltıcı başlık, açıklama,
          görsel veya iletişim bilgisi
          kullanılmamalıdır.
        </li>

        <li>
          İlanda kullanılan görsellerin yayınlama
          hakkı ilan sahibine ait olmalıdır.
        </li>

        

        <li>
          Yasalara, kamu düzenine veya üçüncü
          kişilerin haklarına aykırı içerikler
          yayınlanamaz.
        </li>

        <li>
          Süresi dolan, hizmet vermeyi bırakan
          veya iletişim bilgileri geçersiz hale
          gelen ilanlar güncellenmeli ya da
          kaldırılmalıdır.
        </li>
      </ol>

      
    </PublicPageShell>
  );
}
