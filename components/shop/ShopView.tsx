"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { HangerIcon } from "@/components/brand/Decor";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Modal } from "@/components/ui/Modal";
import { buttonClasses } from "@/components/ui/styles";
import { categories } from "@/data/categories";
import {
  PRICE_RANGES,
  SORT_OPTIONS,
  applyFilters,
  countActiveFilters,
  facetsOf,
  parseFilters,
  serializeFilters,
  type FilterState,
} from "@/lib/filters";
import type { Category, Product, Size, SortKey } from "@/lib/types";

interface ShopViewProps {
  products: Product[];
  /** Catégorie imposée par l'URL /shop/[category] */
  category?: Category;
}

export function ShopView({ products, category }: ShopViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const state = useMemo(() => parseFilters(searchParams, category), [searchParams, category]);
  const scoped = useMemo(() => (category ? products.filter((p) => p.category === category) : products), [products, category]);
  const facets = useMemo(() => facetsOf(scoped), [scoped]);
  const results = useMemo(() => applyFilters(products, state), [products, state]);
  const active = countActiveFilters(state);

  const update = (patch: Partial<FilterState>) => {
    const query = serializeFilters({ ...state, ...patch });
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const toggle = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const resetAll = () => update({ sizes: [], colors: [], min: undefined, max: undefined, q: undefined });

  /** Liens de catégorie qui conservent les autres filtres */
  const categoryHref = (id?: Category) => {
    const query = serializeFilters({ ...state, category: undefined });
    const base = id ? `/shop/${id}/` : "/shop/";
    return query ? `${base}?${query}` : base;
  };

  const filters = (
    <div className="space-y-7">
      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Catégorie</h2>
        <ul className="flex flex-wrap gap-2 md:flex-col md:gap-1">
          <li>
            <Link href={categoryHref()} className={chip(!category)} aria-current={!category ? "page" : undefined} onClick={() => setSheetOpen(false)}>
              Tout
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={categoryHref(c.id)} className={chip(category === c.id)} aria-current={category === c.id ? "page" : undefined} onClick={() => setSheetOpen(false)}>
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {facets.sizes.length > 0 && (
        <fieldset>
          <legend className="mb-3 font-display text-lg font-bold">Taille dispo</legend>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s: Size) => (
              <label key={s} className={`${chip(state.sizes.includes(s))} cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent`}>
                <input type="checkbox" className="sr-only" checked={state.sizes.includes(s)} onChange={() => update({ sizes: toggle(state.sizes, s) })} />
                {s === "TU" ? "Taille unique" : s}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {facets.colors.length > 0 && (
        <fieldset>
          <legend className="mb-3 font-display text-lg font-bold">Couleur</legend>
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => (
              <label key={c.name} className={`${chip(state.colors.includes(c.name))} cursor-pointer gap-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent`}>
                <input type="checkbox" className="sr-only" checked={state.colors.includes(c.name)} onChange={() => update({ colors: toggle(state.colors, c.name) })} />
                <span className="size-4 rounded-full border border-ink/25" style={{ backgroundColor: c.hex }} aria-hidden="true" />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-3 font-display text-lg font-bold">Prix (FCFA)</legend>
        <div className="flex flex-wrap gap-2">
          {PRICE_RANGES.map((range) => {
            const selected = state.min === range.min && state.max === range.max;
            return (
              <label key={range.label} className={`${chip(selected)} cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selected}
                  onChange={() => (selected ? update({ min: undefined, max: undefined }) : update({ min: range.min, max: range.max }))}
                />
                {range.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {active > 0 && (
        <button type="button" onClick={resetAll} className="text-sm font-semibold underline underline-offset-4">
          Effacer les filtres
        </button>
      )}
    </div>
  );

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr]">
      <aside className="hidden md:block" aria-label="Filtres">
        <div className="sticky top-24">{filters}</div>
      </aside>

      <div>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setSheetOpen(true)} className={buttonClasses("secondary", "md", "md:hidden")}>
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filtres{active > 0 ? ` (${active})` : ""}
          </button>
          <p className="text-sm text-muted" aria-live="polite">
            {results.length} article{results.length > 1 ? "s" : ""}
          </p>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden sm:inline">Trier par</span>
            <select
              value={state.sort}
              onChange={(e) => update({ sort: e.target.value as SortKey })}
              className="h-11 rounded-full border border-line bg-surface px-4 font-semibold text-ink"
              aria-label="Trier les articles"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {state.q && (
          <p className="mb-5 flex flex-wrap items-center gap-2 text-sm">
            Résultats pour <strong>« {state.q} »</strong>
            <button type="button" onClick={() => update({ q: undefined })} className="inline-flex items-center gap-1 rounded-full bg-ink/8 px-3 py-1 font-semibold">
              <X className="size-3.5" aria-hidden="true" /> Effacer
            </button>
          </p>
        )}

        {results.length > 0 ? (
          <ProductGrid products={results} priorityCount={2} headingLevel={2} />
        ) : (
          <div className="flex flex-col items-center rounded-3xl bg-surface-2 px-6 py-14 text-center">
            <HangerIcon className="mb-4 size-14 text-muted" strokeWidth={1.5} />
            <p className="font-display text-2xl font-bold">Rien ici pour l&apos;instant…</p>
            <p className="mt-2 max-w-sm text-muted">Essaie d&apos;enlever un filtre, ou repasse bientôt : de nouveaux drops arrivent chaque semaine.</p>
            {(active > 0 || state.q) && (
              <button type="button" onClick={resetAll} className={buttonClasses("primary", "md", "mt-6")}>
                Effacer les filtres
              </button>
            )}
          </div>
        )}
      </div>

      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filtres"
        layout="sheet"
        footer={
          <button type="button" onClick={() => setSheetOpen(false)} className={buttonClasses("primary", "lg", "w-full")}>
            Voir {results.length} article{results.length > 1 ? "s" : ""}
          </button>
        }
      >
        {filters}
      </Modal>
    </div>
  );
}

function chip(selected: boolean): string {
  return `inline-flex min-h-10 items-center rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
    selected ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-ink/40"
  }`;
}
