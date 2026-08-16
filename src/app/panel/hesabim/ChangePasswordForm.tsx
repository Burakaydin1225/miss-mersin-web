"use client";

import { useActionState } from "react";

import {
  changeOwnPasswordAction,
  type UserActionState,
} from "@/app/panel/kullanicilar/actions";

const initialState: UserActionState = {};

const inputClassName =
  "mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950";

export function ChangePasswordForm() {
  const [state, formAction, pending] =
    useActionState(
      changeOwnPasswordAction,
      initialState,
    );

  return (
    <form
      action={formAction}
      className="mt-6 space-y-5"
    >
      <div>
        <label
          htmlFor="currentPassword"
          className="text-sm font-medium text-neutral-700"
        >
          Mevcut şifre
        </label>

        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={inputClassName}
          placeholder="Mevcut şifrenizi girin"
        />
      </div>

      <div>
        <label
          htmlFor="newPassword"
          className="text-sm font-medium text-neutral-700"
        >
          Yeni şifre
        </label>

        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={inputClassName}
          placeholder="En az 8 karakter"
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-neutral-700"
        >
          Yeni şifre tekrar
        </label>

        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={inputClassName}
          placeholder="Yeni şifreyi tekrar girin"
        />
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs leading-5 text-amber-800">
          Şifreniz değiştirildiğinde tüm açık
          oturumlarınız kapatılır ve giriş ekranına
          yönlendirilirsiniz.
        </p>
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-neutral-950 px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending
          ? "Şifre değiştiriliyor..."
          : "Şifremi değiştir"}
      </button>
    </form>
  );
}