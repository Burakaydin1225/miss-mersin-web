import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/app/panel/urunler/ProductForm";
import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { getProductPositionData } from "@/lib/product-position-data";
import prisma from "@/lib/prisma";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  await requireRole([
    UserRole.ADMIN,
    UserRole.EDITOR,
  ]);

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: {
      id,
    },
    include: {
      images: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          imageUrl: true,
        },
      },
      whatsappButtons: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          label: true,
          phoneNumber: true,
          sortOrder: true,
          isActive: true,
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  /*
   * Düzenlenen ürünü dolu sıra listesinden çıkarıyoruz.
   * Böylece ürün kendi mevcut sırası için uyarı göstermez.
   */
  const {
    occupiedPositions,
    defaultSortOrders,
  } = await getProductPositionData(product.id);

  /*
   * Prisma Decimal değeri Client Component'e
   * doğrudan gönderilmemeli. Bu yüzden abonelik
   * ücretini string değerine dönüştürüyoruz.
   *
   * Ayrıca ProductForm'a yalnızca ihtiyaç duyduğu
   * alanları gönderiyoruz.
   */
  const productForForm = {
    id: product.id,
    name: product.name,
    shortDescription:
      product.shortDescription,
    description: product.description,
    detailTable: product.detailTable,
    coverImage: product.coverImage,
    cardTag: product.cardTag,
    region: product.region,
    whatsappNumber:
      product.whatsappNumber,
    whatsappButtons:
      product.whatsappButtons.map(
        (button) => ({
          id: button.id,
          label: button.label,
          phoneNumber:
            button.phoneNumber,
          sortOrder: button.sortOrder,
          isActive: button.isActive,
        }),
      ),
    category: product.category,
    sortOrder: product.sortOrder,
    subscriptionFee:
      product.subscriptionFee.toString(),
    isActive: product.isActive,
    images: product.images.map((image) => ({
      imageUrl: image.imageUrl,
    })),
  };

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/panel/urunler"
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← Ürünlere dön
        </Link>

        <Link
          href={`/urun/${product.slug}`}
          target="_blank"
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
        >
          Ürünü görüntüle
        </Link>
      </div>

      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
        Ürün yönetimi
      </p>

      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
        Ürünü düzenle
      </h1>

      <p className="mt-3 text-sm leading-6 text-neutral-500">
        {product.name}
      </p>

      <ProductForm
        product={productForForm}
        occupiedPositions={occupiedPositions}
        defaultSortOrders={defaultSortOrders}
      />
    </section>
  );
}
