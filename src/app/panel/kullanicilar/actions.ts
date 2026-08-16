"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import {
  deleteSession,
  requireRole,
  requireUser,
} from "@/lib/auth";
import prisma from "@/lib/prisma";

export type UserActionState = {
  error?: string;
  success?: string;
};

type ActorInformation = {
  id: string;
  role: UserRole;
};

type TargetInformation = {
  id: string;
  role: UserRole;
};

const MINIMUM_PASSWORD_LENGTH = 8;
const MAXIMUM_PASSWORD_LENGTH = 72;

const roleLabels: Record<UserRole, string> = {
  [UserRole.OWNER]: "Ana Yönetici",
  [UserRole.ADMIN]: "Admin",
  [UserRole.EDITOR]: "Düzenleyici",
  [UserRole.VIEWER]: "Görüntüleyici",
};

function refreshUserPages(): void {
  revalidatePath("/panel");
  revalidatePath("/panel/kullanicilar");
  revalidatePath("/panel/sistem-hareketleri");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function isUserRole(
  value: string,
): value is UserRole {
  return Object.values(UserRole).includes(
    value as UserRole,
  );
}

function getAssignableRoles(
  actorRole: UserRole,
): UserRole[] {
  if (actorRole === UserRole.OWNER) {
    return [
      UserRole.ADMIN,
      UserRole.EDITOR,
      UserRole.VIEWER,
    ];
  }

  if (actorRole === UserRole.ADMIN) {
    return [
      UserRole.EDITOR,
      UserRole.VIEWER,
    ];
  }

  return [];
}

function canManageTarget(
  actor: ActorInformation,
  target: TargetInformation,
): boolean {
  if (actor.id === target.id) {
    return false;
  }

  if (target.role === UserRole.OWNER) {
    return false;
  }

  if (actor.role === UserRole.OWNER) {
    return true;
  }

  if (actor.role === UserRole.ADMIN) {
    return (
      target.role === UserRole.EDITOR ||
      target.role === UserRole.VIEWER
    );
  }

  return false;
}

function getPasswordValidationError(
  password: string,
): string | null {
  if (
    password.length <
      MINIMUM_PASSWORD_LENGTH ||
    password.length >
      MAXIMUM_PASSWORD_LENGTH
  ) {
    return `Şifre ${MINIMUM_PASSWORD_LENGTH} ile ${MAXIMUM_PASSWORD_LENGTH} karakter arasında olmalıdır.`;
  }

  return null;
}

function isUniqueConstraintError(
  error: unknown,
): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  return error.code === "P2002";
}

export async function createUserAction(
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const actor = await requireRole([
    UserRole.ADMIN,
  ]);

  const name = String(
    formData.get("name") ?? "",
  ).trim();

  const email = normalizeEmail(
    String(formData.get("email") ?? ""),
  );

  const password = String(
    formData.get("password") ?? "",
  );

  const rawRole = String(
    formData.get("role") ?? "",
  );

  if (name.length < 2) {
    return {
      error:
        "Kullanıcı adı en az 2 karakter olmalıdır.",
    };
  }

  if (name.length > 80) {
    return {
      error:
        "Kullanıcı adı en fazla 80 karakter olabilir.",
    };
  }

  if (
    !email ||
    email.length > 160 ||
    !isValidEmail(email)
  ) {
    return {
      error:
        "Geçerli bir e-posta adresi girin.",
    };
  }

  const passwordError =
    getPasswordValidationError(password);

  if (passwordError) {
    return {
      error: passwordError,
    };
  }

  if (!isUserRole(rawRole)) {
    return {
      error:
        "Geçerli bir kullanıcı rolü seçin.",
    };
  }

  const assignableRoles =
    getAssignableRoles(actor.role);

  if (!assignableRoles.includes(rawRole)) {
    return {
      error:
        "Bu kullanıcı rolünü atama yetkiniz bulunmuyor.",
    };
  }

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

  if (existingUser) {
    return {
      error:
        "Bu e-posta adresiyle daha önce bir kullanıcı oluşturulmuş.",
    };
  }

  const passwordHash = await bcrypt.hash(
    password,
    12,
  );

  try {
    await prisma.$transaction(
      async (transaction) => {
        const createdUser =
          await transaction.user.create({
            data: {
              name,
              email,
              passwordHash,
              role: rawRole,
              isActive: true,
            },
          });

        await writeAuditLog({
          client: transaction,
          actor,
          action: "USER_CREATE",
          entityType: "User",
          entityId: createdUser.id,
          description: `${actor.name}, "${createdUser.name}" kullanıcısını ${roleLabels[createdUser.role]} rolüyle oluşturdu.`,
          changes: {
            name: createdUser.name,
            email: createdUser.email,
            role: createdUser.role,
            isActive:
              createdUser.isActive,
          },
        });
      },
    );
  } catch (error) {
    console.error(
      "Kullanıcı oluşturulamadı:",
      error,
    );

    if (isUniqueConstraintError(error)) {
      return {
        error:
          "Bu e-posta adresiyle daha önce bir kullanıcı oluşturulmuş.",
      };
    }

    return {
      error:
        "Kullanıcı oluşturulurken bir hata oluştu.",
    };
  }

  refreshUserPages();

  return {
    success: `${name} kullanıcısı başarıyla oluşturuldu.`,
  };
}

