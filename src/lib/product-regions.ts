export type ProductRegionScope =
  | "district"
  | "city";

export const productRegions = [
  {
    slug: "erdemli-escort",
    scope: "district" as const,
    name: "Erdemli Escort",
    shortName: "Erdemli",
    title:
      "Erdemli Escort İlanları | Miss Mersin",
    description:
      "Erdemli bölgesindeki güncel VIP, Premium ve Gold ilanları fotoğraf, kategori ve iletişim seçenekleriyle tek sayfada inceleyin.",
    h1: "Erdemli Escort İlanları",
    intro:
      "Erdemli bölgesinde yayınlanan aktif ilanları kategori, fotoğraf ve ilan detaylarıyla karşılaştırın. Süresi dolan veya pasif durumdaki ilanlar bu listede gösterilmez.",
    contentTitle:
      "Erdemli ilanlarını karşılaştırırken",
    contentParagraphs: [
      "İlan kartlarında kategori ve temel tanıtım bilgilerini görebilir, ayrıntılı sayfada fotoğraf galerisi ile iletişim seçeneklerini inceleyebilirsiniz.",
      "Liste yalnızca Erdemli ile eşleştirilen aktif ilanlardan oluşur. Böylece farklı bölgelerdeki ilanlar bu sayfaya karışmaz.",
    ],
    selectionHighlights: [
      "Bölgeyle eşleşen aktif ilanlar",
      "VIP, Premium ve Gold kategorileri",
      "Fotoğraf ve ilan detaylarına hızlı erişim",
    ],
    nearbyRegionSlugs: [
      "kizkalesi-escort",
      "mezitli-escort",
      "toros-escort",
      "yenisehir-escort",
    ],
    searchTerms: ["erdemli"],
  },
  {
    slug: "kizkalesi-escort",
    scope: "district" as const,
    name: "Kız Kalesi Escort",
    shortName: "Kız Kalesi",
    title:
      "Kız Kalesi Escort İlanları | Miss Mersin",
    description:
      "Kız Kalesi bölgesindeki güncel ilanları VIP, Premium ve Gold kategorilerinde karşılaştırın; fotoğraf ve iletişim seçeneklerine hızlıca ulaşın.",
    h1: "Kız Kalesi Escort İlanları",
    intro:
      "Kız Kalesi bölgesine ait aktif ilanları tek listede inceleyin. Kategori bilgisi, güncel görseller ve ilan detayları üzerinden seçenekleri kolayca karşılaştırın.",
    contentTitle:
      "Kız Kalesi bölgesindeki ilanları inceleme rehberi",
    contentParagraphs: [
      "Bu sayfa Kız Kalesi ile ilişkilendirilen ilanları bir araya getirir. Kartlardan ilan detayına geçerek yayın bilgilerini ve mevcut iletişim seçeneklerini kontrol edebilirsiniz.",
      "Aktiflik ve abonelik süresi düzenli olarak denetlendiği için yayından kaldırılan ilanlar listeye dahil edilmez.",
    ],
    selectionHighlights: [
      "Kız Kalesi odaklı ilan listesi",
      "Güncel kategori ve görsel bilgileri",
      "Mobil uyumlu hızlı inceleme",
    ],
    nearbyRegionSlugs: [
      "erdemli-escort",
      "mezitli-escort",
      "toros-escort",
      "yenisehir-escort",
    ],
    searchTerms: [
      "kız kalesi",
      "kızkalesi",
    ],
  },
  {
    slug: "mezitli-escort",
    scope: "district" as const,
    name: "Mezitli Escort",
    shortName: "Mezitli",
    title:
      "Mezitli Escort İlanları | Miss Mersin",
    description:
      "Mezitli bölgesindeki güncel VIP, Premium ve Gold ilanları kategori, fotoğraf ve iletişim ayrıntılarıyla tek sayfada inceleyin.",
    h1: "Mezitli Escort İlanları",
    intro:
      "Mezitli bölgesinde yayınlanan aktif ilanlara kategori bazlı ulaşın. İlan kartlarını karşılaştırın ve ayrıntılı sayfalardan güncel görselleri inceleyin.",
    contentTitle:
      "Mezitli ilanlarında güncel bilgiyi bulma",
    contentParagraphs: [
      "Liste, bölge alanı Mezitli olarak belirlenen ilanları önceliklendirir. Eski kayıtlarda bölge alanı boşsa yalnızca ilan metniyle açık biçimde eşleşen kayıtlar dahil edilir.",
      "Her ilan detay sayfasında kategori, yayın bilgisi, fotoğraf galerisi ve mevcut iletişim seçenekleri ayrı bölümlerde sunulur.",
    ],
    selectionHighlights: [
      "Mezitli ile doğrulanmış eşleşmeler",
      "Aktiflik süresi kontrol edilen ilanlar",
      "Kategoriye göre kolay karşılaştırma",
    ],
    nearbyRegionSlugs: [
      "erdemli-escort",
      "kizkalesi-escort",
      "toros-escort",
      "yenisehir-escort",
    ],
    searchTerms: ["mezitli"],
  },
  {
    slug: "toros-escort",
    scope: "district" as const,
    name: "Toros Escort",
    shortName: "Toros",
    title:
      "Toros Escort İlanları | Miss Mersin",
    description:
      "Toros bölgesindeki güncel ilanları VIP, Premium ve Gold kategorilerinde inceleyin; fotoğraf ve iletişim ayrıntılarına ulaşın.",
    h1: "Toros Escort İlanları",
    intro:
      "Toros bölgesine ait aktif ilanları tek sayfada görüntüleyin. Kategori, görsel ve ilan ayrıntıları üzerinden seçenekleri karşılaştırın.",
    contentTitle:
      "Toros ilanlarını daha hızlı inceleyin",
    contentParagraphs: [
      "Bölgeye ait ilanlar yayın durumu ve abonelik süresi kontrol edilerek listelenir. Böylece kullanım dışı ilanlar sonuçlara eklenmez.",
      "İlan detayına geçtiğinizde fotoğraf galerisine, kategori bilgisine ve ilan sahibinin sunduğu iletişim seçeneklerine ulaşabilirsiniz.",
    ],
    selectionHighlights: [
      "Toros odaklı liste",
      "Güncel ve aktif yayınlar",
      "İlan detaylarına doğrudan erişim",
    ],
    nearbyRegionSlugs: [
      "erdemli-escort",
      "kizkalesi-escort",
      "mezitli-escort",
      "yenisehir-escort",
    ],
    searchTerms: ["toros"],
  },
  {
    slug: "yenisehir-escort",
    scope: "district" as const,
    name: "Yenişehir Escort",
    shortName: "Yenişehir",
    title:
      "Yenişehir Escort İlanları | Miss Mersin",
    description:
      "Yenişehir bölgesindeki güncel ilanları VIP, Premium ve Gold kategorilerinde inceleyin; fotoğraf ve iletişim ayrıntılarına ulaşın.",
    h1: "Yenişehir Escort İlanları",
    intro:
      "Yenişehir bölgesine ait aktif ilanları tek sayfada görüntüleyin. Kategori, görsel ve ilan ayrıntıları üzerinden seçenekleri karşılaştırın.",
    contentTitle:
      "Yenişehir ilanlarını daha hızlı inceleyin",
    contentParagraphs: [
      "Bölgeye ait ilanlar yayın durumu ve abonelik süresi kontrol edilerek listelenir. Böylece kullanım dışı ilanlar sonuçlara eklenmez.",
      "İlan detayına geçtiğinizde fotoğraf galerisine, kategori bilgisine ve ilan sahibinin sunduğu iletişim seçeneklerine ulaşabilirsiniz.",
    ],
    selectionHighlights: [
      "Yenişehir odaklı liste",
      "Güncel ve aktif yayınlar",
      "İlan detaylarına doğrudan erişim",
    ],
    nearbyRegionSlugs: [
      "erdemli-escort",
      "kizkalesi-escort",
      "mezitli-escort",
      "toros-escort",
    ],
    searchTerms: [
      "yenisehir",
       "yenişehir"
      ],
  },
  {
    slug: "mersin-escort",
    scope: "city" as const,
    name: "Mersin Escort",
    shortName: "Mersin",
    title:
      "Mersin Escort İlanları | Miss Mersin",
    description:
      "Mersin genelindeki güncel ilanları bölge ve kategoriye göre inceleyin; Erdemli, Kız Kalesi, Mezitli, Toros, Yenişehir ve çevresindeki seçeneklere ulaşın.",
    h1: "Mersin Escort İlanları",
    intro:
      "Mersin genelinde yayınlanan aktif ilanları tek listede görüntüleyin; ardından Erdemli, Kız Kalesi, Mezitli, Toros ve Yenişehir sayfalarına geçerek sonuçları daraltın.",
    contentTitle:
      "Mersin ilanlarını bölgeye göre keşfedin",
    contentParagraphs: [
      "Mersin sayfası, sitedeki bölge bilgisi tanımlanmış aktif ilanların genel görünümünü sunar. Daha hedefli sonuçlar için ilgili ilçe sayfasını kullanabilirsiniz.",
      "Kategori etiketleri ve ilan kartları seçenekleri hızlıca karşılaştırmanızı sağlar; detay sayfalarında görseller ve iletişim bilgileri bulunur.",
    ],
    selectionHighlights: [
      "Mersin genelindeki aktif ilanlar",
      "İlçe sayfalarına kolay geçiş",
      "Kategori ve bölge bazlı keşif",
    ],
    nearbyRegionSlugs: [
      "erdemli-escort",
      "kizkalesi-escort",
      "mezitli-escort",
      "toros-escort",
      "yenisehir-escort",
    ],
    searchTerms: ["mersin"],
  },
] as const;

