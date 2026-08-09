"use server";

import { redirect } from "next/navigation";

import {
  deleteSession,
  getCurrentUser,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function logoutAction() {
  /*
   * Oturum silinmeden önce kullanıcı bilgisini
   * alıyoruz. Oturum silindikten sonra işlemi
   * yapan kullanıcı tespit edilemez.
   */
  const user = await getCurrentUser();

  if (user) {
    try {
      await writeAuditLog({
        actor: user,
        action: "LOGOUT",
        entityType: "Session",
        entityId: user.id,
        description: `${user.name} oturumunu kapattı.`,
        changes: {
          userId: user.id,
          email: user.email,
          role: user.role,
          logoutAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      /*
       * Log kaydı başarısız olsa bile kullanıcının
       * çıkış yapmasını engellemiyoruz.
       */
      console.error(
        "Çıkış hareketi kaydedilemedi:",
        error,
      );
    }
  }

  await deleteSession();

  redirect("/yonetici-giris");
}