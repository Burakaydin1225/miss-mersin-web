"use client";

import {
  useActionState,
  useEffect,
  useRef,
} from "react";

import {
  createUserAction,
  type UserActionState,
} from "@/app/panel/kullanicilar/actions";
import { USER_ROLE } from "@/lib/user-roles";

type UserCreateFormProps = {
  canCreateAdmin: boolean;
};

const initialState: UserActionState = {};

const inputClassName =
  "mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950";

export function UserCreateForm({
  canCreateAdmin,
}: UserCreateFormProps) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [state, formAction, pending] =
    useActionState(
      createUserAction,
      initialState,
    );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
      <div>
        <h2 className="text-lg font-semibold text-neutral-950">
          Yeni kullanıcı oluştur
        </h2>

        <p className="mt-1 text-sm leading-6 text-neutral-500">
          Kullanıcının giriş bilgilerini ve paneldeki
          yetkisini belirleyin.
        </p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="mt-6 grid gap-5 lg:grid-cols-2"
      >
        <div>
          <label
            htmlFor="name"
            className="text-sm font-medium text-neutral-700"
          >
            Ad soyad
          </label>

          <input
            id="name"
            name="name"
            type="text"
            required
            className={inputClassName}
            placeholder="Örneğin Ahmet Yılmaz"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="text-sm font-medium text-neutral-700"
          >
            E-posta adresi
          </label>

          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
            className={inputClassName}
            placeholder="ahmet@firma.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="text-sm font-medium text-neutral-700"
          >
            İlk giriş şifresi
          </label>

          <input
            id="password"
            name="password"
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
            htmlFor="role"
            className="text-sm font-medium text-neutral-700"
          >
            Kullanıcı rolü
          </label>

          <select
            id="role"
            name="role"
            required
            defaultValue={USER_ROLE.EDITOR}
            className={inputClassName}
          >
            {canCreateAdmin ? (
              <option value={USER_ROLE.ADMIN}>
                Admin
              </option>
            ) : null}

            <option value={USER_ROLE.EDITOR}>
              Düzenleyici
            </option>

            <option value={USER_ROLE.VIEWER}>
              Görüntüleyici
            </option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-xs leading-5 text-blue-800">
              Admin kullanıcılar yalnızca Düzenleyici
              ve Görüntüleyici hesaplarını
              yönetebilir. Ana Yönetici rolü panelden
              atanamaz.
            </p>
          </div>
        </div>

        {state.error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-2"
          >
            {state.error}
          </div>
        ) : null}

        {state.success ? (
          <div
            role="status"
            className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 lg:col-span-2"
          >
            {state.success}
          </div>
        ) : null}

        <div className="flex justify-end lg:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="flex h-12 items-center justify-center rounded-xl bg-neutral-950 px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending
              ? "Kullanıcı oluşturuluyor..."
              : "Kullanıcı oluştur"}
          </button>
        </div>
      </form>
    </section>
  );
}