export async function updateUserRoleAction(
  targetUserId: string,
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const actor = await requireRole([
    UserRole.ADMIN,
  ]);

  const rawRole = String(
    formData.get("role") ?? "",
  );

  if (!isUserRole(rawRole)) {
    return {
      error:
        "Geçerli bir kullanıcı rolü seçin.",
    };
  }

  const assignableRoles =
    getAssignableRoles(actor.role);

  if (!assignableRoles.includes(rawRole)) {
    return {
      error:
        "Bu rolü atama yetkiniz bulunmuyor.",
    };
  }

  const targetUser =
    await prisma.user.findUnique({
      where: {
        id: targetUserId,
      },
    });

  if (!targetUser) {
    return {
      error: "Kullanıcı bulunamadı.",
    };
  }

  if (
    !canManageTarget(actor, targetUser)
  ) {
    return {
      error:
        "Bu kullanıcıyı düzenleme yetkiniz bulunmuyor.",
    };
  }

  if (targetUser.role === rawRole) {
    return {
      success:
        "Kullanıcının rolünde değişiklik yapılmadı.",
    };
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        const updatedUser =
          await transaction.user.update({
            where: {
              id: targetUser.id,
            },
            data: {
              role: rawRole,
            },
          });

        /*
         * Rol değiştiği anda açık oturumlar
         * kapatılır. Kullanıcı yeni rolüyle
         * tekrar giriş yapar.
         */
        await transaction.session.deleteMany({
          where: {
            userId: targetUser.id,
          },
        });

        await writeAuditLog({
          client: transaction,
          actor,
          action: "USER_ROLE_UPDATE",
          entityType: "User",
          entityId: updatedUser.id,
          description: `${actor.name}, "${updatedUser.name}" kullanıcısının rolünü ${roleLabels[targetUser.role]} rolünden ${roleLabels[updatedUser.role]} rolüne değiştirdi.`,
          changes: {
            before: {
              role: targetUser.role,
            },
            after: {
              role: updatedUser.role,
            },
            userName: updatedUser.name,
            userEmail:
              updatedUser.email,
            sessionsTerminated: true,
          },
        });
      },
    );
  } catch (error) {
    console.error(
      "Kullanıcı rolü güncellenemedi:",
      error,
    );

    return {
      error:
        "Kullanıcı rolü güncellenirken bir hata oluştu.",
    };
  }

  refreshUserPages();

  return {
    success:
      "Kullanıcı rolü güncellendi ve açık oturumları kapatıldı.",
  };
}

