"use client";

import {
  type FormEvent,
  useActionState,
  useEffect,
  useRef,
} from "react";
import { useFormStatus } from "react-dom";

import {
  deleteUserAction,
  resetUserPasswordAction,
  type UserActionState,
  updateUserRoleAction,
  updateUserStatusAction,
} from "@/app/panel/kullanicilar/actions";
import {
  USER_ROLE,
  USER_ROLE_LABELS,
  type UserRoleValue,
} from "@/lib/user-roles";

type UserActionsProps = {
  userId: string;
  userName: string;
  currentRole: UserRoleValue;
  isActive: boolean;
  canManage: boolean;
  isCurrentUser: boolean;
  allowedRoles: UserRoleValue[];
};

const initialState: UserActionState = {};

export function UserActions({
  userId,
  userName,
  currentRole,
  isActive,
  canManage,
  isCurrentUser,
  allowedRoles,
}: UserActionsProps) {
  const resetPasswordFormRef =
    useRef<HTMLFormElement>(null);

  const roleAction =
    updateUserRoleAction.bind(null, userId);

  const statusAction =
    updateUserStatusAction.bind(
      null,
      userId,
    );

  const resetPasswordAction =
    resetUserPasswordAction.bind(
      null,
      userId,
    );

  const deleteAction =
    deleteUserAction.bind(null, userId);

  const [
    roleState,
    roleFormAction,
    rolePending,
  ] = useActionState(
    roleAction,
    initialState,
  );

  const [
    statusState,
    statusFormAction,
    statusPending,
  ] = useActionState(
    statusAction,
    initialState,
  );

  const [
    resetPasswordState,
    resetPasswordFormAction,
    resetPasswordPending,
  ] = useActionState(
    resetPasswordAction,
    initialState,
  );

  const [
    deleteState,
    deleteFormAction,
    deletePending,
  ] = useActionState(
    deleteAction,
    initialState,
  );

  useEffect(() => {
    if (resetPasswordState.success) {
      resetPasswordFormRef.current?.reset();
    }
  }, [resetPasswordState.success]);

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
        <p className="text-xs font-medium text-neutral-500">
          {isCurrentUser
            ? "Bu hesap size ait olduğu için buradan değiştirilemez."
            : currentRole === USER_ROLE.OWNER
              ? "Ana Yönetici hesabı korunmaktadır."
              : "Bu hesabı yönetme yetkiniz bulunmuyor."}
        </p>
      </div>
    );
  }

  const visibleRoles =
    allowedRoles.includes(currentRole)
      ? allowedRoles
      : [currentRole, ...allowedRoles];

  const message =
    roleState.error ??
    statusState.error ??
    resetPasswordState.error ??
    deleteState.error ??
    roleState.success ??
    statusState.success ??
    resetPasswordState.success ??
    deleteState.success;

  const messageIsError = Boolean(
    roleState.error ||
      statusState.error ||
      resetPasswordState.error ||
      deleteState.error,
  );

  function handleDeleteSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    const approved = window.confirm(
      `"${userName}" kullanıcısı kalıcı olarak silinsin mi?\n\nKullanıcının açık oturumları kapatılacaktır.`,
    );

    if (!approved) {
      event.preventDefault();
    }
  }

  return (
    <div className="space-y-3">
      <form
        action={roleFormAction}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <select
          name="role"
          defaultValue={currentRole}
          disabled={rolePending}
          className="h-10 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 outline-none focus:border-neutral-950 disabled:opacity-60"
        >
          {visibleRoles.map((role) => (
            <option
              key={role}
              value={role}
            >
              {USER_ROLE_LABELS[role]}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={rolePending}
          className="h-10 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {rolePending
            ? "Kaydediliyor..."
            : "Rolü kaydet"}
        </button>
      </form>

      <div className="grid gap-2 sm:grid-cols-2">
        <form action={statusFormAction}>
          <input
            type="hidden"
            name="nextIsActive"
            value={String(!isActive)}
          />

          <StatusSubmitButton
            isActive={isActive}
            disabled={
              statusPending ||
              deletePending ||
              resetPasswordPending
            }
          />
        </form>

        <form
          action={deleteFormAction}
          onSubmit={handleDeleteSubmit}
        >
          <DeleteSubmitButton
            disabled={
              deletePending ||
              statusPending ||
              resetPasswordPending
            }
          />
        </form>
      </div>

      <details className="group rounded-2xl border border-neutral-200 bg-neutral-50">
        <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-neutral-700">
          <div className="flex items-center justify-between gap-3">
            <span>Şifreyi sıfırla</span>

            <span className="text-neutral-400 transition group-open:rotate-180">
              ↓
            </span>
          </div>
        </summary>

        <form
          ref={resetPasswordFormRef}
          action={resetPasswordFormAction}
          className="space-y-3 border-t border-neutral-200 p-4"
        >
          <div>
            <label
              htmlFor={`newPassword-${userId}`}
              className="text-xs font-medium text-neutral-600"
            >
              Yeni şifre
            </label>

            <input
              id={`newPassword-${userId}`}
              name="newPassword"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              placeholder="En az 8 karakter"
              className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-950 outline-none focus:border-neutral-950"
            />
          </div>

          <div>
            <label
              htmlFor={`confirmPassword-${userId}`}
              className="text-xs font-medium text-neutral-600"
            >
              Yeni şifre tekrar
            </label>

            <input
              id={`confirmPassword-${userId}`}
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              placeholder="Yeni şifreyi tekrar girin"
              className="mt-1 h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-950 outline-none focus:border-neutral-950"
            />
          </div>

          <p className="text-[11px] leading-5 text-neutral-500">
            Şifre değiştirildiğinde kullanıcının
            bütün açık oturumları kapatılır.
          </p>

          <button
            type="submit"
            disabled={resetPasswordPending}
            className="h-10 w-full rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resetPasswordPending
              ? "Şifre değiştiriliyor..."
              : "Yeni şifreyi kaydet"}
          </button>
        </form>
      </details>

      {message ? (
        <div
          role={
            messageIsError
              ? "alert"
              : "status"
          }
          className={`rounded-xl border px-3 py-2 text-xs leading-5 ${
            messageIsError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}

function StatusSubmitButton({
  isActive,
  disabled,
}: {
  isActive: boolean;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`h-10 w-full rounded-xl border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        isActive
          ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
          : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
      }`}
    >
      {pending
        ? "Güncelleniyor..."
        : isActive
          ? "Pasif yap"
          : "Aktif yap"}
    </button>
  );
}

function DeleteSubmitButton({
  disabled,
}: {
  disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="h-10 w-full rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending
        ? "Siliniyor..."
        : "Kullanıcıyı sil"}
    </button>
  );
}