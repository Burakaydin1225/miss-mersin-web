"use client";

import { useActionState } from "react";

import {
  updateSiteSettingsAction,
  type SiteSettingsFormState,
} from "@/app/panel/site-ayarlari/actions";

type SiteSettingsFormValues = {
  companyName: string;
  headline: string;
  description: string;
  whatsappNumber: string;
  whatsappMessage: string;
  primaryColor: string;
};

type SiteSettingsFormProps = {
  initialSettings: SiteSettingsFormValues;
};

const initialState: SiteSettingsFormState = {};

const inputClassName =
  "mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950";

const textareaClassName =
  "mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950";

export function SiteSettingsForm({
  initialSettings,
}: SiteSettingsFormProps) {
  const [state, formAction, pending] =
    useActionState(
      updateSiteSettingsAction,
      initialState,
    );

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {state.success}
        </div>
      ) : null}

      <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
        <h2 className="text-base font-semibold text-neutral-950">
          Genel site bilgileri
        </h2>

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          Bu alanlar katalog başlığı, panel adı ve
          ana sayfa metinleri için kullanılır.
        </p>

        <div className="mt-6 grid gap-5">
          <div>
            <label
              htmlFor="companyName"
              className="text-sm font-medium text-neutral-700"
            >
              Site adı
            </label>

            <input
              id="companyName"
              name="companyName"
              type="text"
              required
              defaultValue={
                initialSettings.companyName
              }
              className={inputClassName}
              placeholder="Miss Mersin"
            />
          </div>

          <div>
            <label
              htmlFor="headline"
              className="text-sm font-medium text-neutral-700"
            >
              Ana başlık
            </label>

            <input
              id="headline"
              name="headline"
              type="text"
              required
              defaultValue={
                initialSettings.headline
              }
              className={inputClassName}
              placeholder="Güncel ilanlar"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="text-sm font-medium text-neutral-700"
            >
              Site açıklaması
            </label>

            <textarea
              id="description"
              name="description"
              rows={4}
              required
              defaultValue={
                initialSettings.description
              }
              className={textareaClassName}
              placeholder="Ana sayfa ve genel katalog açıklaması"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
        <h2 className="text-base font-semibold text-neutral-950">
          Reklam / Genel WhatsApp numarası
        </h2>

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          Ana sayfadaki reklam alanları bu numaraya
          yönlenir. Üründe özel WhatsApp butonu yoksa
          ürün detay sayfası da bu numarayı kullanır.
        </p>

        <div className="mt-6 grid gap-5">
          <div>
            <label
              htmlFor="whatsappNumber"
              className="text-sm font-medium text-neutral-700"
            >
              Ana WhatsApp numarası
            </label>

            <input
              id="whatsappNumber"
              name="whatsappNumber"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              defaultValue={
                initialSettings.whatsappNumber
              }
              className={inputClassName}
              placeholder="+90 555 555 55 55"
            />

            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Numarayı 0555, 555 veya +90 ile
              başlayacak biçimde yazabilirsiniz.
              Sistem kaydederken 905XXXXXXXXX
              formatına çevirir.
            </p>
          </div>

          <div>
            <label
              htmlFor="whatsappMessage"
              className="text-sm font-medium text-neutral-700"
            >
              Varsayılan WhatsApp mesajı
            </label>

            <textarea
              id="whatsappMessage"
              name="whatsappMessage"
              rows={3}
              required
              defaultValue={
                initialSettings.whatsappMessage
              }
              className={textareaClassName}
              placeholder="Merhaba, ilan hakkında bilgi almak istiyorum."
            />
          </div>
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
        <h2 className="text-base font-semibold text-neutral-950">
          Görünüm
        </h2>

        <div className="mt-6">
          <label
            htmlFor="primaryColor"
            className="text-sm font-medium text-neutral-700"
          >
            Ana renk
          </label>

          <input
            id="primaryColor"
            name="primaryColor"
            type="text"
            defaultValue={
              initialSettings.primaryColor
            }
            className={inputClassName}
            placeholder="#171717"
          />
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 items-center justify-center rounded-xl bg-neutral-950 px-6 text-sm font-semibold text-white shadow-lg transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? "Kaydediliyor..."
            : "Ayarları kaydet"}
        </button>
      </div>
    </form>
  );
}
