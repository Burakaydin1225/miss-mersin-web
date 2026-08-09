import { CategorySlotForm } from "@/app/panel/kategori-alanlari/CategorySlotForm";
import {
  ProductCategory,
  UserRole,
} from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import {
  PRODUCT_CATEGORY,
  type ProductCategoryValue,
} from "@/lib/product-categories";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isProductVisible(
  product: {
    isActive: boolean;
    subscriptionEndsAt: Date | null;
  },
  now: Date,
): boolean {
  if (!product.isActive) {
    return false;
  }

  if (!product.subscriptionEndsAt) {
    return true;
  }

  return (
    product.subscriptionEndsAt.getTime() >
    now.getTime()
  );
}

export default async function CategorySlotsPage() {
  await requireRole([
    UserRole.ADMIN,
  ]);

  const now = new Date();

  const [settingRows, products] =
    await Promise.all([
      prisma.categoryDisplaySetting.findMany(),

      prisma.product.findMany({
        select: {
          category: true,
          sortOrder: true,
          isActive: true,
          subscriptionEndsAt: true,
        },
      }),
    ]);

  const configuredSlotCounts: Record<
    ProductCategory,
    number
  > = {
    [ProductCategory.VIP]: 0,
    [ProductCategory.PREMIUM]: 0,
    [ProductCategory.GOLD]: 0,
  };

  for (const setting of settingRows) {
    configuredSlotCounts[
      setting.category
    ] = setting.slotCount;
  }

  function getCategoryStatistics(
    category: ProductCategory,
  ) {
    const categoryProducts =
      products.filter(
        (product) =>
          product.category === category,
      );

    const highestPosition =
      categoryProducts.reduce(
        (maximum, product) =>
          Math.max(
            maximum,
            product.sortOrder,
          ),
        0,
      );

    const visibleProductCount =
      categoryProducts.filter((product) =>
        isProductVisible(product, now),
      ).length;

    const effectiveSlotCount = Math.max(
      configuredSlotCounts[category],
      highestPosition,
    );

    return {
      registeredProductCount:
        categoryProducts.length,
      visibleProductCount,
      highestPosition,
      effectiveSlotCount,
      advertisementCount: Math.max(
        effectiveSlotCount -
          visibleProductCount,
        0,
      ),
    };
  }

  const vipStatistics =
    getCategoryStatistics(
      ProductCategory.VIP,
    );

  const premiumStatistics =
    getCategoryStatistics(
      ProductCategory.PREMIUM,
    );

  const goldStatistics =
    getCategoryStatistics(
      ProductCategory.GOLD,
    );

  const initialSlotCounts: Record<
    ProductCategoryValue,
    number
  > = {
    [PRODUCT_CATEGORY.VIP]:
      vipStatistics.effectiveSlotCount,
    [PRODUCT_CATEGORY.PREMIUM]:
      premiumStatistics.effectiveSlotCount,
    [PRODUCT_CATEGORY.GOLD]:
      goldStatistics.effectiveSlotCount,
  };

  const statistics = {
    [PRODUCT_CATEGORY.VIP]: {
      registeredProductCount:
        vipStatistics.registeredProductCount,
      visibleProductCount:
        vipStatistics.visibleProductCount,
      highestPosition:
        vipStatistics.highestPosition,
    },
    [PRODUCT_CATEGORY.PREMIUM]: {
      registeredProductCount:
        premiumStatistics.registeredProductCount,
      visibleProductCount:
        premiumStatistics.visibleProductCount,
      highestPosition:
        premiumStatistics.highestPosition,
    },
    [PRODUCT_CATEGORY.GOLD]: {
      registeredProductCount:
        goldStatistics.registeredProductCount,
      visibleProductCount:
        goldStatistics.visibleProductCount,
      highestPosition:
        goldStatistics.highestPosition,
    },
  };

  const totalSlotCount =
    vipStatistics.effectiveSlotCount +
    premiumStatistics.effectiveSlotCount +
    goldStatistics.effectiveSlotCount;

  const totalVisibleProductCount =
    vipStatistics.visibleProductCount +
    premiumStatistics.visibleProductCount +
    goldStatistics.visibleProductCount;

  const totalAdvertisementCount =
    vipStatistics.advertisementCount +
    premiumStatistics.advertisementCount +
    goldStatistics.advertisementCount;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Katalog görünümü
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-4xl">
          Kategori Alanları
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-500">
          Her kategoride kaç kart alanı
          gösterileceğini belirleyin. Ürün bulunmayan
          sıralar ziyaretçilere reklam alanı olarak
          gösterilir.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Toplam kart alanı"
          value={totalSlotCount}
          description="Tüm kategoriler"
        />

        <SummaryCard
          label="Yayındaki ürün"
          value={totalVisibleProductCount}
          description="Şu anda görünen ürünler"
        />

        <SummaryCard
          label="Reklam alanı"
          value={totalAdvertisementCount}
          description="Boş veya pasif sıralar"
        />
      </section>

      <CategorySlotForm
        initialSlotCounts={
          initialSlotCounts
        }
        statistics={statistics}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05]">
      <p className="text-sm font-medium text-neutral-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
        {value}
      </p>

      <p className="mt-2 text-xs text-neutral-400">
        {description}
      </p>
    </div>
  );
}
