import {
  createHash,
  randomBytes,
} from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

const SESSION_COOKIE_NAME =
  "catalog_session";

const SESSION_DURATION_DAYS = 7;

function hashSessionToken(
  token: string,
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export function isOwner(
  role: UserRole,
): boolean {
  return role === UserRole.OWNER;
}

export function isAdmin(
  role: UserRole,
): boolean {
  return (
    role === UserRole.OWNER ||
    role === UserRole.ADMIN
  );
}

export function canManageUsers(
  role: UserRole,
): boolean {
  return isAdmin(role);
}

export function canWriteProducts(
  role: UserRole,
): boolean {
  return (
    role === UserRole.OWNER ||
    role === UserRole.ADMIN ||
    role === UserRole.EDITOR
  );
}

export function canRemoveProducts(
  role: UserRole,
): boolean {
  return isAdmin(role);
}

export async function createSession(
  userId: string,
) {
  const token =
    randomBytes(32).toString("hex");

  const tokenHash =
    hashSessionToken(token);

  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() +
      SESSION_DURATION_DAYS,
  );

  /*
   * Aynı kullanıcıya ait süresi geçmiş
   * oturumları temizliyoruz.
   */
  await prisma.session.deleteMany({
    where: {
      userId,
      expiresAt: {
        lte: new Date(),
      },
    },
  });

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set(
    SESSION_COOKIE_NAME,
    token,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    },
  );
}

export async function deleteSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    SESSION_COOKIE_NAME,
  )?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        tokenHash:
          hashSessionToken(token),
      },
    });
  }

  cookieStore.delete(
    SESSION_COOKIE_NAME,
  );
}

export async function getCurrentUser() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    SESSION_COOKIE_NAME,
  )?.value;

  if (!token) {
    return null;
  }

  const tokenHash =
    hashSessionToken(token);

  const session =
    await prisma.session.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });

  if (!session) {
    return null;
  }

  if (
    session.expiresAt <= new Date()
  ) {
    await prisma.session
      .delete({
        where: {
          id: session.id,
        },
      })
      .catch(() => null);

    return null;
  }

  if (!session.user.isActive) {
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/yonetici-giris");
  }

  return user;
}

/*
 * OWNER bütün rol kontrollerinden otomatik
 * olarak geçer.
 *
 * Örnek:
 *
 * requireRole([UserRole.ADMIN])
 *
 * ADMIN ve OWNER erişebilir.
 *
 * requireRole([
 *   UserRole.ADMIN,
 *   UserRole.EDITOR,
 * ])
 *
 * ADMIN, EDITOR ve OWNER erişebilir.
 */
export async function requireRole(
  allowedRoles: UserRole[],
) {
  const user = await requireUser();

  const hasPermission =
    user.role === UserRole.OWNER ||
    allowedRoles.includes(user.role);

  if (!hasPermission) {
    redirect("/panel");
  }

  return user;
}

/*
 * Yalnızca ana hesap erişebilir.
 * Sistem hareketleri sayfasında bunu
 * kullanacağız.
 */
export async function requireOwner() {
  const user = await requireUser();

  if (user.role !== UserRole.OWNER) {
    redirect("/panel");
  }

  return user;
}