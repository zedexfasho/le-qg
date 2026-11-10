"use client";

import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Modal } from "@/components/ui/Modal";
import { containerClasses } from "@/components/ui/styles";
import { useCartCount, useHydrated } from "@/lib/cart-store";

export const NAV_LINKS = [
  { href: "/shop/", label: "Catalogue" },
  { href: "/drops/", label: "Drops" },
  { href: "/notre-histoire/", label: "Notre histoire" },
  { href: "/infos/", label: "Infos" },
];

function SearchForm({ autoFocus = false, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  return (
    <Form action="/shop/" role="search" className="relative w-full" onSubmit={onDone}>
      <label htmlFor={autoFocus ? "search-mobile" : "search-desktop"} className="sr-only">
        Rechercher un article
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id={autoFocus ? "search-mobile" : "search-desktop"}
        name="q"
        type="search"
        autoFocus={autoFocus}
        placeholder="Hoodie, maillot, noir…"
        maxLength={80}
        enterKeyHint="search"
        className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-sm text-ink placeholder:text-muted/80 focus:border-accent focus:outline-none"
      />
    </Form>
  );
}

function CartButton() {
  const count = useCartCount();
  const hydrated = useHydrated();
  const shown = hydrated ? count : 0;
  return (
    <Link
      href="/panier/"
      className="relative grid size-11 place-items-center rounded-full hover:bg-ink/5"
      aria-label={shown > 0 ? `Panier, ${shown} article${shown > 1 ? "s" : ""}` : "Panier"}
    >
      <ShoppingBag className="size-6" aria-hidden="true" />
      {shown > 0 && (
        <span className="absolute top-0.5 right-0.5 grid min-w-5 place-items-center rounded-full bg-accent-strong px-1 text-[11px] leading-5 font-bold text-on-accent">
          {shown > 99 ? "99+" : shown}
        </span>
      )}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
      <div className={`${containerClasses} flex h-16 items-center gap-2 sm:h-18`}>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full hover:bg-ink/5 md:hidden"
          aria-label="Ouvrir le menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>

        <Link href="/" aria-label="Le QG — accueil" className="shrink-0 md:mr-4">
          <Logo variant="wordmark" width={104} priority />
        </Link>

        <nav aria-label="Navigation principale" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname.startsWith(link.href.replace(/\/$/, ""));
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-3 py-2 text-sm font-semibold hover:bg-ink/5 ${active ? "bg-ink/8" : ""}`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto hidden w-64 lg:block">
          <SearchForm />
        </div>

        <div className="ml-auto flex items-center lg:ml-2">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full hover:bg-ink/5 lg:hidden"
            aria-label="Rechercher"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-6" aria-hidden="true" />
          </button>
          <CartButton />
        </div>
      </div>

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" layout="sheet">
        <nav aria-label="Menu mobile">
          <ul className="flex flex-col gap-1">
            {[{ href: "/", label: "Accueil" }, ...NAV_LINKS, { href: "/panier/", label: "Panier" }].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-2xl px-4 py-3 font-display text-xl font-bold hover:bg-ink/5"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Modal>

      <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Rechercher au QG" layout="sheet">
        {searchOpen && <SearchForm autoFocus onDone={() => setSearchOpen(false)} />}
      </Modal>
    </header>
  );
}
