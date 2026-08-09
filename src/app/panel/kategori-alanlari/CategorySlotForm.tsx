"use client";

import {
  useActionState,
  useState,
} from "react";

import {
  type CategorySlotActionState,
  updateCategorySlotCountsAction,
} from "@/app/panel/kategori-alanlari/actions";
import {
  PRODUCT_CATEGORY,
  PRODUCT_CATEGORY_CONFIG,
  type ProductCategoryValue,
} from "@/lib/product-categories";

type CategoryStatistics = {
  registeredProductCount: number;
  visibleProductCount: number;
  highestPosition: number;
};

type CategorySlotFormProps = {
  initialSlotCounts: Record<
    ProductCategoryValue,
    number
  >;
  statistics: Record<
    ProductCategoryValue,
    CategoryStatistics
  >;
};

const initialState: CategorySlotActionState =
  {};

export function CategorySlotForm({
  initialSlotCounts,
  statistics,
}: CategorySlotFormProps) {
  const [slotCounts, setSlotCounts] =
    useState<
      Record<ProductCategoryValue, string>
    >({
      [PRODUCT_CATEGORY.VIP]: String(
        initialSlotCounts[
          PRODUCT_CATEGORY.VIP
        ],
      ),
      [PRODUCT_CATEGORY.PREMIUM]: String(
        initialSlotCounts[
          PRODUCT_CATEGORY.PREMIUM
        ],
      ),
      [PRODUCT_CATEGORY.GOLD]: String(
        initialSlotCounts[
          PRODUCT_CATEGORY.GOLD
        ],
      ),
    });

  const [state, formAction, pending] =
    useActionState(
      updateCategorySlotCountsAction,
      initialState,
    );

  function updateSlotCount(
    category: ProductCategoryValue,
    rawValue: string,
  ) {
    const sanitizedValue = rawValue
      .replace(/\D/g, "")
      .slice(0, 3);

    setSlotCounts((currentValues) => ({
      ...currentValues,
      [category]: sanitizedValue,
    }));
  }

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      <section className="grid gap-4 lg:grid-cols-3">
        {PRODUCT_CATEGORY_CONFIG.map(
          (category) => {
            const slotCount = Number(
              slotCounts[category.value] || 0,
            );

            const categoryStatistics =
              statistics[category.value];

            const estimatedAdvertisementCount =
              Math.max(
                slotCount -
                  categoryStatistics.visibleProductCount,
                0,
              );

            return (
              <article
                key={category.value}
                className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${category.badgeClassName}`}
                    >
                      {category.label}
                    </span>

                    <h2 className="mt-3 text-lg font-semibold text-neutral-950">
                      {category.label} alanları
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      {category.description}
                    </p>
                  </div>

                  <span
                    className={`h-12 w-1.5 shrink-0 rounded-full ${category.accentClassName}`}
                  />
                </div>

                <div className="mt-6">
                  <label
                    htmlFor={`slotCount-${category.value}`}
                    className="text-sm font-medium text-neutral-700"
                  >
                    Toplam kart alanı
                  </label>

                  <input
                    id={`slotCount-${category.value}`}
                    name={`slotCount_${category.value}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={
                      slotCounts[
                        category.value
                      ]
                    }
                    onChange={(event) =>
                      updateSlotCount(
                        category.value,
                        event.target.value,
                      )
                    }
                    className="mt-2 h-14 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-2xl font-semibold text-neutral-950 outline-none transition placeholder:text-neutral-300 focus:border-neutral-950"
                    placeholder="0"
                  />

                  <p className="mt-2 text-xs leading-5 text-neutral-500">
                    0 ile 100 arasında bir sayı
                    girin. Boş kalan sıralar reklam
                    alanı olur.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <InformationBox
                    label="Yayındaki ürün"
                    value={
                      categoryStatistics.visibleProductCount
                    }
                  />

                  <InformationBox
                    label="Reklam alanı"
                    value={
                      estimatedAdvertisementCount
                    }
                  />

                  <InformationBox
                    label="Kayıtlı ürün"
                    value={
                      categoryStatistics.registeredProductCount
                    }
                  />

                  <InformationBox
                    label="En yüksek sıra"
                    value={
                      categoryStatistics.highestPosition
                    }
                  />
                </div>

                {slotCount <
                categoryStatistics.highestPosition ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-xs leading-5 text-red-700">
                      Bu kategoride{" "}
                      <strong>
                        {
                          categoryStatistics.highestPosition
                        }
                        . sırada
                      </strong>{" "}
                      ürün bulunduğu için alan sayısı
                      en az{" "}
                      {
                        categoryStatistics.highestPosition
                      }{" "}
                      olmalıdır.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                    <p className="text-xs leading-5 text-green-700">
                      Kaydedildiğinde yaklaşık{" "}
                      <strong>
                        {
                          estimatedAdvertisementCount
                        }
                      </strong>{" "}
                      reklam kartı gösterilecek.
                    </p>
                  </div>
                )}
              </article>
            );
          },
        )}
      </section>

      <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-6">
        <h2 className="text-base font-semibold text-neutral-950">
          Alan sistemi nasıl çalışır?
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ExplanationCard
            number="1"
            title="Toplam alanı belirleyin"
            description="Örneğin VIP için 50 yazarsanız VIP bölümünde 50 kart sırası oluşur."
          />

          <ExplanationCard
            number="2"
            title="Ürünler yerini korur"
            description="Ürün hangi sıra numarasındaysa o kart alanında gösterilmeye devam eder."
          />

          <ExplanationCard
            number="3"
            title="Boş alanlar reklam olur"
            description="Ürün bulunmayan veya yayından kalkan sıralar otomatik reklam kartına dönüşür."
          />
        </div>
      </section>

      {state.error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div
          role="status"
          className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {state.success}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-neutral-950 px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {pending
            ? "Ayarlar kaydediliyor..."
            : "Kategori alanlarını kaydet"}
        </button>
      </div>
    </form>
  );
}

function InformationBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-neutral-50 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold text-neutral-950">
        {value}
      </p>
    </div>
  );
}

function ExplanationCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <span className="flex size-8 items-center justify-center rounded-xl bg-neutral-950 text-xs font-bold text-white">
        {number}
      </span>

      <p className="mt-3 text-sm font-semibold text-neutral-900">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-neutral-500">
        {description}
      </p>
    </div>
  );
}
