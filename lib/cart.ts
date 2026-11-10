import { stockOf, findVariant } from "./product";
import { SIZES, type CartItem, type OrderLine, type Product, type Size } from "./types";

/* ------------------------------------------------------------------
   Logique pure du panier (testée dans tests/cart.test.ts)
   ------------------------------------------------------------------ */

export const MAX_QTY_PER_LINE = 20;

export function sameLine(a: Pick<CartItem, "slug" | "color" | "size">, b: Pick<CartItem, "slug" | "color" | "size">): boolean {
  return a.slug === b.slug && a.color === b.color && a.size === b.size;
}

/** Ajoute (ou cumule) une ligne. `maxQty` = stock disponible. */
export function addLine(items: readonly CartItem[], item: CartItem, maxQty: number): CartItem[] {
  const limit = Math.max(0, Math.min(maxQty, MAX_QTY_PER_LINE));
  const existing = items.find((line) => sameLine(line, item));
  if (existing) {
    return items
      .map((line) => (sameLine(line, item) ? { ...line, qty: Math.min(line.qty + item.qty, limit) } : line))
      .filter((line) => line.qty > 0);
  }
  if (limit === 0 || item.qty <= 0) return [...items];
  return [...items, { ...item, qty: Math.min(item.qty, limit) }];
}

export function setLineQty(items: readonly CartItem[], target: CartItem, qty: number, maxQty: number): CartItem[] {
  const limit = Math.max(0, Math.min(maxQty, MAX_QTY_PER_LINE));
  const next = Math.max(0, Math.min(Math.floor(qty), limit));
  if (next === 0) return removeLine(items, target);
  return items.map((line) => (sameLine(line, target) ? { ...line, qty: next } : line));
}

export function removeLine(items: readonly CartItem[], target: CartItem): CartItem[] {
  return items.filter((line) => !sameLine(line, target));
}

/** Relit un panier stocké : ignore tout ce qui est mal formé */
export function parseCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (x): x is CartItem =>
        typeof x === "object" &&
        x !== null &&
        typeof x.slug === "string" &&
        typeof x.color === "string" &&
        (SIZES as readonly string[]).includes(x.size) &&
        Number.isInteger(x.qty) &&
        x.qty > 0,
    );
  } catch {
    return [];
  }
}

export interface ResolvedLine {
  item: CartItem;
  product?: Product;
  image?: string;
  /** Stock actuel pour cette couleur/taille */
  stock: number;
  /** Quantité réellement commandable (bornée par le stock) */
  qty: number;
  status: "ok" | "reduced" | "unavailable";
}

/** Croise le panier avec le catalogue actuel (prix, stock, produits retirés) */
export function resolveCart(items: readonly CartItem[], products: readonly Product[]): ResolvedLine[] {
  return items.map((item) => {
    const product = products.find((p) => p.slug === item.slug);
    const variant = product ? findVariant(product, item.color) : undefined;
    const stock = stockOf(variant, item.size as Size);
    const qty = Math.min(item.qty, stock);
    const status = !product || !variant || stock === 0 ? "unavailable" : qty < item.qty ? "reduced" : "ok";
    return { item, product, image: variant?.images[0], stock, qty, status };
  });
}

export function toOrderLines(lines: readonly ResolvedLine[]): OrderLine[] {
  return lines
    .filter((line) => line.product && line.status !== "unavailable" && line.qty > 0)
    .map((line) => ({
      name: line.product!.name,
      color: line.item.color,
      size: line.item.size,
      qty: line.qty,
      unitPrice: line.product!.price,
    }));
}

export function cartTotal(lines: readonly OrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
}

export function cartCount(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}
