"use client";

import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  renewProductSubscriptionAction,
  type ProductFormState,
} from "@/app/panel/urunler/actions";

type RenewSubscriptionFormProps = {
  productId: string;
  defaultAmount: string;
};

type RenewalDuration =
  | "ONE_WEEK"
  | "TWO_WEEKS"
  | "THREE_WEEKS"
  | "ONE_MONTH";

type RenewalOption = {
  value: RenewalDuration;
  label: string;
  description: string;
  priceRatio: number;
};

const initialState: ProductFormState = {};

const renewalOptions: RenewalOption[] = [
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

const inputClassName =
  "mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950";

function parseAmount(value: string): number {
  const amount = Number(
    value.replace(",", "."),
  );

  return Number.isFinite(amount)
    ? amount
    : 0;
}

function formatInputAmount(
  value: number,
): string {
  return value.toFixed(2);
}

function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function RenewSubscriptionForm({
  productId,
  defaultAmount,
}: RenewSubscriptionFormProps) {
  const monthlyAmount = useMemo(
    () => parseAmount(defaultAmount),
    [defaultAmount],
  );

  const [selectedDuration, setSelectedDuration] =
    useState<RenewalDuration>(
      "ONE_MONTH",
    );

  const [amount, setAmount] =
    useState(
      formatInputAmount(monthlyAmount),
    );

  const action =
    renewProductSubscriptionAction.bind(
      null,
      productId,
    );

  const [state, formAction, pending] =
    useActionState(action, initialState);

  const selectedOption =
    renewalOptions.find(
      (option) =>
        option.value === selectedDuration,
    ) ?? renewalOptions[3];

  function selectDuration(
    option: RenewalOption,
  ) {
    setSelectedDuration(option.value);

    setAmount(
      formatInputAmount(
        monthlyAmount *
          option.priceRatio,
      ),
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-[24px] bg-neutral-950 p-5 text-white shadow-sm sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold">
          ₺
        </span>

        <div>
          <h2 className="text-base font-semibold">
            Abonelik süresini uzat
          </h2>

          <p className="mt-1 text-xs leading-5 text-white/60">
            Ödeme geldikten sonra süreyi seçin.
            Ödeme geçmişine yeni kayıt eklenir ve
            ürün yeniden aktif hale gelir.
          </p>
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-white/80">
          Uzatma süresi
        </legend>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {renewalOptions.map((option) => {
            const isSelected =
              selectedDuration ===
              option.value;

            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-2xl border px-3 py-3 transition ${
                  isSelected
                    ? "border-white bg-white text-neutral-950"
                    : "border-white/10 bg-white/[0.06] text-white hover:border-white/30 hover:bg-white/10"
                }`}
              >
                <input
                  type="radio"
                  name="duration"
                  value={option.value}
                  checked={isSelected}
                  onChange={() =>
                    selectDuration(option)
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
                          ? "text-neutral-500"
                          : "text-white/45"
                      }`}
                    >
                      {option.description}
                    </p>
                  </div>

                  <span
                    className={`flex size-5 items-center justify-center rounded-full border text-[10px] ${
                      isSelected
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-white/25 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6">
        <label
          htmlFor="amount"
          className="text-sm font-medium text-white/80"
        >
          Alınan ödeme tutarı
        </label>

        <div className="relative">
          <input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            required
            value={amount}
            onChange={(event) =>
              setAmount(
                event.target.value,
              )
            }
            className={`${inputClassName} border-white/10 bg-white/10 pr-14 text-white placeholder:text-white/30 focus:border-white`}
            placeholder="1500"
          />

          <span className="pointer-events-none absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-sm font-semibold text-white/50">
            TL
          </span>
        </div>

        <p className="mt-2 text-xs leading-5 text-white/45">
          Aylık ücret{" "}
          {formatCurrency(monthlyAmount)}.
          Seçilen süre için önerilen tutar otomatik
          hesaplanır; gerektiğinde elle
          değiştirebilirsiniz.
        </p>
      </div>

      <div className="mt-5">
        <label
          htmlFor="note"
          className="text-sm font-medium text-white/80"
        >
          Ödeme notu
        </label>

        <textarea
          id="note"
          name="note"
          rows={3}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-white"
          placeholder={`Örneğin ${selectedOption.label} abonelik ödemesi`}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4">
        <p className="text-xs leading-5 text-white/60">
          Abonelik devam ediyorsa seçilen süre
          mevcut bitiş tarihine eklenir. Süre
          dolmuşsa bugünden itibaren{" "}
          <span className="font-semibold text-white">
            {selectedOption.label}
          </span>{" "}
          yeni dönem başlatılır.
        </p>
      </div>

      {state.error ? (
        <div
          role="alert"
          className="mt-5 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending
          ? "Abonelik uzatılıyor..."
          : `Ödemeyi kaydet ve ${selectedOption.label} uzat`}
      </button>
    </form>
  );
}
