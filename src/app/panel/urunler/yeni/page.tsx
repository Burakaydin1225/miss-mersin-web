
import Link from "next/link";

import { ProductForm } from "@/app/panel/urunler/ProductForm";
import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { getProductPositionData } from "@/lib/product-position-data";

export default async function NewProductPage() {
  await requireRole([
    UserRole.ADMIN,
    UserRole.EDITOR,
  ]);

  const {
    occupiedPositions,
    defaultSortOrders,
  } = await getProductPositionData();

  return (
    <section className="mx-auto max-w-4xl">
      <Link
        href="/panel/urunler"
        className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
      >
        ← Ürünlere dön
      </Link>

      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
        Ürün yönetimi
      </p>

      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
        Yeni ürün ekle
      </h1>

      <p className="mt-3 text-sm leading-6 text-neutral-500">
        Ürün bilgilerini, kategorisini, görsellerini
        ve kategori içindeki sırasını belirleyin.
      </p>

      <ProductForm
        occupiedPositions={occupiedPositions}
        defaultSortOrders={defaultSortOrders}
        defaultSortOrder={defaultSortOrders.VIP}
      />
    </section>
  );
}