export async function updateUserStatusAction(
  targetUserId: string,
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const actor = await requireRole([
    UserRole.ADMIN,
  ]);

  const nextIsActive =
    String(
      formData.get("nextIsActive") ?? "",
    ) === "true";

  const targetUser =
    await prisma.user.findUnique({
      where: {
        id: targetUserId,
      },
    });

  if (!targetUser) {
    return {
      error: "Kullanıcı bulunamadı.",
    };
  }

  if (
    !canManageTarget(actor, targetUser)
  ) {
    return {
      error:
        "Bu kullanıcının durumunu değiştirme yetkiniz bulunmuyor.",
    };
  }

  if (
    targetUser.isActive === nextIsActive
  ) {
    return {
      success:
        "Kullanıcının durumunda değişiklik yapılmadı.",
    };
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        const updatedUser =
          await transaction.user.update({
            where: {
              id: targetUser.id,
            },
            data: {
              isActive: nextIsActive,
            },
          });

        if (!nextIsActive) {
          await transaction.session.deleteMany({
            where: {
              userId: targetUser.id,
            },
          });
        }

        await writeAuditLog({
          client: transaction,
          actor,
          action: "USER_STATUS_UPDATE",
          entityType: "User",
          entityId: updatedUser.id,
          description: `${actor.name}, "${updatedUser.name}" kullanıcısını ${
            updatedUser.isActive
              ? "aktif"
              : "pasif"
          } duruma getirdi.`,
          changes: {
            before: {
              isActive:
                targetUser.isActive,
            },
            after: {
              isActive:
                updatedUser.isActive,
            },
            userName: updatedUser.name,
            userEmail:
              updatedUser.email,
            sessionsTerminated:
              !nextIsActive,
          },
        });
      },
    );
  } catch (error) {
    console.error(
      "Kullanıcı durumu güncellenemedi:",
      error,
    );

    return {
      error:
        "Kullanıcı durumu güncellenirken bir hata oluştu.",
    };
  }

  refreshUserPages();

  return {
    success: nextIsActive
      ? "Kullanıcı hesabı aktifleştirildi."
      : "Kullanıcı hesabı pasifleştirildi ve açık oturumları kapatıldı.",
  };
}

export async function resetUserPasswordAction(
  targetUserId: string,
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const actor = await requireRole([
    UserRole.ADMIN,
  ]);

  const newPassword = String(
    formData.get("newPassword") ?? "",
  );

  const confirmPassword = String(
    formData.get("confirmPassword") ?? "",
  );

  const passwordError =
    getPasswordValidationError(
      newPassword,
    );

  if (passwordError) {
    return {
      error: passwordError,
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      error:
        "Yeni şifre ile şifre tekrarı eşleşmiyor.",
    };
  }

  const targetUser =
    await prisma.user.findUnique({
      where: {
        id: targetUserId,
      },
    });

  if (!targetUser) {
    return {
      error: "Kullanıcı bulunamadı.",
    };
  }

  if (
    !canManageTarget(actor, targetUser)
  ) {
    return {
      error:
        "Bu kullanıcının şifresini sıfırlama yetkiniz bulunmuyor.",
    };
  }

  const passwordHash = await bcrypt.hash(
    newPassword,
    12,
  );

  try {
    await prisma.$transaction(
      async (transaction) => {
        await transaction.user.update({
          where: {
            id: targetUser.id,
          },
          data: {
            passwordHash,
          },
        });

        const deletedSessions =
          await transaction.session.deleteMany({
            where: {
              userId: targetUser.id,
            },
          });

        await writeAuditLog({
          client: transaction,
          actor,
          action: "USER_PASSWORD_RESET",
          entityType: "User",
          entityId: targetUser.id,
          description: `${actor.name}, "${targetUser.name}" kullanıcısının şifresini sıfırladı.`,
          changes: {
            userName: targetUser.name,
            userEmail: targetUser.email,
            sessionsTerminated:
              deletedSessions.count,
            passwordChanged: true,
          },
        });
      },
    );
  } catch (error) {
    console.error(
      "Kullanıcı şifresi sıfırlanamadı:",
      error,
    );

    return {
      error:
        "Kullanıcı şifresi sıfırlanırken bir hata oluştu.",
    };
  }

  refreshUserPages();

  return {
    success: `${targetUser.name} kullanıcısının şifresi değiştirildi ve açık oturumları kapatıldı.`,
  };
}

