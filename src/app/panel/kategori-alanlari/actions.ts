"use server";

import { revalidatePath } from "next/cache";

import {
  ProductCategory,
  UserRole,
} from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

export type CategorySlotActionState = {
  error?: string;
  success?: string;
};

const MINIMUM_SLOT_COUNT = 0;
const MAXIMUM_SLOT_COUNT = 100;

const categoryLabels: Record<
  ProductCategory,
  string
> = {
  [ProductCategory.VIP]: "VIP",
  [ProductCategory.PREMIUM]: "Premium",
  [ProductCategory.GOLD]: "Gold",
};

const categoryFieldNames: Record<
  ProductCategory,
  string
> = {
  [ProductCategory.VIP]: "slotCount_VIP",
  [ProductCategory.PREMIUM]:
    "slotCount_PREMIUM",
  [ProductCategory.GOLD]:
    "slotCount_GOLD",
};

const categories = [
  ProductCategory.VIP,
  ProductCategory.PREMIUM,
  ProductCategory.GOLD,
] as const;

function parseSlotCount(
  value: FormDataEntryValue | null,
): number | null {
  const rawValue = String(
    value ?? "",
  ).trim();

  if (!/^\d{1,3}$/.test(rawValue)) {
    return null;
  }

  const slotCount = Number(rawValue);

  if (
    !Number.isInteger(slotCount) ||
    slotCount < MINIMUM_SLOT_COUNT ||
    slotCount > MAXIMUM_SLOT_COUNT
  ) {
    return null;
  }

  return slotCount;
}

function refreshCategorySlotPages(): void {
  revalidatePath("/");
  revalidatePath("/panel");
  revalidatePath("/panel/urunler");
  revalidatePath(
    "/panel/kategori-alanlari",
  );
  revalidatePath(
    "/panel/sistem-hareketleri",
  );
}

export async function updateCategorySlotCountsAction(
  _previousState: CategorySlotActionState,
  formData: FormData,
): Promise<CategorySlotActionState> {
  const actor = await requireRole([
    UserRole.ADMIN,
  ]);

  const nextSlotCounts = {
    [ProductCategory.VIP]:
      parseSlotCount(
        formData.get(
          categoryFieldNames[
            ProductCategory.VIP
          ],
        ),
      ),
    [ProductCategory.PREMIUM]:
      parseSlotCount(
        formData.get(
          categoryFieldNames[
            ProductCategory.PREMIUM
          ],
        ),
      ),
    [ProductCategory.GOLD]:
      parseSlotCount(
        formData.get(
          categoryFieldNames[
            ProductCategory.GOLD
          ],
        ),
      ),
  };

  for (const category of categories) {
    if (
      nextSlotCounts[category] === null
    ) {
      return {
        error: `${categoryLabels[category]} alan sayısı ${MINIMUM_SLOT_COUNT} ile ${MAXIMUM_SLOT_COUNT} arasında tam sayı olmalıdır.`,
      };
    }
  }

  const productPositionRows =
    await prisma.product.groupBy({
      by: ["category"],
      _max: {
        sortOrder: true,
      },
    });

  const highestPositionByCategory: Record<
    ProductCategory,
    number
  > = {
    [ProductCategory.VIP]: 0,
    [ProductCategory.PREMIUM]: 0,
    [ProductCategory.GOLD]: 0,
  };

  for (const row of productPositionRows) {
    highestPositionByCategory[
      row.category
    ] = row._max.sortOrder ?? 0;
  }

  for (const category of categories) {
    const nextSlotCount =
      nextSlotCounts[category];

    const highestPosition =
      highestPositionByCategory[category];

    if (
      nextSlotCount === null ||
      nextSlotCount < highestPosition
    ) {
      return {
        error: `${categoryLabels[category]} kategorisinde ${highestPosition}. sırada kayıtlı ürün bulunduğu için alan sayısı en az ${highestPosition} olmalıdır.`,
      };
    }
  }

  const previousRows =
    await prisma.categoryDisplaySetting.findMany();

  const previousSlotCounts: Record<
    ProductCategory,
    number
  > = {
    [ProductCategory.VIP]: 0,
    [ProductCategory.PREMIUM]: 0,
    [ProductCategory.GOLD]: 0,
  };

  for (const row of previousRows) {
    previousSlotCounts[row.category] =
      row.slotCount;
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        for (const category of categories) {
          const slotCount =
            nextSlotCounts[category];

          if (slotCount === null) {
            throw new Error(
              "Geçersiz kategori alan sayısı.",
            );
          }

          await transaction.categoryDisplaySetting.upsert({
            where: {
              category,
            },
            create: {
              category,
              slotCount,
            },
            update: {
              slotCount,
            },
          });
        }

        await writeAuditLog({
          client: transaction,
          actor,
          action:
            "SETTINGS_CATEGORY_SLOTS_UPDATE",
          entityType:
            "CategoryDisplaySetting",
          entityId:
            "category-display-settings",
          description: `${actor.name}, kategori alan sayılarını güncelledi.`,
          changes: {
            before: {
              VIP:
                previousSlotCounts[
                  ProductCategory.VIP
                ],
              PREMIUM:
                previousSlotCounts[
                  ProductCategory.PREMIUM
                ],
              GOLD:
                previousSlotCounts[
                  ProductCategory.GOLD
                ],
            },
            after: {
              VIP:
                nextSlotCounts[
                  ProductCategory.VIP
                ],
              PREMIUM:
                nextSlotCounts[
                  ProductCategory.PREMIUM
                ],
              GOLD:
                nextSlotCounts[
                  ProductCategory.GOLD
                ],
            },
          },
        });
      },
    );
  } catch (error) {
    console.error(
      "Kategori alanları güncellenemedi:",
      error,
    );

    return {
      error:
        "Kategori alanları güncellenirken bir hata oluştu.",
    };
  }

  refreshCategorySlotPages();

  return {
    success:
      "Kategori alan sayıları başarıyla güncellendi.",
  };
}
