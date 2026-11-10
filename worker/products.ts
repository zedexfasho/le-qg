import { findVariant } from "@/lib/product";
import { SIZES, type Product, type Size } from "@/lib/types";
import { slugify } from "@/lib/format";
import { validateProduct } from "@/lib/validate-product";
import { HttpError, json, nowIso, readJson, type AppEnv } from "./http";

interface ProductRow {
  slug: string;
  data: string;
  published: number;
  updated_at: string;
}

export interface StoredProduct {
  product: Product;
  published: boolean;
  updatedAt: string;
}

const parse = (row: ProductRow): StoredProduct => ({ product: JSON.parse(row.data) as Product, published: !!row.published, updatedAt: row.updated_at });
const byNewest = (a: StoredProduct, b: StoredProduct) => b.product.createdAt.localeCompare(a.product.createdAt);

export async function loadProducts(env: AppEnv, options: { publishedOnly?: boolean; slugs?: string[] } = {}): Promise<StoredProduct[]> {
  if (options.slugs && options.slugs.length === 0) return [];
  let sql = "SELECT slug, data, published, updated_at FROM products";
  const where: string[] = [];
  const params: unknown[] = [];
  if (options.publishedOnly) where.push("published = 1");
  if (options.slugs) {
    where.push(`slug IN (${options.slugs.map(() => "?").join(",")})`);
    params.push(...options.slugs);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  const { results } = await env.DB.prepare(sql).bind(...params).all<ProductRow>();
  return results.map(parse).sort(byNewest);
}

/* ------------------------------ Public ------------------------------ */

/** Catalogue publié (utilisé au moment de construire le site) */
export async function publicCatalogue(env: AppEnv): Promise<Response> {
  const products = (await loadProducts(env, { publishedOnly: true })).map((p) => p.product);
  return json({ products, generatedAt: nowIso() }, 200, { "Cache-Control": "public, max-age=30" });
}

/** Stock en direct, pour corriger l'affichage des fiches produit entre deux publications */
export async function publicStock(env: AppEnv): Promise<Response> {
  const stored = await loadProducts(env, { publishedOnly: true });
  const stock: Record<string, Record<string, Partial<Record<Size, number>>>> = {};
  for (const { product } of stored) {
    stock[product.slug] = Object.fromEntries(product.variants.map((v) => [v.color, v.stock]));
  }
  return json({ stock, prices: Object.fromEntries(stored.map(({ product }) => [product.slug, product.price])) }, 200, {
    "Cache-Control": "public, max-age=20",
  });
}

/* ------------------------------ Stock ------------------------------- */

/**
 * Requêtes SQL qui ajoutent/retirent du stock de façon atomique (json_set relatif),
 * sans écraser une autre modification faite en même temps.
 */
export function stockStatements(env: AppEnv, products: readonly Product[], lines: readonly { slug: string; color: string; size: Size; qty: number }[], direction: -1 | 1): D1PreparedStatement[] {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const statements: D1PreparedStatement[] = [];
  for (const line of lines) {
    const product = bySlug.get(line.slug);
    if (!product) continue;
    const index = product.variants.findIndex((v) => v.color === line.color);
    if (index < 0 || product.variants[index].stock[line.size] === undefined) continue;
    const path = `$.variants[${index}].stock.${line.size}`;
    statements.push(
      env.DB.prepare(
        `UPDATE products SET data = json_set(data, ?1, max(0, coalesce(json_extract(data, ?1), 0) + ?2)), updated_at = ?3
         WHERE slug = ?4 AND json_extract(data, ?5) = ?6`,
      ).bind(path, direction * line.qty, nowIso(), line.slug, `$.variants[${index}].color`, line.color),
    );
  }
  return statements;
}

/* ------------------------------ Admin ------------------------------- */

export async function adminListProducts(env: AppEnv): Promise<Response> {
  const stored = await loadProducts(env);
  return json({ products: stored.map((s) => ({ ...s.product, published: s.published, updatedAt: s.updatedAt })) });
}

export async function adminGetProduct(env: AppEnv, slug: string): Promise<Response> {
  const [stored] = await loadProducts(env, { slugs: [slug] });
  if (!stored) throw new HttpError(404, "Produit introuvable.");
  return json({ product: stored.product, published: stored.published, updatedAt: stored.updatedAt });
}

/** Nettoie le produit reçu du formulaire et vérifie qu'il est complet */
function cleanProduct(input: Product, published: boolean): Product {
  const product: Product = {
    slug: input.slug,
    name: String(input.name ?? "").trim(),
    ...(input.brandLabel?.trim() ? { brandLabel: input.brandLabel.trim() } : {}),
    condition: String(input.condition ?? "").trim(),
    category: input.category,
    price: Number(input.price),
    ...(input.oldPrice ? { oldPrice: Number(input.oldPrice) } : {}),
    description: String(input.description ?? "").trim(),
    variants: (input.variants ?? []).map((v) => ({
      color: String(v.color ?? "").trim(),
      colorHex: String(v.colorHex ?? ""),
      images: (v.images ?? []).filter((src) => typeof src === "string" && /^\/(media|products)\/[\w./-]+$/.test(src)).slice(0, 8),
      stock: Object.fromEntries(
        Object.entries(v.stock ?? {})
          .filter(([size]) => (SIZES as readonly string[]).includes(size))
          .map(([size, n]) => [size, Number(n)]),
      ),
    })),
    ...(input.isNew ? { isNew: true } : {}),
    ...(input.dropId ? { dropId: String(input.dropId) } : {}),
    createdAt: input.createdAt && !Number.isNaN(Date.parse(input.createdAt)) ? input.createdAt : nowIso(),
  };
  // Un brouillon peut être enregistré sans photo ; un produit publié doit en avoir
  const errors = validateProduct(product, { requireImages: published });
  if (product.name.length > 120 || product.description.length > 3000) errors.push("Nom ou description trop long.");
  if (errors.length) throw new HttpError(400, "Le produit est incomplet.", { errors });
  return product;
}

export async function adminCreateProduct(request: Request, env: AppEnv): Promise<Response> {
  const body = await readJson<{ product?: Product; published?: boolean }>(request, 200_000);
  if (!body.product) throw new HttpError(400, "Produit manquant.");
  const slug = slugify(body.product.slug || body.product.name || "");
  const product = cleanProduct({ ...body.product, slug, createdAt: nowIso() }, body.published !== false);
  const exists = await env.DB.prepare("SELECT slug FROM products WHERE slug = ?").bind(product.slug).first();
  if (exists) throw new HttpError(409, "Un produit avec ce lien existe déjà : change le nom ou le lien.");
  await env.DB.prepare("INSERT INTO products (slug, data, published) VALUES (?, ?, ?)")
    .bind(product.slug, JSON.stringify(product), body.published === false ? 0 : 1)
    .run();
  return json({ product }, 201);
}

export async function adminUpdateProduct(request: Request, env: AppEnv, slug: string): Promise<Response> {
  const body = await readJson<{ product?: Product; published?: boolean; expectedUpdatedAt?: string }>(request, 200_000);
  const [stored] = await loadProducts(env, { slugs: [slug] });
  if (!stored) throw new HttpError(404, "Produit introuvable.");
  if (body.expectedUpdatedAt && body.expectedUpdatedAt !== stored.updatedAt) {
    throw new HttpError(409, "Ce produit a changé entre-temps (stock modifié par une commande ?). Recharge la page avant d'enregistrer.");
  }
  const published = body.published === undefined ? stored.published : body.published;
  const product = cleanProduct({ ...(body.product ?? stored.product), slug, createdAt: stored.product.createdAt }, published);
  const updatedAt = nowIso();
  await env.DB.prepare("UPDATE products SET data = ?, published = ?, updated_at = ? WHERE slug = ?")
    .bind(JSON.stringify(product), published ? 1 : 0, updatedAt, slug)
    .run();
  return json({ product, updatedAt });
}

export async function adminDeleteProduct(env: AppEnv, slug: string): Promise<Response> {
  const result = await env.DB.prepare("DELETE FROM products WHERE slug = ?").bind(slug).run();
  if (!result.meta.changes) throw new HttpError(404, "Produit introuvable.");
  return json({ ok: true });
}

/** Modification rapide du stock d'une taille (depuis la liste des produits) */
export async function adminSetStock(request: Request, env: AppEnv, slug: string): Promise<Response> {
  const body = await readJson<{ color?: string; size?: Size; stock?: number }>(request, 2_000);
  const stock = Number(body.stock);
  if (!Number.isInteger(stock) || stock < 0 || stock > 10_000) throw new HttpError(400, "Stock invalide.");
  const [stored] = await loadProducts(env, { slugs: [slug] });
  if (!stored) throw new HttpError(404, "Produit introuvable.");
  const index = stored.product.variants.findIndex((v) => v.color === body.color);
  if (index < 0 || !body.size || !(SIZES as readonly string[]).includes(body.size)) throw new HttpError(400, "Couleur ou taille inconnue.");
  const updatedAt = nowIso();
  await env.DB.prepare("UPDATE products SET data = json_set(data, ?, ?), updated_at = ? WHERE slug = ?")
    .bind(`$.variants[${index}].stock.${body.size}`, stock, updatedAt, slug)
    .run();
  const variant = findVariant(stored.product, body.color ?? "");
  if (variant) variant.stock[body.size] = stock;
  return json({ ok: true, updatedAt });
}
