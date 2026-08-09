import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/yonetici-giris/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Yönetici Girişi",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default async function ManagerLoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/panel");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f4f0] px-4 py-12">
      <section className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.06] sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-neutral-950 text-lg font-bold text-white">
          K
        </div>

        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
          Güvenli erişim
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
          Yönetici girişi
        </h1>

        <p className="mt-3 text-sm leading-6 text-neutral-500">
          Yönetim paneline erişmek için hesap bilgilerinizi girin.
        </p>

        <LoginForm />
      </section>
    </main>
  );
}