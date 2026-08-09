"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { deleteProductAction } from "@/app/panel/urunler/actions";

type DeleteProductFormProps = {
  productId: string;
  productName: string;
};

type DeleteMode =
  | "KEEP_PAYMENTS"
  | "DELETE_PAYMENTS";

export function DeleteProductForm({
  productId,
  productName,
}: DeleteProductFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [deleteMode, setDeleteMode] =
    useState<DeleteMode>("KEEP_PAYMENTS");

  const action = deleteProductAction.bind(
    null,
    productId,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
      >
        Sil
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
          <button
            type="button"
            aria-label="Silme penceresini kapat"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl"
          >
            <div className="border-b border-neutral-100 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-lg font-bold text-red-600">
                  !
                </span>

                <div className="min-w-0">
                  <h2
                    id="delete-product-title"
                    className="text-lg font-semibold text-neutral-950"
                  >
                    Ürünü sil
                  </h2>

                  <p className="mt-1 break-words text-sm leading-6 text-neutral-500">
                    “{productName}” ürünü kalıcı
                    olarak silinecek.
                  </p>
                </div>
              </div>
            </div>

            <form
              action={action}
              className="p-5 sm:p-6"
            >
              <input
                type="hidden"
                name="deleteMode"
                value={deleteMode}
              />

              <fieldset>
                <legend className="text-sm font-semibold text-neutral-900">
                  Ödeme kayıtlarına ne yapılsın?
                </legend>

                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteMode(
                        "KEEP_PAYMENTS",
                      )
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      deleteMode ===
                      "KEEP_PAYMENTS"
                        ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                          deleteMode ===
                          "KEEP_PAYMENTS"
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-neutral-300 text-transparent"
                        }`}
                      >
                        ✓
                      </span>

                      <div>
                        <p className="text-sm font-semibold text-neutral-900">
                          Ödeme geçmişini koru
                        </p>

                        <p className="mt-1 text-xs leading-5 text-neutral-500">
                          Ürün silinir fakat eski
                          tahsilatlar dashboard ve
                          kazanç raporlarında kalır.
                          Gerçek müşteri ürünleri
                          için kullanılır.
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDeleteMode(
                        "DELETE_PAYMENTS",
                      )
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      deleteMode ===
                      "DELETE_PAYMENTS"
                        ? "border-red-500 bg-red-50 ring-4 ring-red-100"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                          deleteMode ===
                          "DELETE_PAYMENTS"
                            ? "border-red-600 bg-red-600 text-white"
                            : "border-neutral-300 text-transparent"
                        }`}
                      >
                        ✓
                      </span>

                      <div>
                        <p className="text-sm font-semibold text-neutral-900">
                          Ürünü ve ödemeleri tamamen
                          sil
                        </p>

                        <p className="mt-1 text-xs leading-5 text-neutral-500">
                          Ürünle birlikte bütün ödeme
                          kayıtları da silinir. Toplam
                          kazanç ve bu ay tahsilat
                          rakamları düşer. Test
                          ürünleri için kullanılır.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </fieldset>

              {deleteMode ===
              "DELETE_PAYMENTS" ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs font-medium leading-5 text-red-700">
                    Bu işlem geri alınamaz. Ürüne ait
                    ödeme geçmişi tamamen silinecek.
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-medium leading-5 text-blue-700">
                    Ürün silinse bile geçmiş
                    kazançlar korunacak.
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setIsOpen(false)
                  }
                  className="flex h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                >
                  Vazgeç
                </button>

                <DeleteSubmitButton
                  deleteMode={deleteMode}
                />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DeleteSubmitButton({
  deleteMode,
}: {
  deleteMode: DeleteMode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? "Siliniyor..."
        : deleteMode === "DELETE_PAYMENTS"
          ? "Ürünü ve ödemeleri sil"
          : "Ürünü sil"}
    </button>
  );
}
