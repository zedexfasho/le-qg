"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Pencil, Plus, Search } from "lucide-react";
import { useState } from "react";
import { ProductImage } from "@/components/product/ProductImage";
import { buttonClasses } from "@/components/ui/styles";
import { getCategoryInfo } from "@/data/categories";
import { api, useApi } from "@/lib/admin/api";
import type { AdminProduct } from "@/lib/admin/types";
import { formatPrice, normalizeText } from "@/lib/format";
import { mainImage, sizesOf, stockOf } from "@/lib/product";
import type { Size } from "@/lib/types";
import { CatalogTabs } from "../CatalogTabs";
import { PublishButton } from "../PublishButton";
import {
  EmptyState,
  ErrorBox,
  Loading,
  PageHeader,
  inputClasses,
  panelClasses,
  useToast,
} from "../ui";

type Filter = "tous" | "publies" | "brouillons" | "rupture";

const totalStock = (p: AdminProduct) =>
  p.variants.reduce(
    (s, v) => s + sizesOf(v).reduce((n, size) => n + stockOf(v, size), 0),
    0,
  );
const hasOutOfStock = (p: AdminProduct) =>
  p.variants.some((v) => sizesOf(v).some((s) => stockOf(v, s) === 0));

export function ProductsPage() {
  const params = useSearchParams();
  const { data, error, loading, reload, setData } = useApi<{
    products: AdminProduct[];
  }>("/products");
  const [filter, setFilter] = useState<Filter>(
    (params.get("filtre") as Filter) || "tous",
  );
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const toast = useToast();

  const setStock = async (
    product: AdminProduct,
    color: string,
    size: Size,
    value: number,
  ) => {
    if (!Number.isInteger(value) || value < 0) return;
    try {
      const { updatedAt } = await api<{ updatedAt: string }>(
        `/products/${product.slug}/stock`,
        { body: { color, size, stock: value } },
      );
      setData((prev) =>
        prev
          ? {
              products: prev.products.map((p) =>
                p.slug !== product.slug
                  ? p
                  : {
                      ...p,
                      updatedAt,
                      variants: p.variants.map((v) =>
                        v.color === color
                          ? { ...v, stock: { ...v.stock, [size]: value } }
                          : v,
                      ),
                    },
              ),
            }
          : prev,
      );
      toast.ok(`Stock ${product.name} ${color} ${size} : ${value}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const q = normalizeText(search);
  const products = (data?.products ?? []).filter((p) => {
    if (filter === "publies" && !p.published) return false;
    if (filter === "brouillons" && p.published) return false;
    if (filter === "rupture" && !hasOutOfStock(p)) return false;
    return (
      !q ||
      normalizeText(
        `${p.name} ${p.category} ${p.variants.map((v) => v.color).join(" ")}`,
      ).includes(q)
    );
  });

  return (
    <>
      {toast.node}
      <CatalogTabs />
      <PageHeader
        title="Produits"
        subtitle="Le stock et les prix changent sur le site tout de suite. Nouveaux produits, photos et textes : clique sur « Publier le site »."
        actions={
          <>
            <PublishButton compact />
            <Link
              href="/admin/produit/?nouveau=1"
              className={buttonClasses("secondary", "md")}
            >
              <Plus className="size-4" aria-hidden="true" /> Nouveau produit
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit"
            aria-label="Rechercher un produit"
            className={`${inputClasses} pl-9`}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          aria-label="Filtrer"
          className={`${inputClasses} w-auto`}
        >
          <option value="tous">Tous</option>
          <option value="publies">En ligne</option>
          <option value="brouillons">Brouillons</option>
          <option value="rupture">Avec des ruptures</option>
        </select>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data &&
        (products.length ? (
          <ul className="space-y-3">
            {products.map((p) => {
              const isOpen = open === p.slug;
              const stock = totalStock(p);
              return (
                <li key={p.slug} className={`${panelClasses} p-0 sm:p-0`}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                    <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                      <ProductImage
                        src={mainImage(p)}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 basis-[calc(100%-4.25rem)] sm:basis-0">
                      <p className="line-clamp-2 font-semibold">
                        {p.name}{" "}
                        {!p.published && (
                          <span className="ml-1 rounded-full border border-line px-2 py-0.5 text-xs font-semibold">
                            Brouillon
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted">
                        {getCategoryInfo(p.category)?.label ?? p.category} ·{" "}
                        {p.price ? formatPrice(p.price) : "prix à définir"} ·{" "}
                        <span
                          className={
                            stock === 0
                              ? "font-semibold text-accent-strong"
                              : ""
                          }
                        >
                          {stock} en stock
                        </span>
                      </p>
                    </div>
                    <div className="ml-[4.25rem] flex gap-2 sm:ml-0">
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : p.slug)}
                        aria-expanded={isOpen}
                        className={buttonClasses("ghost", "md", "px-3")}
                      >
                        Stock{" "}
                        <ChevronDown
                          className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                      </button>
                      <Link
                        href={`/admin/produit/?slug=${p.slug}`}
                        className={buttonClasses("secondary", "md", "px-3")}
                        aria-label={`Modifier ${p.name}`}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="space-y-3 border-t border-line p-3">
                      {p.variants.map((v) => (
                        <div key={v.color}>
                          <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                            <span
                              className="size-4 rounded-full border border-line"
                              style={{ background: v.colorHex }}
                              aria-hidden="true"
                            />
                            {v.color}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {sizesOf(v).map((size) => (
                              <label
                                key={size}
                                className="flex items-center gap-1.5 rounded-xl border border-line px-2 py-1 text-sm"
                              >
                                <span className="w-7 font-semibold">
                                  {size}
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  inputMode="numeric"
                                  defaultValue={stockOf(v, size)}
                                  key={`${p.updatedAt}-${size}`}
                                  onBlur={(e) => {
                                    const value = Number(e.target.value);
                                    if (value !== stockOf(v, size))
                                      void setStock(p, v.color, size, value);
                                  }}
                                  aria-label={`Stock ${v.color} ${size}`}
                                  className={`h-9 w-16 rounded-lg border border-line bg-surface px-2 text-center tabular-nums ${stockOf(v, size) === 0 ? "text-accent-strong" : ""}`}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-muted">
                        Le stock est enregistré quand tu quittes la case. Il
                        baisse tout seul quand une commande est confirmée.
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Aucun produit ici">
            Change le filtre ou ajoute un nouveau produit.
          </EmptyState>
        ))}
    </>
  );
}
