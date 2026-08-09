export type ProductRegionScope =
  | "district"
  | "city";

export const productRegions = [
  {
    slug: "beylikduzu-escort",
    scope: "district" as const,
    name: "Beylikdüzü Escort",
    shortName: "Beylikdüzü",
    title:
      "Beylikdüzü Escort İlanları | Miss İstanbul",
    description:
      "Beylikdüzü bölgesindeki güncel VIP, Premium ve Gold ilanları fotoğraf, kategori ve iletişim seçenekleriyle tek sayfada inceleyin.",
    h1: "Beylikdüzü Escort İlanları",
    intro:
      "Beylikdüzü bölgesinde yayınlanan aktif ilanları kategori, fotoğraf ve ilan detaylarıyla karşılaştırın. Süresi dolan veya pasif durumdaki ilanlar bu listede gösterilmez.",
    contentTitle:
      "Beylikdüzü ilanlarını karşılaştırırken",
    contentParagraphs: [
      "İlan kartlarında kategori ve temel tanıtım bilgilerini görebilir, ayrıntılı sayfada fotoğraf galerisi ile iletişim seçeneklerini inceleyebilirsiniz.",
      "Liste yalnızca Beylikdüzü ile eşleştirilen aktif ilanlardan oluşur. Böylece farklı bölgelerdeki ilanlar bu sayfaya karışmaz.",
    ],
    selectionHighlights: [
      "Bölgeyle eşleşen aktif ilanlar",
      "VIP, Premium ve Gold kategorileri",
      "Fotoğraf ve ilan detaylarına hızlı erişim",
    ],
    nearbyRegionSlugs: [
      "avcilar-escort",
      "esenyurt-escort",
      "buyukcekmece-escort",
    ],
    searchTerms: [
      "beylikdüzü",
      "beylikduzu",
    ],
  },
  {
    slug: "avcilar-escort",
    scope: "district" as const,
    name: "Avcılar Escort",
    shortName: "Avcılar",
    title:
      "Avcılar Escort İlanları | Miss İstanbul",
    description:
      "Avcılar bölgesindeki güncel ilanları VIP, Premium ve Gold kategorilerinde karşılaştırın; fotoğraf ve iletişim seçeneklerine hızlıca ulaşın.",
    h1: "Avcılar Escort İlanları",
    intro:
      "Avcılar bölgesine ait aktif ilanları tek listede inceleyin. Kategori bilgisi, güncel görseller ve ilan detayları üzerinden seçenekleri kolayca karşılaştırın.",
    contentTitle:
      "Avcılar bölgesindeki ilanları inceleme rehberi",
    contentParagraphs: [
      "Bu sayfa Avcılar ile ilişkilendirilen ilanları bir araya getirir. Kartlardan ilan detayına geçerek yayın bilgilerini ve mevcut iletişim seçeneklerini kontrol edebilirsiniz.",
      "Aktiflik ve abonelik süresi düzenli olarak denetlendiği için yayından kaldırılan ilanlar listeye dahil edilmez.",
    ],
    selectionHighlights: [
      "Avcılar odaklı ilan listesi",
      "Güncel kategori ve görsel bilgileri",
      "Mobil uyumlu hızlı inceleme",
    ],
    nearbyRegionSlugs: [
      "beylikduzu-escort",
      "esenyurt-escort",
      "istanbul-escort",
    ],
    searchTerms: [
      "avcılar",
      "avcilar",
    ],
  },
  {
    slug: "esenyurt-escort",
    scope: "district" as const,
    name: "Esenyurt Escort",
    shortName: "Esenyurt",
    title:
      "Esenyurt Escort İlanları | Miss İstanbul",
    description:
      "Esenyurt bölgesindeki güncel VIP, Premium ve Gold ilanları kategori, fotoğraf ve iletişim ayrıntılarıyla tek sayfada inceleyin.",
    h1: "Esenyurt Escort İlanları",
    intro:
      "Esenyurt bölgesinde yayınlanan aktif ilanlara kategori bazlı ulaşın. İlan kartlarını karşılaştırın ve ayrıntılı sayfalardan güncel görselleri inceleyin.",
    contentTitle:
      "Esenyurt ilanlarında güncel bilgiyi bulma",
    contentParagraphs: [
      "Liste, bölge alanı Esenyurt olarak belirlenen ilanları önceliklendirir. Eski kayıtlarda bölge alanı boşsa yalnızca ilan metniyle açık biçimde eşleşen kayıtlar dahil edilir.",
      "Her ilan detay sayfasında kategori, yayın bilgisi, fotoğraf galerisi ve mevcut iletişim seçenekleri ayrı bölümlerde sunulur.",
    ],
    selectionHighlights: [
      "Esenyurt ile doğrulanmış eşleşmeler",
      "Aktiflik süresi kontrol edilen ilanlar",
      "Kategoriye göre kolay karşılaştırma",
    ],
    nearbyRegionSlugs: [
      "beylikduzu-escort",
      "avcilar-escort",
      "istanbul-escort",
    ],
    searchTerms: ["esenyurt"],
  },
  {
    slug: "buyukcekmece-escort",
    scope: "district" as const,
    name: "Büyükçekmece Escort",
    shortName: "Büyükçekmece",
    title:
      "Büyükçekmece Escort İlanları | Miss İstanbul",
    description:
      "Büyükçekmece bölgesindeki güncel ilanları VIP, Premium ve Gold kategorilerinde inceleyin; fotoğraf ve iletişim ayrıntılarına ulaşın.",
    h1: "Büyükçekmece Escort İlanları",
    intro:
      "Büyükçekmece bölgesine ait aktif ilanları tek sayfada görüntüleyin. Kategori, görsel ve ilan ayrıntıları üzerinden seçenekleri karşılaştırın.",
    contentTitle:
      "Büyükçekmece ilanlarını daha hızlı inceleyin",
    contentParagraphs: [
      "Bölgeye ait ilanlar yayın durumu ve abonelik süresi kontrol edilerek listelenir. Böylece kullanım dışı ilanlar sonuçlara eklenmez.",
      "İlan detayına geçtiğinizde fotoğraf galerisine, kategori bilgisine ve ilan sahibinin sunduğu iletişim seçeneklerine ulaşabilirsiniz.",
    ],
    selectionHighlights: [
      "Büyükçekmece odaklı liste",
      "Güncel ve aktif yayınlar",
      "İlan detaylarına doğrudan erişim",
    ],
    nearbyRegionSlugs: [
      "beylikduzu-escort",
      "esenyurt-escort",
      "istanbul-escort",
    ],
    searchTerms: [
      "büyükçekmece",
      "buyukcekmece",
    ],
  },
  {
    slug: "istanbul-escort",
    scope: "city" as const,
    name: "İstanbul Escort",
    shortName: "İstanbul",
    title:
      "İstanbul Escort İlanları | Miss İstanbul",
    description:
      "İstanbul genelindeki güncel ilanları bölge ve kategoriye göre inceleyin; Beylikdüzü, Avcılar, Esenyurt ve çevresindeki seçeneklere ulaşın.",
    h1: "İstanbul Escort İlanları",
    intro:
      "İstanbul genelinde yayınlanan aktif ilanları tek listede görüntüleyin; ardından Beylikdüzü, Avcılar, Esenyurt ve Büyükçekmece sayfalarına geçerek sonuçları daraltın.",
    contentTitle:
      "İstanbul ilanlarını bölgeye göre keşfedin",
    contentParagraphs: [
      "İstanbul sayfası, sitedeki bölge bilgisi tanımlanmış aktif ilanların genel görünümünü sunar. Daha hedefli sonuçlar için ilgili ilçe sayfasını kullanabilirsiniz.",
      "Kategori etiketleri ve ilan kartları seçenekleri hızlıca karşılaştırmanızı sağlar; detay sayfalarında görseller ve iletişim bilgileri bulunur.",
    ],
    selectionHighlights: [
      "İstanbul genelindeki aktif ilanlar",
      "İlçe sayfalarına kolay geçiş",
      "Kategori ve bölge bazlı keşif",
    ],
    nearbyRegionSlugs: [
      "beylikduzu-escort",
      "avcilar-escort",
      "esenyurt-escort",
      "buyukcekmece-escort",
    ],
    searchTerms: ["istanbul"],
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