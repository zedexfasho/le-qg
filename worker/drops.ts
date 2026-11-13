import { validateDrop } from "@/lib/drops";
import { slugify } from "@/lib/format";
import type { Drop } from "@/lib/types";
import { HttpError, json, nowIso, readJson, type AppEnv } from "./http";

interface DropRow {
  id: string;
  title: string;
  date: string;
  description: string | null;
  cover: string | null;
  updated_at: string;
}

const toDrop = (row: DropRow): Drop => ({
  id: row.id,
  title: row.title,
  date: row.date,
  ...(row.cover ? { cover: row.cover } : {}),
  ...(row.description ? { description: row.description } : {}),
});

/** Tous les drops, du plus récent au plus ancien (le site n'affiche que ceux qui ont un produit publié) */
export async function loadDrops(env: AppEnv): Promise<Drop[]> {
  const { results } = await env.DB.prepare("SELECT id, title, date, description, cover, updated_at FROM drops ORDER BY date DESC").all<DropRow>();
  return results.map(toDrop);
}

/** Nombre de produits rattachés à chaque drop (publiés / au total) */
async function dropCounts(env: AppEnv): Promise<Map<string, { total: number; published: number }>> {
  const { results } = await env.DB.prepare(
    `SELECT json_extract(data, '$.dropId') AS drop_id, count(*) AS total, sum(published) AS published
     FROM products WHERE json_extract(data, '$.dropId') IS NOT NULL GROUP BY drop_id`,
  ).all<{ drop_id: string; total: number; published: number }>();
  return new Map(results.map((r) => [r.drop_id, { total: r.total, published: r.published ?? 0 }]));
}

export async function adminListDrops(env: AppEnv): Promise<Response> {
  const [drops, counts] = await Promise.all([loadDrops(env), dropCounts(env)]);
  return json({
    drops: drops.map((d) => ({ ...d, products: counts.get(d.id)?.total ?? 0, publishedProducts: counts.get(d.id)?.published ?? 0 })),
  });
}

export async function adminGetDrop(env: AppEnv, id: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT id, title, date, description, cover, updated_at FROM drops WHERE id = ?").bind(id).first<DropRow>();
  if (!row) throw new HttpError(404, "Drop introuvable.");
  const counts = (await dropCounts(env)).get(id);
  return json({ drop: toDrop(row), products: counts?.total ?? 0, publishedProducts: counts?.published ?? 0 });
}

function checked(body: Record<string, unknown>) {
  const { data, errors } = validateDrop(body);
  if (!data) throw new HttpError(400, "Vérifie les informations du drop.", { fields: errors });
  return data;
}

export async function adminCreateDrop(request: Request, env: AppEnv): Promise<Response> {
  const data = checked(await readJson(request, 4_000));
  // Lien de la page tiré du nom ; suffixe si déjà pris (deux « Drop de décembre » sur deux années…)
  const base = slugify(data.title) || "drop";
  let id = base;
  for (let n = 2; await env.DB.prepare("SELECT 1 FROM drops WHERE id = ?").bind(id).first(); n++) id = `${base}-${n}`;
  await env.DB.prepare("INSERT INTO drops (id, title, date, description, cover) VALUES (?, ?, ?, ?, ?)")
    .bind(id, data.title, data.date, data.description, data.cover)
    .run();
  return json({ drop: toDrop({ id, ...data, updated_at: nowIso() }) }, 201);
}

export async function adminUpdateDrop(request: Request, env: AppEnv, id: string): Promise<Response> {
  const data = checked(await readJson(request, 4_000));
  const result = await env.DB.prepare("UPDATE drops SET title = ?, date = ?, description = ?, cover = ?, updated_at = ? WHERE id = ?")
    .bind(data.title, data.date, data.description, data.cover, nowIso(), id)
    .run();
  if (!result.meta.changes) throw new HttpError(404, "Drop introuvable.");
  return json({ drop: toDrop({ id, ...data, updated_at: nowIso() }) });
}

/** Supprime le drop ; ses produits restent en vente, simplement sans drop */
export async function adminDeleteDrop(env: AppEnv, id: string): Promise<Response> {
  const [, deleted] = await env.DB.batch([
    env.DB.prepare(
      "UPDATE products SET data = json_remove(data, '$.dropId'), updated_at = ? WHERE json_extract(data, '$.dropId') = ?",
    ).bind(nowIso(), id),
    env.DB.prepare("DELETE FROM drops WHERE id = ?").bind(id),
  ]);
  if (!deleted.meta.changes) throw new HttpError(404, "Drop introuvable.");
  return json({ ok: true });
}
