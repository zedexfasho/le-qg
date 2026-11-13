import { drops, products } from "@/data/products";
import type { Category, Drop, Product } from "./types";

/**
 * SEUL point d'accès aux données du site.
 *
 * Les fonctions sont asynchrones exprès : en v2, il suffira de remplacer
 * leur contenu par des requêtes Supabase, sans toucher aux pages.
 */

const byNewest = (a: Product, b: Product) => b.createdAt.localeCompare(a.createdAt);

export async function getProducts(): Promise<Product[]> {
  return [...products].sort(byNewest);
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  return products.find((p) => p.slug === slug);
}

export async function getProductsByCategory(category: Category): Promise<Product[]> {
  return (await getProducts()).filter((p) => p.category === category);
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  return (await getProducts()).slice(0, limit);
}

export async function getSimilarProducts(product: Product, limit = 4): Promise<Product[]> {
  const all = await getProducts();
  const sameCategory = all.filter((p) => p.slug !== product.slug && p.category === product.category);
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);
  // Complète avec d'autres nouveautés pour ne jamais afficher une section vide
  const others = all.filter((p) => p.slug !== product.slug && p.category !== product.category);
  return [...sameCategory, ...others].slice(0, limit);
}

/** Drops affichés sur le site : seulement ceux qui ont au moins une pièce publiée, du plus récent au plus ancien */
export async function getDrops(): Promise<Drop[]> {
  const products = await getProducts();
  return drops.filter((d) => products.some((p) => p.dropId === d.id)).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getDrop(id: string): Promise<Drop | undefined> {
  return (await getDrops()).find((d) => d.id === id);
}

export async function getLatestDrop(): Promise<Drop | undefined> {
  return (await getDrops())[0];
}

export async function getDropProducts(id: string): Promise<Product[]> {
  return (await getProducts()).filter((p) => p.dropId === id);
}
