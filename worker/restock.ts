import { findVariant, sizesOf, stockOf } from "@/lib/product";
import { RESTOCK_STATUSES, validateRestockContact, type RestockStatus } from "@/lib/restock";
import { SIZES, type Size } from "@/lib/types";
import { HttpError, clientIp, json, nowIso, rateLimit, readJson, type AppEnv } from "./http";
import { loadProducts } from "./products";

interface RestockRow {
  id: number;
  slug: string;
  product_name: string;
  color: string;
  size: Size | null;
  phone: string;
  name: string | null;
  status: RestockStatus;
  created_at: string;
  notified_at: string | null;
}

/* ------------------------------ Public ------------------------------ */

/** Le client laisse son numéro sur une fiche produit pour être prévenu du retour en stock */
export async function publicCreateRestock(request: Request, env: AppEnv): Promise<Response> {
  if (!(await rateLimit(env, `restock:${clientIp(request)}`, 10, 3600))) {
    throw new HttpError(429, "Trop de demandes envoyées. Réessaie plus tard.");
  }
  const body = await readJson<{ slug?: unknown; color?: unknown; size?: unknown; name?: unknown; phone?: unknown; website?: unknown }>(request, 4_000);
  // Champ invisible rempli = robot : on fait comme si tout allait bien
  if (typeof body.website === "string" && body.website.trim()) return json({ ok: true }, 201);

  const { data, errors } = validateRestockContact({ name: body.name, phone: body.phone });
  if (!data) throw new HttpError(400, "Vérifie ton numéro.", { fields: errors });

  const slug = typeof body.slug === "string" ? body.slug : "";
  const [stored] = await loadProducts(env, { publishedOnly: true, slugs: [slug] });
  const variant = stored && typeof body.color === "string" ? findVariant(stored.product, body.color) : undefined;
  if (!stored || !variant) throw new HttpError(400, "Ce modèle n'est plus disponible.");
  const size = body.size === undefined || body.size === null || body.size === "" ? null : (body.size as Size);
  if (size !== null && (!(SIZES as readonly string[]).includes(size) || !sizesOf(variant).includes(size))) {
    throw new HttpError(400, "Taille inconnue pour ce modèle.");
  }

  // Même demande déjà en attente : rien à ajouter
  const existing = await env.DB.prepare(
    "SELECT id FROM restock_requests WHERE slug = ? AND color = ? AND coalesce(size, '') = ? AND phone = ? AND status = 'en_attente'",
  )
    .bind(slug, variant.color, size ?? "", data.phone)
    .first<{ id: number }>();
  if (!existing) {
    await env.DB.prepare("INSERT INTO restock_requests (slug, product_name, color, size, phone, name) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(slug, stored.product.name, variant.color, size, data.phone, data.name)
      .run();
  }
  return json({ ok: true }, 201);
}

/* ---------------------------- Dashboard ----------------------------- */

/** Stock actuel de la pièce demandée (taille précise, ou toutes tailles confondues) */
async function availability(env: AppEnv, rows: RestockRow[]): Promise<Map<number, number>> {
  const products = await loadProducts(env, { slugs: [...new Set(rows.map((r) => r.slug))] });
  const bySlug = new Map(products.map((p) => [p.product.slug, p]));
  const result = new Map<number, number>();
  for (const r of rows) {
    const stored = bySlug.get(r.slug);
    const variant = stored?.published ? findVariant(stored.product, r.color) : undefined;
    const stock = !variant ? 0 : r.size ? stockOf(variant, r.size) : sizesOf(variant).reduce((n, s) => n + stockOf(variant, s), 0);
    result.set(r.id, stock);
  }
  return result;
}

const toJson = (r: RestockRow, stock: number) => ({
  id: r.id,
  slug: r.slug,
  productName: r.product_name,
  color: r.color,
  size: r.size,
  phone: r.phone,
  name: r.name,
  status: r.status,
  createdAt: r.created_at,
  notifiedAt: r.notified_at,
  stock,
});

/** Demandes en attente + celles traitées ces 30 derniers jours */
export async function adminListRestock(env: AppEnv): Promise<Response> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { results } = await env.DB.prepare(
    `SELECT * FROM restock_requests
     WHERE status = 'en_attente' OR coalesce(notified_at, created_at) >= ?
     ORDER BY status = 'en_attente' DESC, created_at DESC LIMIT 500`,
  )
    .bind(since)
    .all<RestockRow>();
  const stock = await availability(env, results);
  return json({ requests: results.map((r) => toJson(r, stock.get(r.id) ?? 0)) });
}

export async function adminUpdateRestock(request: Request, env: AppEnv, id: number): Promise<Response> {
  const body = await readJson<{ status?: unknown }>(request, 500);
  const status = body.status as RestockStatus;
  if (!RESTOCK_STATUSES.includes(status)) throw new HttpError(400, "Statut inconnu.");
  const result = await env.DB.prepare("UPDATE restock_requests SET status = ?, notified_at = ? WHERE id = ?")
    .bind(status, status === "prevenu" ? nowIso() : null, id)
    .run();
  if (!result.meta.changes) throw new HttpError(404, "Demande introuvable.");
  return json({ ok: true });
}

/** Pour l'accueil du dashboard : demandes en attente, et combien peuvent être servies maintenant */
export async function restockSummary(env: AppEnv): Promise<{ pending: number; ready: number }> {
  const { results } = await env.DB.prepare("SELECT * FROM restock_requests WHERE status = 'en_attente' LIMIT 500").all<RestockRow>();
  if (!results.length) return { pending: 0, ready: 0 };
  const stock = await availability(env, results);
  return { pending: results.length, ready: results.filter((r) => (stock.get(r.id) ?? 0) > 0).length };
}
