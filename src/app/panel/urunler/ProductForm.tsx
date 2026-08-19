"use client";

import {
  useActionState,
  useState,
} from "react";

import { ProductImageUploader } from "@/app/panel/urunler/ProductImageUploader";
import {
  createProductAction,
  type ProductFormState,
  updateProductAction,
} from "@/app/panel/urunler/actions";
import {
  PRODUCT_CATEGORY,
  PRODUCT_CATEGORY_CONFIG,
  type DefaultSortOrdersByCategory,
  type OccupiedPositionsByCategory,
  type ProductCategoryValue,
} from "@/lib/product-categories";

type ProductFormProduct = {
  id: string;
  name: string;
  shortDescription: string | null;
  description: string;
  detailTable?: unknown;
  coverImage: string;
  cardTag: string | null;
  whatsappNumber: string | null;
  category: ProductCategoryValue;
  sortOrder: number;
  subscriptionFee: unknown;
  isActive: boolean;
  images: {
    imageUrl: string;
  }[];
};

type ProductFormProps = {
  product?: ProductFormProduct;
  defaultSortOrder?: number;
  occupiedPositions?: OccupiedPositionsByCategory;
  defaultSortOrders?: DefaultSortOrdersByCategory;
};

type DetailTableColumnCount = 2 | 3;

type InitialSubscriptionDuration =
  | "ONE_WEEK"
  | "TWO_WEEKS"
  | "THREE_WEEKS"
  | "ONE_MONTH";

type InitialSubscriptionOption = {
  value: InitialSubscriptionDuration;
  label: string;
  description: string;
  priceRatio: number;
};

type DetailTableState = {
  enabled: boolean;
  title: string;
  hasHeader: boolean;
  columnCount: DetailTableColumnCount;
  rows: string[][];
};

const initialState: ProductFormState = {};

const MINIMUM_TABLE_ROWS = 2;
const MAXIMUM_TABLE_ROWS = 12;

const initialSubscriptionOptions: InitialSubscriptionOption[] = [
  {
    value: "ONE_WEEK",
    label: "1 hafta",
    description: "7 gün",
    priceRatio: 0.25,
  },
  {
    value: "TWO_WEEKS",
    label: "2 hafta",
    description: "14 gün",
    priceRatio: 0.5,
  },
  {
    value: "THREE_WEEKS",
    label: "3 hafta",
    description: "21 gün",
    priceRatio: 0.75,
  },
  {
    value: "ONE_MONTH",
    label: "1 ay",
    description: "Takvim ayı",
    priceRatio: 1,
  },
];

const emptyOccupiedPositions: OccupiedPositionsByCategory = {
  [PRODUCT_CATEGORY.VIP]: [],
  [PRODUCT_CATEGORY.PREMIUM]: [],
  [PRODUCT_CATEGORY.GOLD]: [],
};

const emptyDefaultSortOrders: DefaultSortOrdersByCategory = {
  [PRODUCT_CATEGORY.VIP]: 1,
  [PRODUCT_CATEGORY.PREMIUM]: 1,
  [PRODUCT_CATEGORY.GOLD]: 1,
};

const inputClassName =
  "mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950";

const textareaClassName =
  "mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950";

function getSubscriptionFeeValue(
  value: unknown,
): string {
  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    return value.toString();
  }

  return "";
}

function parseMoneyInput(
  value: string,
): number {
  let normalizedValue = value
    .trim()
    .replace(/\s/g, "")
    .replace(/₺/g, "")
    .replace(/TRY/gi, "")
    .replace(/TL/gi, "");

  if (!normalizedValue) {
    return 0;
  }

  if (normalizedValue.includes(",")) {
    normalizedValue = normalizedValue
      .replace(/\./g, "")
      .replace(",", ".");
  }

  const parsedValue = Number(
    normalizedValue,
  );

  return Number.isFinite(parsedValue)
    ? parsedValue
    : 0;
}

function formatPaymentInput(
  value: number,
): string {
  return value.toFixed(2);
}

function createEmptyTableRows(
  rowCount: number,
  columnCount: DetailTableColumnCount,
): string[][] {
  return Array.from(
    {
      length: rowCount,
    },
    () =>
      Array.from(
        {
          length: columnCount,
        },
        () => "",
      ),
  );
}

function normalizeTableCell(
  value: unknown,
): string {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return "";
}

