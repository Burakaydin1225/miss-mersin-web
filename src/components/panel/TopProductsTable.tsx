"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ProductRow = {
  productId: string;
  productName: string;
  slug: string | null;
  views: number;
  clicks: number;
  conversion: number;
};

type SortKey = "views" | "clicks" | "conversion";

type Props = {
  products: ProductRow[];
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatPercentage(value: number): string {
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function TopProductsTable({ products }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("views");

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      if (sortKey === "clicks") {
        return b.clicks - a.clicks || b.views - a.views;
      }

      if (sortKey === "conversion") {
        return b.conversion - a.conversion || b.clicks - a.clicks;
      }

      return b.views - a.views || b.clicks - a.clicks;
    });
  }, [products, sortKey]);

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Ürün performansı
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Son 7 günün ürün bazlı gerçek verileri
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          Sırala
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-800 outline-none transition focus:border-neutral-400 focus:bg-white"
          >
            <option value="views">Görüntülemeye göre</option>
            <option value="clicks">WhatsApp'a göre</option>
            <option value="conversion">Dönüşüme göre</option>
          </select>
        </label>
      </div>

      {sortedProducts.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-100">
          <div className="hidden grid-cols-[minmax(0,1fr)_120px_120px_120px] gap-4 bg-neutral-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-400 sm:grid">
            <span>Ürün</span>
            <span className="text-right">Görüntüleme</span>
            <span className="text-right">WhatsApp</span>
            <span className="text-right">Dönüşüm</span>
          </div>

          <div className="divide-y divide-neutral-100">
            {sortedProducts.map((product, index) => {
              const content = (
                <>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-xs font-semibold text-neutral-500">
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {product.productName}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {product.slug ? "Ürün detayını aç" : "Silinmiş ürün kaydı"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 sm:contents">
                    <StatisticCell
                      label="Görüntüleme"
                      value={formatNumber(product.views)}
                    />
                    <StatisticCell
                      label="WhatsApp"
                      value={formatNumber(product.clicks)}
                    />
                    <StatisticCell
                      label="Dönüşüm"
                      value={formatPercentage(product.conversion)}
                      highlighted
                    />
                  </div>
                </>
              );

              if (product.slug) {
                return (
                  <Link
                    key={product.productId}
                    href={`/urun/${product.slug}`}
                    target="_blank"
                    className="grid gap-4 px-4 py-4 transition hover:bg-neutral-50 sm:grid-cols-[minmax(0,1fr)_120px_120px_120px] sm:items-center sm:px-5"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div
                  key={product.productId}
                  className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_120px_120px_120px] sm:items-center sm:px-5"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-5 py-12 text-center">
          <p className="text-sm font-medium text-neutral-700">
            Henüz ürün istatistiği yok
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Ürünler ziyaret edildikçe veriler burada gösterilecek.
          </p>
        </div>
      )}
    </section>
  );
}

function StatisticCell({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div className="text-left sm:text-right">
      <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400 sm:hidden">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold sm:mt-0 ${
          highlighted ? "text-green-700" : "text-neutral-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