export type ProductRegion =
  (typeof productRegions)[number];

export type RegionSearchableProduct = {
  name: string;
  shortDescription: string | null;
  description: string | null;
  cardTag: string | null;
  region: string | null;
};

function normalizeRegionText(
  value: string,
): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesLegacyRegionText(
  product: RegionSearchableProduct,
  searchTerms: readonly string[],
): boolean {
  const searchableText = normalizeRegionText(
    [
      product.name,
      product.shortDescription,
      product.description,
      product.cardTag,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return searchTerms.some((term) =>
    searchableText.includes(
      normalizeRegionText(term),
    ),
  );
}

export function productBelongsToRegion(
  product: RegionSearchableProduct,
  region: ProductRegion,
): boolean {
  if (region.scope === "city") {
    if (product.region) {
      return productRegions.some(
        (item) =>
          item.slug === product.region,
      );
    }

    return matchesLegacyRegionText(
      product,
      region.searchTerms,
    );
  }

  if (product.region) {
    return product.region === region.slug;
  }

  return matchesLegacyRegionText(
    product,
    region.searchTerms,
  );
}

export function getProductRegionBySlug(
  slug: string | null | undefined,
): ProductRegion | null {
  if (!slug) {
    return null;
  }

  return (
    productRegions.find(
      (region) => region.slug === slug,
    ) ?? null
  );
}

export function isProductRegionSlug(
  value: string,
): boolean {
  return productRegions.some(
    (region) => region.slug === value,
  );
}