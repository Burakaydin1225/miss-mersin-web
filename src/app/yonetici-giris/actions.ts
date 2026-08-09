"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { writeAuditLog } from "@/lib/audit";
import { createSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(
    formData.get("email") ?? "",
  )
    .trim()
    .toLowerCase();

  const password = String(
    formData.get("password") ?? "",
  );

  if (!email || !password) {
    return {
      error:
        "E-posta adresinizi ve şifrenizi girin.",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user || !user.isActive) {
    return {
      error:
        "E-posta adresi veya şifre hatalı.",
    };
  }

  const passwordIsValid =
    await bcrypt.compare(
      password,
      user.passwordHash,
    );

  if (!passwordIsValid) {
    return {
      error:
        "E-posta adresi veya şifre hatalı.",
    };
  }

  await createSession(user.id);

  try {
    await writeAuditLog({
      actor: user,
      action: "LOGIN_SUCCESS",
      entityType: "Session",
      entityId: user.id,
      description: `${user.name} yönetim panelinde oturum açtı.`,
      changes: {
        userId: user.id,
        email: user.email,
        role: user.role,
        loginAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    /*
     * Log kaydı başarısız olsa bile başarılı
     * giriş işlemini engellemiyoruz.
     */
    console.error(
      "Giriş hareketi kaydedilemedi:",
      error,
    );
  }

  redirect("/panel");
}