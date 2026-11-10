import { findVariant, stockOf } from "./product";
import { SIZES, type Product, type Size } from "./types";

/* ------------------------------------------------------------------
   Logique pure des commandes, partagée par l'API (Worker), le dashboard
   et les tests. Aucune dépendance au navigateur ni à la base.
   ------------------------------------------------------------------ */

export const ORDER_STATUSES = ["nouvelle", "confirmee", "en_livraison", "livree", "annulee", "sans_suite"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  nouvelle: "Nouvelle",
  confirmee: "Confirmée",
  en_livraison: "En livraison",
  livree: "Livrée",
  annulee: "Annulée",
  sans_suite: "Sans suite",
};

export const STATUS_HINTS: Record<OrderStatus, string> = {
  nouvelle: "Reçue du site ou saisie, en attente de confirmation avec le client",
  confirmee: "Client confirmé, stock réservé, à préparer",
  en_livraison: "Remise au livreur",
  livree: "Livrée au client",
  annulee: "Annulée (le stock est remis en vente)",
  sans_suite: "Le client n'a pas donné suite (automatique après 3 jours)",
};

/** Statuts pour lesquels les articles sont sortis du stock */
export const STOCK_HOLDING: ReadonlySet<OrderStatus> = new Set(["confirmee", "en_livraison", "livree"]);
/** Statuts comptés dans le chiffre d'affaires */
export const VALIDATED: ReadonlySet<OrderStatus> = STOCK_HOLDING;
/** Statuts où les articles de la commande peuvent encore être modifiés */
export const EDITABLE: ReadonlySet<OrderStatus> = new Set(["nouvelle", "sans_suite"]);

export const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  nouvelle: ["confirmee", "annulee", "sans_suite"],
  sans_suite: ["confirmee", "annulee"],
  confirmee: ["en_livraison", "livree", "annulee"],
  en_livraison: ["livree", "confirmee", "annulee"],
  livree: [],
  annulee: ["confirmee"],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Sens du mouvement de stock lors d'un changement de statut : -1 sortie, +1 retour, 0 rien */
export function stockMovement(from: OrderStatus, to: OrderStatus): -1 | 0 | 1 {
  const before = STOCK_HOLDING.has(from);
  const after = STOCK_HOLDING.has(to);
  if (!before && after) return -1;
  if (before && !after) return 1;
  return 0;
}

export const ORDER_SOURCES = ["site", "whatsapp", "instagram", "tiktok", "snapchat", "boutique", "telephone", "autre"] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];
export const SOURCE_LABELS: Record<OrderSource, string> = {
  site: "Site",
  whatsapp: "WhatsApp direct",
  instagram: "Instagram",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  boutique: "En boutique",
  telephone: "Téléphone",
  autre: "Autre",
};

export const PAYMENT_METHODS = ["wave", "orange_money", "especes", "autre"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  especes: "Espèces (à la livraison)",
  autre: "Autre",
};

/* ---------------------------- Références --------------------------- */

/** Alphabet sans caractères ambigus (0/O, 1/I/L) : facile à lire et à dicter */
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ORDER_REF_RE = /^QG-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{7}$/;

export function generateOrderRef(randomBytes: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const bytes = randomBytes(7);
  let out = "";
  for (const b of bytes) out += REF_ALPHABET[b % REF_ALPHABET.length];
  return `QG-${out}`;
}

/** Normalise une saisie (« qg k7f3m9p ») ; renvoie null si ce n'est pas une référence */
export function parseOrderRef(input: string): string | null {
  const compact = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const body = compact.startsWith("QG") ? compact.slice(2) : compact;
  const ref = `QG-${body}`;
  return ORDER_REF_RE.test(ref) ? ref : null;
}

/* ------------------------- Lignes de commande ---------------------- */

export interface OrderItemInput {
  slug: string;
  color: string;
  size: Size;
  qty: number;
}

export type LineIssue = "produit_introuvable" | "couleur_introuvable" | "taille_introuvable" | "stock_insuffisant";

export const ISSUE_LABELS: Record<LineIssue, string> = {
  produit_introuvable: "Produit introuvable",
  couleur_introuvable: "Couleur introuvable",
  taille_introuvable: "Taille inexistante pour cette couleur",
  stock_insuffisant: "Stock insuffisant",
};

