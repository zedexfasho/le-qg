export const CATEGORIES = ["hoodies", "ensembles", "joggings", "tshirts", "maillots", "chemises", "accessoires"] as const;
export type Category = (typeof CATEGORIES)[number];

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "TU"] as const;
export type Size = (typeof SIZES)[number];

export interface Variant {
  /** Nom de la couleur, ex. "Gris chiné" */
  color: string;
  /** Couleur de la pastille, ex. "#C9C9C9" */
  colorHex: string;
  /** Chemins des images (la première sert d'image principale) */
  images: string[];
  /** Stock par taille. 0 = rupture pour cette taille. Taille absente = n'existe pas. */
  stock: Partial<Record<Size, number>>;
}

export interface Product {
  slug: string;
  name: string;
  /** Marque mentionnée de façon factuelle, si pertinent */
  brandLabel?: string;
  /** Affiché tel quel, doit être exact. Ex. "Neuf avec étiquette" */
  condition: string;
  category: Category;
  /** Prix en FCFA (entier) */
  price: number;
  /** Ancien prix barré (promo) */
  oldPrice?: number;
  description: string;
  variants: Variant[];
  isNew?: boolean;
  dropId?: string;
  /** Date ISO, utilisée pour le tri "nouveautés" */
  createdAt: string;
}

export interface Drop {
  id: string;
  title: string;
  /** Date ISO */
  date: string;
  /** Image de couverture */
  cover: string;
  description?: string;
}

/** Ligne de panier telle que stockée dans le navigateur */
export interface CartItem {
  slug: string;
  color: string;
  size: Size;
  qty: number;
}

/** Ligne de commande prête à être envoyée sur WhatsApp */
export interface OrderLine {
  name: string;
  color: string;
  size: Size;
  qty: number;
  /** Prix unitaire en FCFA */
  unitPrice: number;
}

export type SortKey = "new" | "price-asc" | "price-desc";
