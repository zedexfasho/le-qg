import { normalizeText } from "./format";
import { sizesOf, stockOf } from "./product";
import { CATEGORIES, SIZES, type Category, type Product, type Size, type SortKey } from "./types";

/**
 * Filtres du catalogue, synchronisés avec l'URL pour pouvoir partager un lien :
 *   /shop/hoodies/?taille=M,L&couleur=Noir&min=10000&max=30000&tri=prix-asc&q=zip
 */
export interface FilterState {
  category?: Category;
  sizes: Size[];
  colors: string[];
  min?: number;
  max?: number;
  sort: SortKey;
  q?: string;
}

const SORT_TO_PARAM: Record<SortKey, string> = { new: "nouveautes", "price-asc": "prix-asc", "price-desc": "prix-desc" };
const PARAM_TO_SORT: Record<string, SortKey> = { nouveautes: "new", "prix-asc": "price-asc", "prix-desc": "price-desc" };

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "new", label: "Nouveautés" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
];

export const PRICE_RANGES: { label: string; min?: number; max?: number }[] = [
  { label: "Moins de 10 000", max: 10000 },
  { label: "10 000 – 25 000", min: 10000, max: 25000 },
  { label: "25 000 – 50 000", min: 25000, max: 50000 },
  { label: "Plus de 50 000", min: 50000 },
];

type ParamsLike = { get(name: string): string | null };

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseAmount(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

export function parseFilters(params: ParamsLike, fixedCategory?: Category): FilterState {
  const categoryParam = params.get("categorie");
  const category =
    fixedCategory ?? (CATEGORIES.includes(categoryParam as Category) ? (categoryParam as Category) : undefined);
  const sizes = parseList(params.get("taille")).filter((s): s is Size => (SIZES as readonly string[]).includes(s));
  const q = params.get("q")?.trim();
  return {
    category,
    sizes,
    colors: parseList(params.get("couleur")),
    min: parseAmount(params.get("min")),
    max: parseAmount(params.get("max")),
    sort: PARAM_TO_SORT[params.get("tri") ?? ""] ?? "new",
    q: q ? q.slice(0, 80) : undefined,
  };
}

/** Sérialise les filtres en query string (sans la catégorie quand elle est dans le chemin) */
export function serializeFilters(state: FilterState, options: { includeCategory?: boolean } = {}): string {
  const params = new URLSearchParams();
  if (options.includeCategory && state.category) params.set("categorie", state.category);
  if (state.q) params.set("q", state.q);
  if (state.sizes.length) params.set("taille", state.sizes.join(","));
  if (state.colors.length) params.set("couleur", state.colors.join(","));
  if (state.min !== undefined) params.set("min", String(state.min));
  if (state.max !== undefined) params.set("max", String(state.max));
  if (state.sort !== "new") params.set("tri", SORT_TO_PARAM[state.sort]);
  return params.toString();
}

export function countActiveFilters(state: FilterState): number {
  return state.sizes.length + state.colors.length + (state.min !== undefined || state.max !== undefined ? 1 : 0);
}

function matchesQuery(product: Product, q: string): boolean {
  const needle = normalizeText(q);
  const haystack = normalizeText(
    [product.name, product.description, product.category, product.brandLabel ?? "", ...product.variants.map((v) => v.color)].join(" "),
  );
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

export function applyFilters(products: readonly Product[], state: FilterState): Product[] {
  const result = products.filter((product) => {
    if (state.category && product.category !== state.category) return false;
    if (state.min !== undefined && product.price < state.min) return false;
    if (state.max !== undefined && product.price > state.max) return false;
    if (state.q && !matchesQuery(product, state.q)) return false;
    if (state.sizes.length === 0 && state.colors.length === 0) return true;
    // Une même variante doit avoir la couleur ET une des tailles demandées en stock
    return product.variants.some((variant) => {
      if (state.colors.length && !state.colors.includes(variant.color)) return false;
      if (state.sizes.length === 0) return true;
      return state.sizes.some((size) => stockOf(variant, size) > 0);
    });
  });

  return sortProducts(result, state.sort);
}

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const copy = [...products];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    default:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/** Couleurs et tailles présentes dans une liste de produits (pour construire les filtres) */
export function facetsOf(products: readonly Product[]): { colors: { name: string; hex: string }[]; sizes: Size[] } {
  const colors = new Map<string, string>();
  const sizes = new Set<Size>();
  for (const product of products) {
    for (const variant of product.variants) {
      if (!colors.has(variant.color)) colors.set(variant.color, variant.colorHex);
      for (const size of sizesOf(variant)) sizes.add(size);
    }
  }
  return {
    colors: [...colors].map(([name, hex]) => ({ name, hex })).sort((a, b) => a.name.localeCompare(b.name, "fr")),
    sizes: SIZES.filter((s) => sizes.has(s)),
  };
}