function parseDetailTableValue(
  value: unknown,
): unknown {
  if (typeof value !== "string") {
    return value;
  }

  if (!value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getInitialDetailTable(
  value: unknown,
): DetailTableState {
  const parsedValue =
    parseDetailTableValue(value);

  if (
    !parsedValue ||
    typeof parsedValue !== "object" ||
    Array.isArray(parsedValue)
  ) {
    return {
      enabled: false,
      title: "Ürün özellikleri",
      hasHeader: false,
      columnCount: 2,
      rows: createEmptyTableRows(
        MINIMUM_TABLE_ROWS,
        2,
      ),
    };
  }

  const record = parsedValue as Record<
    string,
    unknown
  >;

  const rawRows = Array.isArray(record.rows)
    ? record.rows
    : [];

  const maximumColumnCount = Math.max(
    0,
    ...rawRows.map((row) =>
      Array.isArray(row) ? row.length : 0,
    ),
  );

  const columnCount: DetailTableColumnCount =
    maximumColumnCount >= 3 ? 3 : 2;

  const normalizedRows = rawRows
    .filter((row): row is unknown[] =>
      Array.isArray(row),
    )
    .slice(0, MAXIMUM_TABLE_ROWS)
    .map((row) =>
      Array.from(
        {
          length: columnCount,
        },
        (_, columnIndex) =>
          normalizeTableCell(
            row[columnIndex],
          ),
      ),
    );

  while (
    normalizedRows.length <
    MINIMUM_TABLE_ROWS
  ) {
    normalizedRows.push(
      Array.from(
        {
          length: columnCount,
        },
        () => "",
      ),
    );
  }

  return {
    enabled: rawRows.length > 0,
    title:
      typeof record.title === "string" &&
      record.title.trim()
        ? record.title
        : "Ürün özellikleri",
    hasHeader: record.hasHeader === true,
    columnCount,
    rows: normalizedRows,
  };
}

export function ProductForm({
  product,
  defaultSortOrder = 1,
  occupiedPositions = emptyOccupiedPositions,
  defaultSortOrders,
}: ProductFormProps) {
  const resolvedDefaultSortOrders =
    defaultSortOrders ?? {
      ...emptyDefaultSortOrders,
      [PRODUCT_CATEGORY.VIP]: Math.min(
        Math.max(defaultSortOrder, 1),
        100,
      ),
    };

  const initialDetailTable =
    getInitialDetailTable(
      product?.detailTable,
    );

  const [mediaUploading, setMediaUploading] =
    useState(false);

  const initialSubscriptionFee =
    getSubscriptionFeeValue(
      product?.subscriptionFee,
    );

  const [
    subscriptionFeeInput,
    setSubscriptionFeeInput,
  ] = useState(initialSubscriptionFee);

  const [
    initialSubscriptionDuration,
    setInitialSubscriptionDuration,
  ] = useState<InitialSubscriptionDuration>(
    "ONE_MONTH",
  );

  const [
    initialPaymentAmount,
    setInitialPaymentAmount,
  ] = useState(
    initialSubscriptionFee
      ? formatPaymentInput(
          parseMoneyInput(
            initialSubscriptionFee,
          ),
        )
      : "",
  );

  const [selectedCategory, setSelectedCategory] =
    useState<ProductCategoryValue>(
      product?.category ?? PRODUCT_CATEGORY.VIP,
    );

  const initialSortOrder =
    product?.sortOrder ??
    resolvedDefaultSortOrders[
      PRODUCT_CATEGORY.VIP
    ];

  const [
    sortOrderInput,
    setSortOrderInput,
  ] = useState<string>(
    String(initialSortOrder),
  );

  const [
    detailTableEnabled,
    setDetailTableEnabled,
  ] = useState(initialDetailTable.enabled);

  const [detailTableTitle, setDetailTableTitle] =
    useState(initialDetailTable.title);

  const [detailTableHasHeader, setDetailTableHasHeader] =
    useState(initialDetailTable.hasHeader);

  const [
    detailTableColumnCount,
    setDetailTableColumnCount,
  ] = useState<DetailTableColumnCount>(
    initialDetailTable.columnCount,
  );

  const [detailTableRows, setDetailTableRows] =
    useState<string[][]>(
      initialDetailTable.rows,
    );

  const action = product
    ? updateProductAction.bind(null, product.id)
    : createProductAction;

  const [state, formAction, pending] =
    useActionState(action, initialState);

  const selectedCategoryInformation =
    PRODUCT_CATEGORY_CONFIG.find(
      (category) =>
        category.value === selectedCategory,
    );

  const selectedCategoryPositions =
    occupiedPositions[selectedCategory] ?? [];

  const parsedSortOrder =
    Number.parseInt(
      sortOrderInput,
      10,
    );

  const sortOrderIsValid =
    Number.isInteger(parsedSortOrder) &&
    parsedSortOrder >= 1 &&
    parsedSortOrder <= 100;

  const sortOrder = sortOrderIsValid
    ? parsedSortOrder
    : null;

  const sortOrderDisplay =
    sortOrder ?? "—";

  const occupiedPosition =
    sortOrder !== null
      ? selectedCategoryPositions.find(
          (position) =>
            position.sortOrder ===
            sortOrder,
        )
      : undefined;

  const formDisabled =
    pending ||
    mediaUploading ||
    !sortOrderIsValid ||
    Boolean(occupiedPosition);

  const serializedDetailTable =
    detailTableEnabled
      ? JSON.stringify({
          title:
            detailTableTitle.trim() ||
            "Ürün özellikleri",
          hasHeader:
            detailTableHasHeader,
          rows: detailTableRows.map(
            (row) =>
              Array.from(
                {
                  length:
                    detailTableColumnCount,
                },
                (_, columnIndex) =>
                  row[columnIndex] ?? "",
              ),
          ),
        })
      : "";

  const previewRows =
    detailTableRows.filter((row) =>
      row.some(
        (cell) => cell.trim().length > 0,
      ),
    );

  const previewHeaderRow =
    detailTableHasHeader &&
    previewRows.length > 0
      ? previewRows[0]
      : null;

  const previewBodyRows =
    detailTableHasHeader
      ? previewRows.slice(1)
      : previewRows;

  function updateSubscriptionFee(
    value: string,
  ) {
    setSubscriptionFeeInput(value);

    if (!product) {
      const selectedOption =
        initialSubscriptionOptions.find(
          (option) =>
            option.value ===
            initialSubscriptionDuration,
        ) ??
        initialSubscriptionOptions[3];

      const monthlyAmount =
        parseMoneyInput(value);

      setInitialPaymentAmount(
        value.trim()
          ? formatPaymentInput(
              monthlyAmount *
                selectedOption.priceRatio,
            )
          : "",
      );
    }
  }

  function selectInitialSubscriptionDuration(
    option: InitialSubscriptionOption,
  ) {
    setInitialSubscriptionDuration(
      option.value,
    );

    const monthlyAmount =
      parseMoneyInput(
        subscriptionFeeInput,
      );

    setInitialPaymentAmount(
      subscriptionFeeInput.trim()
        ? formatPaymentInput(
            monthlyAmount *
              option.priceRatio,
          )
        : "",
    );
  }

  function selectCategory(
    category: ProductCategoryValue,
  ) {
    if (category === selectedCategory) {
      return;
    }

    setSelectedCategory(category);

    setSortOrderInput(
      String(
        resolvedDefaultSortOrders[category] ??
          1,
      ),
    );
  }

  function handleSortOrderChange(
    value: string,
  ) {
    /*
     * Alanı number yerine metin olarak tutuyoruz.
     * Böylece kullanıcı mevcut değeri tamamen
     * silip 15, 50 veya 100 gibi bir değeri
     * klavyeyle doğrudan yazabilir.
     */
    const digitsOnly = value
      .replace(/\D/g, "")
      .slice(0, 3);

    setSortOrderInput(digitsOnly);
  }

  function handleSortOrderBlur() {
    if (!sortOrderInput) {
      return;
    }

    const parsedValue =
      Number.parseInt(
        sortOrderInput,
        10,
      );

    if (!Number.isFinite(parsedValue)) {
      return;
    }

    const normalizedValue = Math.min(
      Math.max(parsedValue, 1),
      100,
    );

    setSortOrderInput(
      String(normalizedValue),
    );
  }

  function changeDetailTableColumnCount(
    nextColumnCount: DetailTableColumnCount,
  ) {
    setDetailTableColumnCount(
      nextColumnCount,
    );

    setDetailTableRows((currentRows) =>
      currentRows.map((row) =>
        Array.from(
          {
            length: nextColumnCount,
          },
          (_, columnIndex) =>
            row[columnIndex] ?? "",
        ),
      ),
    );
  }

  function updateDetailTableCell(
    rowIndex: number,
    columnIndex: number,
    value: string,
  ) {
    setDetailTableRows((currentRows) =>
      currentRows.map(
        (row, currentRowIndex) => {
          if (
            currentRowIndex !== rowIndex
          ) {
            return row;
          }

          return row.map(
            (
              cell,
              currentColumnIndex,
            ) =>
              currentColumnIndex ===
              columnIndex
                ? value
                : cell,
          );
        },
      ),
    );
  }

  function addDetailTableRow() {
    setDetailTableRows((currentRows) => {
      if (
        currentRows.length >=
        MAXIMUM_TABLE_ROWS
      ) {
        return currentRows;
      }

      return [
        ...currentRows,
        Array.from(
          {
            length:
              detailTableColumnCount,
          },
          () => "",
        ),
      ];
    });
  }

  function removeDetailTableRow(
    rowIndex: number,
  ) {
    setDetailTableRows((currentRows) => {
      if (
        currentRows.length <=
        MINIMUM_TABLE_ROWS
      ) {
        return currentRows;
      }

      return currentRows.filter(
        (_, currentRowIndex) =>
          currentRowIndex !== rowIndex,
      );
    });
  }

  return (
    <form
      action={formAction}
      className="mt-8 space-y-6"
    >
      <input
        type="hidden"
        name="detailTable"
        value={serializedDetailTable}
      />

      <ProductImageUploader
        defaultCoverImage={product?.coverImage}
        defaultExtraImages={
          product?.images.map(
            (image) => image.imageUrl,
          ) ?? []
        }
        onUploadingChange={setMediaUploading}
      />

      <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
        <h2 className="text-base font-semibold text-neutral-950">
          Ürün bilgileri
        </h2>

        <div className="mt-6 grid gap-5">
          <div>
            <label
              htmlFor="name"
              className="text-sm font-medium text-neutral-700"
            >
              Ürün adı
            </label>

            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={product?.name}
              className={inputClassName}
              placeholder="Örneğin Modern Oturma Grubu"
            />
          </div>

          <div>
            <label
              htmlFor="shortDescription"
              className="text-sm font-medium text-neutral-700"
            >
              Kısa açıklama
            </label>

            <textarea
              id="shortDescription"
              name="shortDescription"
              rows={2}
              defaultValue={
                product?.shortDescription ?? ""
              }
              className={textareaClassName}
              placeholder="Ana sayfadaki ürün kartında görünecek kısa açıklama"
            />
          </div>

          <div>
            <label
              htmlFor="cardTag"
              className="text-sm font-medium text-neutral-700"
            >
              Kart etiketi
            </label>

            <input
              id="cardTag"
              name="cardTag"
              type="text"
              maxLength={40}
              defaultValue={product?.cardTag ?? ""}
              className={inputClassName}
              placeholder="Örn. OTEL & REZİDANS"
            />

            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Ana sayfadaki ilan kartının sağ üstünde parlak
              etiket olarak görünür. Örn. OTEL & REZİDANS,
              KENDİ YERİNDE veya 7/24. Boş bırakırsanız
              etiket gösterilmez.
            </p>
          </div>

          <div>
            <label
              htmlFor="description"
              className="text-sm font-medium text-neutral-700"
            >
              Detaylı açıklama
            </label>

            <textarea
              id="description"
              name="description"
              rows={7}
              required
              defaultValue={product?.description}
              className={textareaClassName}
              placeholder="Ürün detay sayfasında görünecek açıklama"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-950">
              Özellik tablosu
            </h2>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-neutral-500">
              Ürün açıklamasının altında gösterilecek
              tabloyu oluşturun. İki veya üç sütun
              kullanabilir, satır sayısını ürüne göre
              artırabilirsiniz.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <span className="text-sm font-medium text-neutral-700">
              Tabloyu kullan
            </span>

            <input
              type="checkbox"
              checked={detailTableEnabled}
              onChange={(event) =>
                setDetailTableEnabled(
                  event.target.checked,
                )
              }
              className="size-5 accent-neutral-950"
            />
          </label>
        </div>

        {detailTableEnabled ? (
          <div className="mt-6 space-y-6">
            <div>
              <label
                htmlFor="detailTableTitle"
                className="text-sm font-medium text-neutral-700"
              >
                Tablo başlığı
              </label>

              <input
                id="detailTableTitle"
                type="text"
                value={detailTableTitle}
                onChange={(event) =>
                  setDetailTableTitle(
                    event.target.value,
                  )
                }
                className={inputClassName}
                placeholder="Ürün özellikleri"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  Sütun sayısı
                </p>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  {([2, 3] as const).map(
                    (columnCount) => {
                      const isSelected =
                        detailTableColumnCount ===
                        columnCount;

                      return (
                        <button
                          key={columnCount}
                          type="button"
                          onClick={() =>
                            changeDetailTableColumnCount(
                              columnCount,
                            )
                          }
                          className={`h-12 rounded-xl border text-sm font-semibold transition ${
                            isSelected
                              ? "border-neutral-950 bg-neutral-950 text-white"
                              : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                          }`}
                        >
                          {columnCount} sütun
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-neutral-700">
                  Başlık satırı
                </p>

                <label className="mt-2 flex h-12 cursor-pointer items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-700">
                      İlk satırı başlık yap
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      detailTableHasHeader
                    }
                    onChange={(event) =>
                      setDetailTableHasHeader(
                        event.target.checked,
                      )
                    }
                    className="size-5 accent-neutral-950"
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-700">
                    Tablo satırları
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    En az {MINIMUM_TABLE_ROWS},
                    en fazla {MAXIMUM_TABLE_ROWS}{" "}
                    satır ekleyebilirsiniz.
                  </p>
                </div>

                <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-500">
                  {detailTableRows.length} satır ·{" "}
                  {detailTableColumnCount} sütun
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {detailTableRows.map(
                  (row, rowIndex) => (
                    <div
                      key={`detail-table-row-${rowIndex}`}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-lg bg-white text-xs font-semibold text-neutral-500 shadow-sm ring-1 ring-black/[0.05]">
                            {rowIndex + 1}
                          </span>

                          <p className="text-xs font-semibold text-neutral-600">
                            {detailTableHasHeader &&
                            rowIndex === 0
                              ? "Başlık satırı"
                              : `${
                                  detailTableHasHeader
                                    ? rowIndex
                                    : rowIndex + 1
                                }. veri satırı`}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={
                            detailTableRows.length <=
                            MINIMUM_TABLE_ROWS
                          }
                          onClick={() =>
                            removeDetailTableRow(
                              rowIndex,
                            )
                          }
                          className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Satırı sil
                        </button>
                      </div>

                      <div
                        className="grid gap-2"
                        style={{
                          gridTemplateColumns: `repeat(${detailTableColumnCount}, minmax(0, 1fr))`,
                        }}
                      >
                        {row.map(
                          (
                            cell,
                            columnIndex,
                          ) => (
                            <input
                              key={`detail-table-cell-${rowIndex}-${columnIndex}`}
                              type="text"
                              value={cell}
                              onChange={(
                                event,
                              ) =>
                                updateDetailTableCell(
                                  rowIndex,
                                  columnIndex,
                                  event.target
                                    .value,
                                )
                              }
                              className="h-11 min-w-0 rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950"
                              placeholder={
                                detailTableHasHeader &&
                                rowIndex === 0
                                  ? `${
                                      columnIndex +
                                      1
                                    }. başlık`
                                  : `${
                                      columnIndex +
                                      1
                                    }. değer`
                              }
                            />
                          ),
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>

              <button
                type="button"
                disabled={
                  detailTableRows.length >=
                  MAXIMUM_TABLE_ROWS
                }
                onClick={addDetailTableRow}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-sm font-semibold text-neutral-700 transition hover:border-neutral-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                + Yeni satır ekle
              </button>
            </div>

            <div className="rounded-[20px] border border-neutral-200 bg-[#f5f5f1] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    Canlı önizleme
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    Ürün detay sayfasında yaklaşık
                    olarak böyle görünecek.
                  </p>
                </div>

                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-neutral-500 shadow-sm">
                  Önizleme
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.05]">
                <h3 className="text-sm font-semibold text-neutral-900">
                  {detailTableTitle.trim() ||
                    "Ürün özellikleri"}
                </h3>

                {previewRows.length > 0 ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[280px] table-fixed border-collapse">
                        {previewHeaderRow ? (
                          <thead>
                            <tr className="bg-neutral-950">
                              {previewHeaderRow.map(
                                (
                                  cell,
                                  columnIndex,
                                ) => (
                                  <th
                                    key={`preview-header-${columnIndex}`}
                                    className="border-r border-white/10 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white last:border-r-0"
                                  >
                                    {cell || "—"}
                                  </th>
                                ),
                              )}
                            </tr>
                          </thead>
                        ) : null}

                        <tbody className="divide-y divide-neutral-100">
                          {previewBodyRows.map(
                            (
                              row,
                              rowIndex,
                            ) => (
                              <tr
                                key={`preview-row-${rowIndex}`}
                                className="odd:bg-white even:bg-neutral-50"
                              >
                                {row.map(
                                  (
                                    cell,
                                    columnIndex,
                                  ) => (
                                    <td
                                      key={`preview-cell-${rowIndex}-${columnIndex}`}
                                      className={`border-r border-neutral-100 px-3 py-2.5 text-xs text-neutral-600 last:border-r-0 ${
                                        !previewHeaderRow &&
                                        columnIndex ===
                                          0
                                          ? "font-semibold text-neutral-900"
                                          : ""
                                      }`}
                                    >
                                      {cell || "—"}
                                    </td>
                                  ),
                                )}
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center">
                    <p className="text-xs text-neutral-500">
                      Tablo hücrelerini doldurduğunuzda
                      önizleme burada görünecek.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-5 py-8 text-center">
            <p className="text-sm font-medium text-neutral-700">
              Özellik tablosu kapalı
            </p>

            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Bu üründe tablo kullanmak için sağ
              üstteki seçeneği etkinleştirin.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
        <h2 className="text-base font-semibold text-neutral-950">
          Kategori ve sıralama
        </h2>

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          Her kategorinin sıra numarası bağımsızdır.
          VIP 1, Premium 1 ve Gold 1 ayrı ürünler
          olabilir.
        </p>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-neutral-700">
            Ürün kategorisi
          </legend>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {PRODUCT_CATEGORY_CONFIG.map(
              (category) => {
                const isSelected =
                  selectedCategory ===
                  category.value;

                return (
                  <label
                    key={category.value}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      isSelected
                        ? `${category.activeClassName} ring-4`
                        : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={category.value}
                      checked={isSelected}
                      onChange={() =>
                        selectCategory(
                          category.value,
                        )
                      }
                      className="sr-only"
                    />

                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${category.badgeClassName}`}
                      >
                        {category.label}
                      </span>

                      <span
                        className={`flex size-5 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-neutral-950 bg-neutral-950 text-white"
                            : "border-neutral-300 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-semibold text-neutral-900">
                      {category.label}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      {category.description}
                    </p>
                  </label>
                );
              },
            )}
          </div>
        </fieldset>

        <div className="mt-6">
          <label
            htmlFor="sortOrder"
            className="text-sm font-medium text-neutral-700"
          >
            Kategori içindeki sıra numarası
          </label>

          <input
            id="sortOrder"
            name="sortOrder"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            required
            value={sortOrderInput}
            onChange={(event) =>
              handleSortOrderChange(
                event.target.value,
              )
            }
            onBlur={handleSortOrderBlur}
            className={inputClassName}
            placeholder="1 ile 100 arasında bir sıra yazın"
          />

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Sıra numarasını klavyeyle doğrudan
            yazabilirsiniz. Geçerli aralık 1–100.
          </p>

          <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-xs text-neutral-500">
              Bu ürün{" "}
              <span className="font-semibold text-neutral-900">
                {
                  selectedCategoryInformation?.label
                }
              </span>{" "}
              kategorisinde{" "}
              <span className="font-semibold text-neutral-900">
                {sortOrderDisplay}. sırada
              </span>{" "}
              gösterilecek.
            </p>
          </div>

          {!sortOrderIsValid ? (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
                  !
                </span>

                <div>
                  <p className="text-sm font-semibold text-red-950">
                    Geçerli bir sıra numarası girin
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-800">
                    Sıra numarası 1 ile 100 arasında
                    olmalıdır. Değeri klavyeyle
                    doğrudan yazabilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          ) : occupiedPosition ? (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
                  !
                </span>

                <div>
                  <p className="text-sm font-semibold text-red-950">
                    Bu sıra kullanılıyor
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-800">
                    {
                      selectedCategoryInformation?.label
                    }{" "}
                    kategorisindeki{" "}
                    {sortOrderDisplay}. sıra şu anda{" "}
                    <span className="font-semibold">
                      “
                      {
                        occupiedPosition.productName
                      }
                      ”
                    </span>{" "}
                    ürünü tarafından kullanılıyor.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-red-700">
                    Bu sıra dolu olduğu için ürün
                    kaydedilemez. Lütfen boş bir sıra
                    numarası seçin.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-xs font-medium text-green-800">
                {selectedCategoryInformation?.label}{" "}
                kategorisindeki{" "}
                {sortOrderDisplay}. sıra şu anda boş.
              </p>
            </div>
          )}

          <details className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-neutral-700">
              <span>
                {
                  selectedCategoryInformation?.label
                }{" "}
                kategorisindeki dolu sıralar
              </span>

              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500">
                {selectedCategoryPositions.length}
              </span>
            </summary>

            <div className="border-t border-neutral-100 px-4 py-4">
              {selectedCategoryPositions.length >
              0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedCategoryPositions.map(
                    (position) => {
                      const isCurrentPosition =
                        position.sortOrder ===
                        sortOrder;

                      return (
                        <button
                          key={`${selectedCategory}-${position.sortOrder}-${position.productName}`}
                          type="button"
                          title={`${position.sortOrder}. sıra: ${position.productName}`}
                          onClick={() =>
                            setSortOrderInput(
                              String(
                                position.sortOrder,
                              ),
                            )
                          }
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                            isCurrentPosition
                              ? "border-red-400 bg-red-100 text-red-900"
                              : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-red-300 hover:bg-red-50 hover:text-red-800"
                          }`}
                        >
                          {position.sortOrder}
                        </button>
                      );
                    },
                  )}
                </div>
              ) : (
                <p className="text-xs text-neutral-500">
                  Bu kategoride henüz dolu sıra
                  bulunmuyor.
                </p>
              )}

              <p className="mt-3 text-[11px] leading-5 text-neutral-400">
                Dolu sıra numaralarının üzerine
                gelerek o sırada bulunan ürünün adını
                görebilirsiniz. Ürün eklemek için
                listede bulunmayan boş bir sıra seçin.
              </p>
            </div>
          </details>
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
        <h2 className="text-base font-semibold text-neutral-950">
          WhatsApp iletişimi
        </h2>

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          Bu ürüne özel WhatsApp numarası
          tanımlayabilirsiniz. Boş bırakılırsa genel
          site numarası kullanılır.
        </p>

        <div className="mt-6">
          <label
            htmlFor="whatsappNumber"
            className="text-sm font-medium text-neutral-700"
          >
            Ürüne özel WhatsApp numarası
          </label>

          <input
            id="whatsappNumber"
            name="whatsappNumber"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={
              product?.whatsappNumber ?? ""
            }
            className={inputClassName}
            placeholder="+90 555 555 55 55"
          />

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Numarayı 0555, 555 veya +90 ile
            başlayacak biçimde girebilirsiniz.
          </p>
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
        <h2 className="text-base font-semibold text-neutral-950">
          Abonelik bilgileri
        </h2>

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          Ürünün standart aylık yayın ücretini
          belirleyin. Yeni ürün eklerken ilk
          abonelik süresini ayrıca seçebilirsiniz.
        </p>

        <div className="mt-6">
          <label
            htmlFor="subscriptionFee"
            className="text-sm font-medium text-neutral-700"
          >
            Abonelik ücreti / tahsil edilen tutar
          </label>

          <div className="relative">
            <input
              id="subscriptionFee"
              name="subscriptionFee"
              type="text"
              inputMode="decimal"
              required
              value={subscriptionFeeInput}
              onChange={(event) =>
                updateSubscriptionFee(
                  event.target.value,
                )
              }
              className={`${inputClassName} pr-14`}
              placeholder="1500"
            />

            <span className="pointer-events-none absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-sm font-semibold text-neutral-400">
              TL
            </span>
          </div>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Müşteriden bu abonelik dönemi için
            aldığınız gerçek tutarı girin. Yeni ürün
            oluşturulduğunda aynı tutar otomatik olarak
            ödeme geçmişine kaydedilir.
          </p>
        </div>

        {!product ? (
          <>
            <fieldset className="mt-6">
              <legend className="text-sm font-medium text-neutral-700">
                İlk abonelik süresi
              </legend>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {initialSubscriptionOptions.map(
                  (option) => {
                    const isSelected =
                      initialSubscriptionDuration ===
                      option.value;

                    return (
                      <label
                        key={option.value}
                        className={`cursor-pointer rounded-2xl border px-3 py-3 transition ${
                          isSelected
                            ? "border-neutral-950 bg-neutral-950 text-white"
                            : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400 hover:bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="initialSubscriptionDuration"
                          value={option.value}
                          checked={isSelected}
                          onChange={() =>
                            selectInitialSubscriptionDuration(
                              option,
                            )
                          }
                          className="sr-only"
                        />

                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">
                              {option.label}
                            </p>

                            <p
                              className={`mt-1 text-[10px] ${
                                isSelected
                                  ? "text-white/55"
                                  : "text-neutral-400"
                              }`}
                            >
                              {option.description}
                            </p>
                          </div>

                          <span
                            className={`flex size-5 items-center justify-center rounded-full border text-[10px] ${
                              isSelected
                                ? "border-white bg-white text-neutral-950"
                                : "border-neutral-300 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                        </div>
                      </label>
                    );
                  },
                )}
              </div>
            </fieldset>

            <div className="mt-6">
              <label
                htmlFor="initialPaymentAmount"
                className="text-sm font-medium text-neutral-700"
              >
                İlk alınan ödeme tutarı
              </label>

              <div className="relative">
                <input
                  id="initialPaymentAmount"
                  name="initialPaymentAmount"
                  type="text"
                  inputMode="decimal"
                  required
                  value={initialPaymentAmount}
                  onChange={(event) =>
                    setInitialPaymentAmount(
                      event.target.value,
                    )
                  }
                  className={`${inputClassName} pr-14`}
                  placeholder="1500"
                />

                <span className="pointer-events-none absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-sm font-semibold text-neutral-400">
                  TL
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-neutral-500">
                Seçilen süreye göre önerilen ödeme
                otomatik hesaplanır. Gerektiğinde
                tutarı elle değiştirebilirsiniz.
              </p>
            </div>
          </>
        ) : null}

        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              ₺
            </span>

            <div>
              <p className="text-sm font-semibold text-blue-950">
                {product
                  ? "Güncel abonelik bedeli"
                  : "İlk abonelik ve tahsilat kaydı"}
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-800">
                {product
                  ? "Bu alanı mevcut üründe değiştirmek yalnızca ürünün kayıtlı abonelik ücretini değiştirir. Yeni ödeme oluşturmaz; yeni tahsilat için abonelik yenileme ekranını kullanın."
                  : "Ürün seçilen süreyle aktif edilir ve yukarıdaki abonelik ücreti aynı tutarla ilk tahsilat olarak ödeme geçmişine kaydedilir."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
        <h2 className="text-base font-semibold text-neutral-950">
          Yayın durumu
        </h2>

        <label className="mt-6 flex cursor-pointer items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
          <div>
            <p className="text-sm font-medium text-neutral-800">
              Ürünü yayınla
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              Pasif ürün katalogda görünmez.
            </p>
          </div>

          <input
            name="isActive"
            type="checkbox"
            defaultChecked={
              product?.isActive ?? true
            }
            className="size-5 accent-neutral-950"
          />
        </label>
      </section>

      {state.error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      ) : null}

      {!sortOrderIsValid ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Ürünü kaydetmek için 1 ile 100 arasında
          geçerli bir sıra numarası girmelisiniz.
        </div>
      ) : occupiedPosition ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Ürünü kaydetmek için boş bir sıra numarası
          seçmelisiniz.
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <a
          href="/panel/urunler"
          className="flex h-12 items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Vazgeç
        </a>

        <button
          type="submit"
          disabled={formDisabled}
          className="flex h-12 items-center justify-center rounded-xl bg-neutral-950 px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mediaUploading
            ? "Görseller yükleniyor..."
            : pending
              ? "Kaydediliyor..."
              : !sortOrderIsValid
                ? "1–100 arası sıra girin"
                : occupiedPosition
                  ? "Boş bir sıra seçin"
                  : product
                    ? "Değişiklikleri kaydet"
                    : "Ürünü oluştur"}
        </button>
      </div>
    </form>
  );
}