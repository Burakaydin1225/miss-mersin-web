export const PRODUCT_CATEGORY = {
  VIP: "VIP",
  PREMIUM: "PREMIUM",
  GOLD: "GOLD",
} as const;

export type ProductCategoryValue =
  (typeof PRODUCT_CATEGORY)[keyof typeof PRODUCT_CATEGORY];

export type OccupiedProductPosition = {
  sortOrder: number;
  productName: string;
};

export type OccupiedPositionsByCategory = Record<
  ProductCategoryValue,
  OccupiedProductPosition[]
>;

export type DefaultSortOrdersByCategory = Record<
  ProductCategoryValue,
  number
>;

export const PRODUCT_CATEGORY_CONFIG = [
  {
    value: PRODUCT_CATEGORY.VIP,
    key: "vip",
    label: "VIP",
    description: "Özel ve seçkin ürün koleksiyonu",
    badgeClassName:
      "border-violet-200 bg-violet-50 text-violet-700",
    activeClassName:
      "border-violet-500 bg-violet-50 ring-violet-100",
    accentClassName: "bg-violet-600",
  },
  {
    value: PRODUCT_CATEGORY.PREMIUM,
    key: "premium",
    label: "Premium",
    description: "Üst segment ürün koleksiyonu",
    badgeClassName:
      "border-amber-200 bg-amber-50 text-amber-700",
    activeClassName:
      "border-amber-500 bg-amber-50 ring-amber-100",
    accentClassName: "bg-amber-500",
  },
  {
    value: PRODUCT_CATEGORY.GOLD,
    key: "gold",
    label: "Gold",
    description: "Gold ürün koleksiyonu",
    badgeClassName:
      "border-yellow-300 bg-yellow-50 text-yellow-700",
    activeClassName:
      "border-yellow-500 bg-yellow-50 ring-yellow-100",
    accentClassName: "bg-yellow-500",
  },
] as const;

export function getProductCategoryConfig(
  category: string,
) {
  return (
    PRODUCT_CATEGORY_CONFIG.find(
      (item) => item.value === category,
    ) ?? PRODUCT_CATEGORY_CONFIG[0]
  );
}