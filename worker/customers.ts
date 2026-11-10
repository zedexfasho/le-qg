import { normalizePhone } from "@/lib/phone";
import { HttpError, json, optText, readJson, type AppEnv } from "./http";

const VALIDATED = "('confirmee','en_livraison','livree')";

export async function adminListCustomers(request: Request, env: AppEnv): Promise<Response> {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const sort = url.searchParams.get("tri") === "recent" ? "last_order_at DESC" : "revenue DESC, last_order_at DESC";
  const where: string[] = [];
  const params: unknown[] = [];
  if (q) {
    const phone = normalizePhone(q);
    const digits = q.replace(/\D/g, "");
    const parts = ["c.name LIKE ?", "c.district LIKE ?"];
    params.push(`%${q}%`, `%${q}%`);
    if (phone) {
      parts.push("c.phone = ?");
      params.push(phone);
    } else if (digits.length >= 4) {
      parts.push("c.phone LIKE ?");
      params.push(`%${digits}%`);
    }
    where.push(`(${parts.join(" OR ")})`);
  }
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.phone, c.name, c.district, c.zone, c.created_at,
       count(o.id) AS orders, coalesce(sum(o.subtotal), 0) AS revenue, max(o.created_at) AS last_order_at
     FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status IN ${VALIDATED}
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY c.id ORDER BY ${sort} LIMIT 200`,
  )
    .bind(...params)
    .all();
  return json({ customers: results });
}

export async function adminGetCustomer(env: AppEnv, id: number): Promise<Response> {
  const customer = await env.DB.prepare("SELECT * FROM customers WHERE id = ?").bind(id).first();
  if (!customer) throw new HttpError(404, "Client introuvable.");
  const [orders, stats, favorites] = await Promise.all([
    env.DB.prepare(
      `SELECT o.id, o.ref, o.status, o.source, o.total, o.subtotal, o.paid, o.created_at,
         (SELECT coalesce(sum(qty), 0) FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100`,
    )
      .bind(id)
      .all(),
    env.DB.prepare(
      `SELECT count(*) AS orders, coalesce(sum(subtotal), 0) AS revenue, min(created_at) AS first_order_at, max(created_at) AS last_order_at
       FROM orders WHERE customer_id = ? AND status IN ${VALIDATED}`,
    )
      .bind(id)
      .first(),
    env.DB.prepare(
      `SELECT i.name, i.size, sum(i.qty) AS qty FROM order_items i JOIN orders o ON o.id = i.order_id
       WHERE o.customer_id = ? AND o.status IN ${VALIDATED} GROUP BY i.slug, i.size ORDER BY qty DESC LIMIT 5`,
    )
      .bind(id)
      .all(),
  ]);
  return json({ customer, orders: orders.results, stats, favorites: favorites.results });
}

export async function adminUpdateCustomer(request: Request, env: AppEnv, id: number): Promise<Response> {
  const body = await readJson<{ name?: unknown; district?: unknown; zone?: unknown; notes?: unknown }>(request, 8_000);
  const result = await env.DB.prepare(
    "UPDATE customers SET name = ?, district = ?, zone = ?, notes = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
  )
    .bind(optText(body.name, 120), optText(body.district, 120), optText(body.zone, 60), optText(body.notes, 2000), id)
    .run();
  if (!result.meta.changes) throw new HttpError(404, "Client introuvable.");
  return adminGetCustomer(env, id);
}

/** Recherche rapide par téléphone (formulaire de commande) */
export async function adminFindCustomerByPhone(request: Request, env: AppEnv): Promise<Response> {
  const phone = normalizePhone(new URL(request.url).searchParams.get("tel"));
  if (!phone) return json({ customer: null });
  const customer = await env.DB.prepare("SELECT id, phone, name, district, zone FROM customers WHERE phone = ?").bind(phone).first();
  return json({ customer });
}
