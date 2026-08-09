import type { Metadata } from "next";

import { PublicPageShell } from "@/components/PublicPageShell";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "İletişim",
  description: `${siteConfig.name} ile ilan, reklam, destek ve içerik kaldırma talepleri için iletişime geçin.`,
  alternates: {
    canonical: "/iletisim",
  },
};

function normalizeWhatsappNumber(
  value: string,
): string {
  return value.replace(/\D/g, "");
}

export default function ContactPage() {
  const whatsappNumber =
    normalizeWhatsappNumber(
      siteConfig.contactWhatsapp,
    );

  return (
    <PublicPageShell
      eyebrow="Bize ulaşın"
      title="İletişim"
      description="İlan yayınlama, reklam alanları, teknik destek, şikâyet veya içerik kaldırma talepleri için aşağıdaki kanalları kullanabilirsiniz."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl bg-neutral-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-neutral-400">
            E-posta
          </p>

          {siteConfig.contactEmail ? (
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="mt-2 block break-all font-semibold text-neutral-950 underline decoration-neutral-300 underline-offset-4"
            >
              {siteConfig.contactEmail}
            </a>
          ) : (
            <p className="mt-2 text-neutral-600">
              
            </p>
          )}
        </article>

        <article className="rounded-2xl bg-neutral-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-neutral-400">
            WhatsApp
          </p>

          {whatsappNumber ? (
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block font-semibold text-green-700 underline decoration-green-200 underline-offset-4"
            >
              WhatsApp üzerinden yazın
            </a>
          ) : (
            <p className="mt-2 text-neutral-600">
              İletişim WhatsApp numarasını site
              ayarlarına ekleyin.
            </p>
          )}
        </article>
      </div>

      <section>
        <h2 className="text-lg font-bold text-neutral-950">
          Talebinizde bulunması gerekenler
        </h2>

        <p className="mt-2">
          İlgili ilan bağlantısını, talebinizin
          nedenini ve size dönüş yapabileceğimiz
          iletişim bilgisini paylaşmanız inceleme
          sürecini hızlandırır.
        </p>
      </section>
    </PublicPageShell>
  );
}
