# Eskort Araç SEO Paketi

Bu paket mevcut Next.js App Router projesine göre hazırlanmıştır.

## Değiştirilecek dosyalar

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/panel/layout.tsx`

## Yeni eklenecek dosyalar

- `src/lib/site-config.ts`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/app/opengraph-image.tsx`
- `src/app/twitter-image.tsx`
- `src/app/urun/[slug]/layout.tsx`
- `src/components/PublicPageShell.tsx`
- `src/app/hakkimizda/page.tsx`
- `src/app/iletisim/page.tsx`
- `src/app/ilan-yayinlama-kurallari/page.tsx`
- `src/app/gizlilik-politikasi/page.tsx`
- `src/app/kullanim-kosullari/page.tsx`

## Ortam değişkenleri

`seo-env.example` içindeki değerleri Vercel Environment Variables bölümüne ekleyin.

Alan adı alınana kadar `NEXT_PUBLIC_SITE_URL` için Vercel production adresi kullanılabilir.

## Kontrol komutları

```powershell
npx prisma generate
npm run build
```

## Yayından sonra kontrol edilecek adresler

- `/robots.txt`
- `/sitemap.xml`
- `/opengraph-image`
- `/hakkimizda`
- `/iletisim`
- `/ilan-yayinlama-kurallari`
- `/gizlilik-politikasi`
- `/kullanim-kosullari`

## Alan adı bağlandıktan sonra

1. `NEXT_PUBLIC_SITE_URL` gerçek alan adıyla güncellenir.
2. Google Search Console'da Domain Property açılır.
3. DNS doğrulaması yapılır.
4. `https://alanadiniz.com/sitemap.xml` gönderilir.
5. Ana sayfa ve birkaç ilan URL'si URL Denetleme aracında kontrol edilir.

## İçerik notu

Gizlilik politikası, kullanım koşulları ve ilan kuralları başlangıç şablonudur. Gerçek şirket bilgileri, veri akışları ve ticari model kesinleşince hukuki incelemeden geçirilmelidir.