export async function changeOwnPasswordAction(
  _previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const actor = await requireUser();

  const currentPassword = String(
    formData.get("currentPassword") ?? "",
  );

  const newPassword = String(
    formData.get("newPassword") ?? "",
  );

  const confirmPassword = String(
    formData.get("confirmPassword") ?? "",
  );

  if (!currentPassword) {
    return {
      error:
        "Mevcut şifrenizi girin.",
    };
  }

  const passwordError =
    getPasswordValidationError(
      newPassword,
    );

  if (passwordError) {
    return {
      error: passwordError,
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      error:
        "Yeni şifre ile şifre tekrarı eşleşmiyor.",
    };
  }

  const currentPasswordIsValid =
    await bcrypt.compare(
      currentPassword,
      actor.passwordHash,
    );

  if (!currentPasswordIsValid) {
    return {
      error:
        "Mevcut şifreniz hatalı.",
    };
  }

  const passwordIsUnchanged =
    await bcrypt.compare(
      newPassword,
      actor.passwordHash,
    );

  if (passwordIsUnchanged) {
    return {
      error:
        "Yeni şifreniz mevcut şifrenizden farklı olmalıdır.",
    };
  }

  const passwordHash = await bcrypt.hash(
    newPassword,
    12,
  );

  try {
    await prisma.$transaction(
      async (transaction) => {
        await transaction.user.update({
          where: {
            id: actor.id,
          },
          data: {
            passwordHash,
          },
        });

        const deletedSessions =
          await transaction.session.deleteMany({
            where: {
              userId: actor.id,
            },
          });

        await writeAuditLog({
          client: transaction,
          actor,
          action: "USER_PASSWORD_CHANGE",
          entityType: "User",
          entityId: actor.id,
          description: `${actor.name} kendi hesap şifresini değiştirdi.`,
          changes: {
            userName: actor.name,
            userEmail: actor.email,
            sessionsTerminated:
              deletedSessions.count,
            passwordChanged: true,
          },
        });
      },
    );
  } catch (error) {
    console.error(
      "Hesap şifresi değiştirilemedi:",
      error,
    );

    return {
      error:
        "Şifreniz değiştirilirken bir hata oluştu.",
    };
  }

  /*
   * Bütün oturumlar kapatıldığı için tarayıcıdaki
   * mevcut oturum çerezini de temizliyoruz.
   */
  await deleteSession();

  redirect("/yonetici-giris");
}

export async function deleteUserAction(
  targetUserId: string,
  _previousState: UserActionState,
  _formData: FormData,
): Promise<UserActionState> {
  const actor = await requireRole([
    UserRole.ADMIN,
  ]);

  const targetUser =
    await prisma.user.findUnique({
      where: {
        id: targetUserId,
      },
    });

  if (!targetUser) {
    return {
      error: "Kullanıcı bulunamadı.",
    };
  }

  if (
    !canManageTarget(actor, targetUser)
  ) {
    return {
      error:
        "Bu kullanıcıyı silme yetkiniz bulunmuyor.",
    };
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        await transaction.user.delete({
          where: {
            id: targetUser.id,
          },
        });

        await writeAuditLog({
          client: transaction,
          actor,
          action: "USER_DELETE",
          entityType: "User",
          entityId: targetUser.id,
          description: `${actor.name}, "${targetUser.name}" kullanıcısını sildi.`,
          changes: {
            name: targetUser.name,
            email: targetUser.email,
            role: targetUser.role,
            isActive:
              targetUser.isActive,
          },
        });
      },
    );
  } catch (error) {
    console.error(
      "Kullanıcı silinemedi:",
      error,
    );

    return {
      error:
        "Kullanıcı silinirken bir hata oluştu.",
    };
  }

  refreshUserPages();

  return {
    success: `${targetUser.name} kullanıcısı silindi.`,
  };
}