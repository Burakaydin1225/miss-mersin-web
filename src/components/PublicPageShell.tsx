import Link from "next/link";
import type { ReactNode } from "react";

import { siteConfig } from "@/lib/site-config";

type PublicPageShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

const footerLinks = [
  {
    href: "#",
    label: "Hakkımızda",
  },
  {
    href: "/iletisim",
    label: "İletişim",
  },
  {
    href: "/ilan-yayinlama-kurallari",
    label: "İlan kuralları",
  },
  {
    href: "/gizlilik-politikasi",
    label: "Gizlilik",
  },
  {
    href: "/kullanim-kosullari",
    label: "Kullanım koşulları",
  },
];

export function PublicPageShell({
  eyebrow,
  title,
  description,
  children,
}: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-[#f4f4f0] text-neutral-950">
      <header className="border-b border-fuchsia-400/40 bg-black shadow-[0_0_22px_rgba(217,70,239,0.22)]">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link
            href="/"
            className="text-base font-black tracking-[0.03em] text-fuchsia-300 drop-shadow-[0_0_8px_rgba(232,121,249,1)] sm:text-xl"
          >
            {siteConfig.name}
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-cyan-300/60 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-300 hover:text-black"
          >
            İlanlara dön
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-black/[0.06] sm:p-9">
          {eyebrow ? (
            <p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-600">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            {title}
          </h1>

          {description ? (
            <p className="mt-4 text-sm leading-7 text-neutral-600 sm:text-base">
              {description}
            </p>
          ) : null}

          <div className="mt-8 space-y-6 text-sm leading-7 text-neutral-700 sm:text-base">
            {children}
          </div>
        </section>
      </main>

      <footer className="border-t border-black/[0.06] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-7">
          <nav
            aria-label="Alt menü"
            className="flex flex-wrap justify-center gap-x-5 gap-y-2"
          >
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium text-neutral-500 transition hover:text-neutral-950"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="mt-5 text-center text-xs text-neutral-400">
            © {new Date().getFullYear()}{" "}
            {siteConfig.name}
          </p>
        </div>
      </footer>
    </div>
  );
}
