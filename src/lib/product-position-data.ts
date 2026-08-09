import {
  PRODUCT_CATEGORY,
  type DefaultSortOrdersByCategory,
  type OccupiedPositionsByCategory,
  type ProductCategoryValue,
} from "@/lib/product-categories";
import prisma from "@/lib/prisma";

const MAX_POSITION = 100;

export async function getProductPositionData(
  excludedProductId?: string,
) {
  const products = await prisma.product.findMany({
    where: excludedProductId
      ? {
          id: {
            not: excludedProductId,
          },
        }
      : undefined,
    select: {
      name: true,
      category: true,
      sortOrder: true,
    },
    orderBy: [
      {
        category: "asc",
      },
      {
        sortOrder: "asc",
      },
    ],
  });

  const occupiedPositions: OccupiedPositionsByCategory = {
    [PRODUCT_CATEGORY.VIP]: [],
    [PRODUCT_CATEGORY.PREMIUM]: [],
    [PRODUCT_CATEGORY.GOLD]: [],
  };

  for (const product of products) {
    const category =
      product.category as ProductCategoryValue;

    occupiedPositions[category].push({
      sortOrder: product.sortOrder,
      productName: product.name,
    });
  }

  const defaultSortOrders =
    {} as DefaultSortOrdersByCategory;

  for (const category of Object.values(
    PRODUCT_CATEGORY,
  )) {
    const occupiedSet = new Set(
      occupiedPositions[category].map(
        (item) => item.sortOrder,
      ),
    );

    let firstAvailablePosition = 1;

    while (
      firstAvailablePosition <= MAX_POSITION &&
      occupiedSet.has(firstAvailablePosition)
    ) {
      firstAvailablePosition += 1;
    }

    defaultSortOrders[category] = Math.min(
      firstAvailablePosition,
      MAX_POSITION,
    );
  }

  return {
    occupiedPositions,
    defaultSortOrders,
  };
}