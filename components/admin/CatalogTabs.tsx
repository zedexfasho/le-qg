"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/produits/", label: "Produits", match: (p: string) => p.startsWith("/admin/produit") },
  { href: "/admin/drops/", label: "Drops", match: (p: string) => p.startsWith("/admin/drop") },
  { href: "/admin/demandes/", label: "Demandes de retour", match: (p: string) => p.startsWith("/admin/demandes") },
];

/** Sous-menu de la rubrique Produits (le menu du bas n'a plus de place sur téléphone) */
export function CatalogTabs({ counts = {} }: { counts?: Partial<Record<"Demandes de retour", number>> }) {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Rubrique produits" className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {TABS.map(({ href, label, match }) => {
        const active = match(pathname);
        const count = counts[label as "Demandes de retour"];
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
              active ? "border-accent-strong bg-accent-strong text-on-accent" : "border-line hover:bg-ink/5"
            }`}
          >
            {label}
            {!!count && (
              <span className={`grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] leading-5 font-bold ${active ? "bg-on-accent/20" : "bg-orange-deep text-cream"}`}>
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
