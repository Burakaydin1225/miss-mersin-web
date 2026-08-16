"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavigationItem = {
  href: string;
  label: string;
  icon: string;
};

type Props = {
  userName: string;
  roleLabel: string;
  roleClassName: string;
  items: NavigationItem[];
  logoutAction: () => void | Promise<void>;
};

export function PanelSidebar({
  userName,
  roleLabel,
  roleClassName,
  items,
  logoutAction,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/panel") {
      return pathname === "/panel";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const navigation = (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
          Miss Mersin
        </p>
        <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">
          Yönetim Paneli
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-white text-neutral-950 shadow-sm"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span
                className={`flex size-8 items-center justify-center rounded-lg text-xs font-black ${
                  active ? "bg-neutral-100" : "bg-white/10"
                }`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <Link
          href="/panel/hesabim"
          onClick={() => setOpen(false)}
          className="block rounded-xl bg-white/5 p-3 transition hover:bg-white/10"
        >
          <p className="truncate text-sm font-semibold text-white">{userName}</p>
          <span
            className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${roleClassName}`}
          >
            {roleLabel}
          </span>
        </Link>

        <form action={logoutAction} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            Çıkış yap
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-black/[0.06] bg-white/95 px-4 backdrop-blur-xl lg:hidden">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
            Miss Mersin
          </p>
          <p className="text-sm font-semibold text-neutral-950">Yönetim Paneli</p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex size-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-lg font-bold text-neutral-800 shadow-sm"
          aria-label="Menüyü aç"
        >
          ☰
        </button>
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-neutral-950 lg:flex">
        {navigation}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
          />

          <aside className="relative flex h-full w-[86vw] max-w-[290px] flex-col bg-neutral-950 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-xl bg-white/10 text-xl text-white"
              aria-label="Menüyü kapat"
            >
              ×
            </button>
            {navigation}
          </aside>
        </div>
      ) : null}
    </>
  );
}