export interface PricedLine extends OrderItemInput {
  name: string;
  category?: string;
  unitPrice: number;
  image?: string;
  /** Stock disponible au moment du calcul */
  stock: number;
  issue?: LineIssue;
}

export const MAX_LINES = 30;
export const MAX_QTY = 50;

/** Valide une liste d'articles reçue du navigateur. Renvoie un message d'erreur ou la liste propre. */
export function parseItems(input: unknown): OrderItemInput[] | string {
  if (!Array.isArray(input) || input.length === 0) return "La commande ne contient aucun article.";
  if (input.length > MAX_LINES) return `Une commande est limitée à ${MAX_LINES} lignes.`;
  const out: OrderItemInput[] = [];
  for (const raw of input) {
    const x = raw as Partial<OrderItemInput>;
    if (
      typeof x !== "object" ||
      x === null ||
      typeof x.slug !== "string" ||
      x.slug.length > 120 ||
      typeof x.color !== "string" ||
      x.color.length > 80 ||
      !(SIZES as readonly string[]).includes(x.size as string) ||
      !Number.isInteger(x.qty) ||
      (x.qty as number) < 1 ||
      (x.qty as number) > MAX_QTY
    ) {
      return "Un article de la commande est invalide.";
    }
    out.push({ slug: x.slug, color: x.color, size: x.size as Size, qty: x.qty as number });
  }
  return mergeItems(out);
}

/** Regroupe les lignes identiques (même produit, couleur, taille) */
export function mergeItems<T extends OrderItemInput>(items: readonly T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = `${item.slug}\u0000${item.color}\u0000${item.size}`;
    const prev = map.get(key);
    map.set(key, prev ? { ...prev, qty: prev.qty + item.qty } : { ...item });
  }
  return [...map.values()];
}

/** Calcule les prix à partir du catalogue (jamais à partir du navigateur) */
export function priceItems(items: readonly OrderItemInput[], products: readonly Product[]): PricedLine[] {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  return items.map((item) => {
    const product = bySlug.get(item.slug);
    if (!product) return { ...item, name: item.slug, unitPrice: 0, stock: 0, issue: "produit_introuvable" as const };
    const variant = findVariant(product, item.color);
    const base = { ...item, name: product.name, category: product.category, unitPrice: product.price };
    if (!variant) return { ...base, stock: 0, issue: "couleur_introuvable" as const };
    const image = variant.images[0];
    if (variant.stock[item.size] === undefined) return { ...base, image, stock: 0, issue: "taille_introuvable" as const };
    const stock = stockOf(variant, item.size);
    return { ...base, image, stock, ...(stock < item.qty ? { issue: "stock_insuffisant" as const } : {}) };
  });
}

export function orderTotals(lines: readonly { qty: number; unitPrice: number }[], deliveryFee = 0) {
  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);
  return { subtotal, count, deliveryFee, total: subtotal + Math.max(0, deliveryFee) };
}

export interface Shortage {
  slug: string;
  name: string;
  color: string;
  size: Size;
  requested: number;
  available: number;
}

/**
 * Applique un mouvement de stock (-1 = sortie, +1 = retour) sur des copies des produits.
 * En sortie, refuse tout (aucune modification) s'il manque du stock, sauf `allowNegative`.
 * Les lignes dont le produit/couleur/taille n'existe plus sont ignorées.
 */
export function applyStock(
  products: readonly Product[],
  lines: readonly OrderItemInput[],
  direction: -1 | 1,
): { products: Product[]; changed: Set<string>; shortages: Shortage[] } {
  const copies = new Map(products.map((p) => [p.slug, structuredClone(p)]));
  const changed = new Set<string>();
  const shortages: Shortage[] = [];

  for (const line of mergeItems(lines)) {
    const product = copies.get(line.slug);
    const variant = product ? findVariant(product, line.color) : undefined;
    if (!product || !variant || variant.stock[line.size] === undefined) continue;
    const current = variant.stock[line.size] ?? 0;
    if (direction === -1 && current < line.qty) {
      shortages.push({ slug: line.slug, name: product.name, color: line.color, size: line.size, requested: line.qty, available: current });
      continue;
    }
    variant.stock[line.size] = current + direction * line.qty;
    changed.add(line.slug);
  }

  if (shortages.length) return { products: [...products], changed: new Set(), shortages };
  return { products: [...copies.values()], changed, shortages };
}
