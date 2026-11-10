import { SIZES, type Product, type Size, type Variant } from "./types";

export const PLACEHOLDER_IMAGE = "/products/placeholder.webp";

/** Tailles proposées pour une variante, dans l'ordre XS → XXL, TU */
export function sizesOf(variant: Variant): Size[] {
  return SIZES.filter((size) => variant.stock[size] !== undefined);
}

/** Stock d'une taille (0 si absente ou invalide) */
export function stockOf(variant: Variant | undefined, size: Size | undefined): number {
  if (!variant || !size) return 0;
  const value = variant.stock[size];
  return typeof value === "number" && value > 0 ? Math.floor(value) : 0;
}

export function isVariantInStock(variant: Variant): boolean {
  return sizesOf(variant).some((size) => stockOf(variant, size) > 0);
}

export function isProductInStock(product: Product): boolean {
  return product.variants.some(isVariantInStock);
}

export function findVariant(product: Product, color: string): Variant | undefined {
  return product.variants.find((v) => v.color === color);
}

/** Index de la première variante disponible (0 si tout est en rupture) */
export function defaultVariantIndex(product: Product): number {
  const index = product.variants.findIndex(isVariantInStock);
  return index === -1 ? 0 : index;
}

/** Image principale du produit (première variante dispo), ou placeholder */
export function mainImage(product: Product): string {
  const variant = product.variants[defaultVariantIndex(product)];
  return variant?.images[0] ?? PLACEHOLDER_IMAGE;
}

/** Deuxième image (affichée au survol des cartes), si elle existe */
export function hoverImage(product: Product): string | undefined {
  return product.variants[defaultVariantIndex(product)]?.images[1];
}

export function discountPercent(product: Product): number | null {
  if (!product.oldPrice || product.oldPrice <= product.price) return null;
  return Math.round((1 - product.price / product.oldPrice) * 100);
}
