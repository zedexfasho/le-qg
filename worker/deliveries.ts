/**
 * Page « Livraisons » : ce dont le livreur a besoin, et rien de plus
 * (pas de chiffres de ventes, pas de fichier clients).
 */
import { PAYMENT_LABELS, type OrderStatus, type PaymentMethod } from "@/lib/orders";
import type { Size } from "@/lib/types";
import type { User } from "./auth";
import { HttpError, json, nowIso, optText, readJson, type AppEnv } from "./http";

interface DeliveryRow {
  id: number;
  ref: string;
  status: OrderStatus;
  customer_name: string | null;
  customer_phone: string | null;
  district: string | null;
  delivery_zone: string | null;
  total: number;
  payment_method: PaymentMethod | null;
  paid: number;
  notes: string | null;
  confirmed_at: string | null;
  delivered_at: string | null;
}

/** Début de la journée à Dakar (UTC+0) */
const startOfToday = () => `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

export async function listDeliveries(env: AppEnv): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT id, ref, status, customer_name, customer_phone, district, delivery_zone, total, payment_method, paid, notes, confirmed_at, delivered_at
     FROM orders
     WHERE status IN ('confirmee','en_livraison') OR (status = 'livree' AND delivered_at >= ?)
     ORDER BY CASE status WHEN 'en_livraison' THEN 0 WHEN 'confirmee' THEN 1 ELSE 2 END, coalesce(confirmed_at, created_at)
     LIMIT 200`,
  )
    .bind(startOfToday())
    .all<DeliveryRow>();

  const ids = results.map((r) => r.id);
  const items = ids.length
    ? (
        await env.DB.prepare(`SELECT order_id, name, color, size, qty FROM order_items WHERE order_id IN (${ids.map(() => "?").join(",")}) ORDER BY id`)
          .bind(...ids)
          .all<{ order_id: number; name: string; color: string; size: Size; qty: number }>()
      ).results
    : [];

  // Encaissé aujourd'hui en espèces par l'équipe de livraison (événements « paiement » du jour)
  const cash = await env.DB.prepare(
    `SELECT coalesce(sum(o.total), 0) AS amount, count(*) AS n FROM order_events e JOIN orders o ON o.id = e.order_id
     WHERE e.type = 'paiement' AND e.note LIKE 'Encaissé à la livraison%' AND e.created_at >= ?`,
  )
    .bind(startOfToday())
    .first<{ amount: number; n: number }>();

  return json({
    deliveries: results.map((r) => ({
      id: r.id,
      ref: r.ref,
      status: r.status,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      district: r.district,
      zone: r.delivery_zone,
      total: r.total,
      paymentMethod: r.payment_method,
      paymentLabel: r.payment_method ? PAYMENT_LABELS[r.payment_method] : null,
      paid: !!r.paid,
      notes: r.notes,
      deliveredAt: r.delivered_at,
      items: items.filter((i) => i.order_id === r.id).map(({ name, color, size, qty }) => ({ name, color, size, qty })),
    })),
    cashToday: cash ?? { amount: 0, n: 0 },
  });
}

/**
 * Actions du livreur :
 * - depart : confirmée → en livraison
 * - livree : → livrée (+ encaissement en espèces si `cash`)
 * - souci : note dans l'historique (client absent, adresse introuvable…)
 */
export async function deliveryAction(request: Request, env: AppEnv, user: User, id: number): Promise<Response> {
  const body = await readJson<{ action?: unknown; cash?: unknown; note?: unknown }>(request, 2_000);
  const order = await env.DB.prepare("SELECT id, status, paid, total, payment_method FROM orders WHERE id = ?").bind(id).first<
    Pick<DeliveryRow, "id" | "status" | "paid" | "total" | "payment_method">
  >();
  if (!order) throw new HttpError(404, "Commande introuvable.");
  const now = nowIso();
  const event = (type: string, fields: { from?: string; to?: string; note?: string | null }) =>
    env.DB.prepare("INSERT INTO order_events (order_id, type, from_status, to_status, note, user_id, user_name) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(
      id,
      type,
      fields.from ?? null,
      fields.to ?? null,
      fields.note ?? null,
      user.id,
      user.name,
    );

  switch (body.action) {
    case "depart": {
      if (order.status !== "confirmee") throw new HttpError(409, "Cette commande n'est plus « à livrer » : recharge la page.");
      await env.DB.batch([
        env.DB.prepare("UPDATE orders SET status = 'en_livraison', updated_at = ? WHERE id = ? AND status = 'confirmee'").bind(now, id),
        event("statut", { from: "confirmee", to: "en_livraison", note: "Parti en livraison" }),
      ]);
      break;
    }
    case "livree": {
      if (order.status !== "confirmee" && order.status !== "en_livraison") throw new HttpError(409, "Cette commande n'est plus en livraison : recharge la page.");
      const cash = body.cash === true && !order.paid;
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE orders SET status = 'livree', delivered_at = ?1, updated_at = ?1${cash ? ", paid = 1, paid_at = ?1, payment_method = 'especes'" : ""} WHERE id = ?2 AND status = ?3`,
        ).bind(now, id, order.status),
        event("statut", { from: order.status, to: "livree", note: "Livrée" }),
        ...(cash ? [event("paiement", { note: `Encaissé à la livraison (espèces) par ${user.name}` })] : []),
      ]);
      break;
    }
    case "souci": {
      const note = optText(body.note, 500);
      if (!note) throw new HttpError(400, "Décris le souci en quelques mots.");
      await event("note", { note: `Livraison : ${note}` }).run();
      break;
    }
    default:
      throw new HttpError(400, "Action inconnue.");
  }
  return json({ ok: true });
}
