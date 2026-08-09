export type Product = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  images: string[];
  recentVisitors: number;
};

export const products: Product[] = [
  {
    id: "1",
    name: "Modern Oturma Grubu",
    slug: "modern-oturma-grubu",
    shortDescription:
      "Modern çizgiler, yüksek konfor ve zamansız bir tasarım.",
    description:
      "Modern yaşam alanları için tasarlanan bu oturma grubu, rahatlık ve estetiği bir araya getirir. Dayanıklı kumaş yüzeyi, geniş oturum alanı ve sade tasarımı sayesinde farklı dekorasyon stilleriyle kolayca uyum sağlar.",
    recentVisitors: 218,
    images: [
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&fit=crop&w=1400&q=85",
    ],
  },
  {
    id: "2",
    name: "Ahşap Yemek Masası",
    slug: "ahsap-yemek-masasi",
    shortDescription:
      "Doğal ahşap dokusu ve güçlü yapısıyla uzun ömürlü kullanım.",
    description:
      "Doğal ahşap yüzeyiyle sıcak ve zarif bir görünüm sunan yemek masası, günlük kullanıma uygun sağlam bir yapıya sahiptir. Geniş yüzeyi sayesinde aile yemekleri ve misafir ağırlamak için ideal bir kullanım alanı sunar.",
    recentVisitors: 164,
    images: [
      "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1400&q=85",
    ],
  },
  {
    id: "3",
    name: "Minimal Berjer",
    slug: "minimal-berjer",
    shortDescription:
      "Kompakt alanlar için şık, rahat ve kullanışlı bir koltuk.",
    description:
      "Minimal tasarım anlayışıyla hazırlanan berjer, hem salonlarda hem de çalışma alanlarında kullanılabilir. Ergonomik sırt yapısı, yumuşak oturum alanı ve dayanıklı ayaklarıyla konforlu bir kullanım sağlar.",
    recentVisitors: 97,
    images: [
      "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1598300056393-4aac492f4344?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1400&q=85",
    ],
  },
  {
    id: "4",
    name: "Yönetici Ofis Takımı",
    slug: "yonetici-ofis-takimi",
    shortDescription:
      "Profesyonel çalışma alanları için modern ve güçlü tasarım.",
    description:
      "Yönetici ofisleri için hazırlanan bu takım; geniş çalışma masası, depolama alanları ve bütünlük sağlayan modern tasarımıyla profesyonel bir ortam oluşturur. Yoğun günlük kullanıma uygun malzemelerle üretilmiştir.",
    recentVisitors: 135,
    images: [
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=85",
    ],
  },
];