import { site } from "@/data/site";
import { formatPrice } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import {
  EDITABLE,
  ORDER_REF_RE,
  ORDER_SOURCES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  STATUS_LABELS,
  applyStock,
  canTransition,
  generateOrderRef,
  orderTotals,
  parseItems,
  parseOrderRef,
  priceItems,
  stockMovement,
  type OrderSource,
  type OrderStatus,
  type PaymentMethod,
  type PricedLine,
} from "@/lib/orders";
import type { Size } from "@/lib/types";
import type { User } from "./auth";
import { HttpError, clientIp, json, nowIso, optInt, optText, rateLimit, readJson, type AppEnv } from "./http";
import { notifyNewOrder } from "./notify";
import { loadProducts, stockStatements } from "./products";

/* ------------------------------ Lecture ------------------------------ */

export interface OrderRow {
  id: number;
  ref: string;
  status: OrderStatus;
  source: OrderSource;
  customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  district: string | null;
  delivery_zone: string | null;
  delivery_fee: number;
  subtotal: number;
  total: number;
  payment_method: PaymentMethod | null;
  paid: number;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
}

export interface ItemRow {
  id: number;
  order_id: number;
  slug: string;
  name: string;
  category: string | null;
  color: string;
  size: Size;
  qty: number;
  unit_price: number;
  image: string | null;
}

export function orderJson(o: OrderRow, items?: ItemRow[]) {
  return {
    id: o.id,
    ref: o.ref,
    status: o.status,
    source: o.source,
    customerId: o.customer_id,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    district: o.district,
    deliveryZone: o.delivery_zone,
    deliveryFee: o.delivery_fee,
    subtotal: o.subtotal,
    total: o.total,
    paymentMethod: o.payment_method,
    paid: !!o.paid,
    paidAt: o.paid_at,
    notes: o.notes,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    confirmedAt: o.confirmed_at,
    deliveredAt: o.delivered_at,
    cancelledAt: o.cancelled_at,
    ...(items
      ? {
          items: items.map((i) => ({
            id: i.id,
            slug: i.slug,
            name: i.name,
            category: i.category,
            color: i.color,
            size: i.size,
            qty: i.qty,
            unitPrice: i.unit_price,
            image: i.image,
          })),
        }
      : {}),
  };
}

async function getOrderRow(env: AppEnv, id: number): Promise<OrderRow> {
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first<OrderRow>();
  if (!order) throw new HttpError(404, "Commande introuvable.");
  return order;
}

async function getItems(env: AppEnv, orderId: number): Promise<ItemRow[]> {
  const { results } = await env.DB.prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id").bind(orderId).all<ItemRow>();
  return results;
}

function itemInsert(env: AppEnv, orderIdSql: { id: number } | { ref: string }, line: PricedLine): D1PreparedStatement {
  const target = "id" in orderIdSql ? "?1" : "(SELECT id FROM orders WHERE ref = ?1)";
  return env.DB.prepare(
    `INSERT INTO order_items (order_id, slug, name, category, color, size, qty, unit_price, image)
     VALUES (${target}, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  ).bind("id" in orderIdSql ? orderIdSql.id : orderIdSql.ref, line.slug, line.name, line.category ?? null, line.color, line.size, line.qty, line.unitPrice, line.image ?? null);
}

function eventInsert(
  env: AppEnv,
  order: { id: number } | { ref: string },
  type: string,
  fields: { from?: string | null; to?: string | null; note?: string | null; user?: User | null } = {},
): D1PreparedStatement {
  const target = "id" in order ? "?1" : "(SELECT id FROM orders WHERE ref = ?1)";
  return env.DB.prepare(
    `INSERT INTO order_events (order_id, type, from_status, to_status, note, user_id, user_name) VALUES (${target}, ?2, ?3, ?4, ?5, ?6, ?7)`,
  ).bind("id" in order ? order.id : order.ref, type, fields.from ?? null, fields.to ?? null, fields.note ?? null, fields.user?.id ?? null, fields.user?.name ?? null);
}

/* ------------------------- Commande du site -------------------------- */

/**
 * Enregistre la commande au moment où le client clique sur « Commander sur WhatsApp ».
 * La référence est générée par le navigateur (elle figure déjà dans le message WhatsApp).
 * Un second clic avec la même référence remplace les articles (tant que la commande est « nouvelle »).
 */
export async function publicCreateOrder(request: Request, env: AppEnv, ctx: ExecutionContext): Promise<Response> {
  if (!(await rateLimit(env, `order:${clientIp(request)}`, 20, 3600))) {
    throw new HttpError(429, "Trop de commandes envoyées. Réessaie plus tard.");
  }
  const body = await readJson<{ ref?: unknown; items?: unknown }>(request, 16_000);
  const ref = typeof body.ref === "string" ? body.ref : "";
  if (!ORDER_REF_RE.test(ref)) throw new HttpError(400, "Référence invalide.");
  const items = parseItems(body.items);
  if (typeof items === "string") throw new HttpError(400, items);

  const stored = await loadProducts(env, { publishedOnly: true, slugs: [...new Set(items.map((i) => i.slug))] });
  const lines = priceItems(items, stored.map((s) => s.product)).filter((l) => l.issue !== "produit_introuvable" && l.issue !== "couleur_introuvable" && l.issue !== "taille_introuvable");
  if (!lines.length) throw new HttpError(400, "Aucun article de la commande n'est disponible.");
  const { subtotal, total } = orderTotals(lines);

  const existing = await env.DB.prepare("SELECT id, status, source, created_at FROM orders WHERE ref = ?").bind(ref).first<Pick<OrderRow, "id" | "status" | "source" | "created_at">>();
  if (existing) {
    const recent = Date.now() - Date.parse(existing.created_at) < 86_400_000;
    if (existing.source !== "site" || existing.status !== "nouvelle" || !recent) {
      return json({ ok: true, ref, ignored: true });
    }
    await env.DB.batch([
      env.DB.prepare("DELETE FROM order_items WHERE order_id = ?").bind(existing.id),
      ...lines.map((l) => itemInsert(env, { id: existing.id }, l)),
      env.DB.prepare("UPDATE orders SET subtotal = ?, total = ?, updated_at = ? WHERE id = ?").bind(subtotal, total, nowIso(), existing.id),
      eventInsert(env, { id: existing.id }, "articles_modifies", { note: "Le client a renvoyé sa commande depuis le site" }),
    ]);
    return json({ ok: true, ref, updated: true });
  }

  await env.DB.batch([
    env.DB.prepare("INSERT INTO orders (ref, status, source, subtotal, total) VALUES (?, 'nouvelle', 'site', ?, ?)").bind(ref, subtotal, total),
    ...lines.map((l) => itemInsert(env, { ref }, l)),
    eventInsert(env, { ref }, "creation", { to: "nouvelle", note: "Commande envoyée depuis le site (WhatsApp)" }),
  ]);
  ctx.waitUntil(notifyNewOrder(env, { ref, lines, total, source: "site" }).catch((e) => console.error("telegram", e)));
  return json({ ok: true, ref }, 201);
}

/* ------------------------------ Clients ------------------------------ */

interface CustomerInput {
  phone?: unknown;
  name?: unknown;
  district?: unknown;
  zone?: unknown;
}

/** Crée ou met à jour la fiche client (clé : numéro de téléphone) et renvoie son id */
async function upsertCustomer(env: AppEnv, input: CustomerInput): Promise<{ id: number; phone: string; name: string | null } | null> {
  if (input.phone === undefined || input.phone === null || input.phone === "") return null;
  const phone = normalizePhone(String(input.phone));
  if (!phone) throw new HttpError(400, "Numéro de téléphone invalide (ex. 77 123 45 67).");
  const name = optText(input.name, 120);
  const district = optText(input.district, 120);
  const zone = optText(input.zone, 60);
  const row = await env.DB.prepare(
    `INSERT INTO customers (phone, name, district, zone) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(phone) DO UPDATE SET
       name = coalesce(?2, customers.name),
       district = coalesce(?3, customers.district),
       zone = coalesce(?4, customers.zone),
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     RETURNING id, name`,
  )
    .bind(phone, name, district, zone)
    .first<{ id: number; name: string | null }>();
  return row ? { id: row.id, phone, name: row.name } : null;
}

/* ------------------------------- Admin ------------------------------- */

const PAGE_SIZE = 40;

export async function adminListOrders(request: Request, env: AppEnv): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const customerId = Number(url.searchParams.get("client") ?? 0);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);

  const where: string[] = [];
  const params: unknown[] = [];
  if (status === "a_traiter") where.push("status IN ('nouvelle','confirmee','en_livraison')");
  else if (status === "non_paye") where.push("status IN ('confirmee','en_livraison','livree') AND paid = 0");
  else if (status && (ORDER_STATUSES as readonly string[]).includes(status)) {
    where.push("status = ?");
    params.push(status);
  }
  if (source && (ORDER_SOURCES as readonly string[]).includes(source)) {
    where.push("source = ?");
    params.push(source);
  }
  if (customerId > 0) {
    where.push("customer_id = ?");
    params.push(customerId);
  }
  if (q) {
    const ref = parseOrderRef(q);
    const phone = normalizePhone(q);
    const digits = q.replace(/\D/g, "");
    const parts = ["customer_name LIKE ?", "ref LIKE ?"];
    params.push(`%${q}%`, `%${q.toUpperCase()}%`);
    if (ref) {
      parts.push("ref = ?");
      params.push(ref);
    }
    if (phone) {
      parts.push("customer_phone = ?");
      params.push(phone);
    } else if (digits.length >= 4) {
      parts.push("customer_phone LIKE ?");
      params.push(`%${digits}%`);
    }
    where.push(`(${parts.join(" OR ")})`);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [{ results }, count] = await Promise.all([
    env.DB.prepare(
      `SELECT o.*, (SELECT coalesce(sum(qty), 0) FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o ${clause} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(...params, PAGE_SIZE, (page - 1) * PAGE_SIZE)
      .all<OrderRow & { item_count: number }>(),
    env.DB.prepare(`SELECT count(*) AS n FROM orders ${clause}`).bind(...params).first<{ n: number }>(),
  ]);
  return json({
    orders: results.map((o) => ({ ...orderJson(o), itemCount: o.item_count })),
    total: count?.n ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
}

export async function adminGetOrder(env: AppEnv, id: number): Promise<Response> {
  const order = await getOrderRow(env, id);
  const [items, events] = await Promise.all([
    getItems(env, id),
    env.DB.prepare("SELECT * FROM order_events WHERE order_id = ? ORDER BY id DESC").bind(id).all(),
  ]);
  // Stock actuel des articles, pour prévenir avant de confirmer
  const products = await loadProducts(env, { slugs: [...new Set(items.map((i) => i.slug))] });
  const priced = priceItems(
    items.map((i) => ({ slug: i.slug, color: i.color, size: i.size, qty: i.qty })),
    products.map((p) => p.product),
  );
  let customer = null;
  if (order.customer_id) {
    customer = await env.DB.prepare(
      `SELECT c.*, (SELECT count(*) FROM orders WHERE customer_id = c.id AND status IN ('confirmee','en_livraison','livree')) AS orders_count
       FROM customers c WHERE id = ?`,
    )
      .bind(order.customer_id)
      .first();
  }
  return json({
    order: orderJson(order, items),
    stock: priced.map((p) => ({ slug: p.slug, color: p.color, size: p.size, stock: p.stock, issue: p.issue ?? null })),
    events: events.results,
    customer,
  });
}

interface OrderFields extends CustomerInput {
  deliveryZone?: unknown;
  deliveryFee?: unknown;
  paymentMethod?: unknown;
  paid?: unknown;
  notes?: unknown;
}

function paymentMethodOf(value: unknown): PaymentMethod | null {
  if (value === undefined || value === null || value === "") return null;
  if (!(PAYMENT_METHODS as readonly string[]).includes(value as string)) throw new HttpError(400, "Moyen de paiement inconnu.");
  return value as PaymentMethod;
}

/** Saisie manuelle d'une commande (DM Instagram, appel, boutique…) */
export async function adminCreateOrder(request: Request, env: AppEnv, user: User): Promise<Response> {
  const body = await readJson<OrderFields & { items?: unknown; source?: unknown; status?: unknown; customer?: CustomerInput; force?: unknown }>(request, 32_000);
  const source = body.source as OrderSource;
  if (!(ORDER_SOURCES as readonly string[]).includes(source)) throw new HttpError(400, "Origine de la commande inconnue.");
  const status = (body.status ?? "confirmee") as OrderStatus;
  if (!["nouvelle", "confirmee", "livree"].includes(status)) throw new HttpError(400, "Statut de départ invalide.");
  const items = parseItems(body.items);
  if (typeof items === "string") throw new HttpError(400, items);

  const stored = await loadProducts(env, { slugs: [...new Set(items.map((i) => i.slug))] });
  const products = stored.map((s) => s.product);
  const lines = priceItems(items, products);
  const invalid = lines.find((l) => l.issue && l.issue !== "stock_insuffisant");
  if (invalid) throw new HttpError(400, `Article invalide : ${invalid.name} (${invalid.color}, ${invalid.size}).`);

  const customer = await upsertCustomer(env, { zone: body.deliveryZone, ...(body.customer ?? {}) });
  if (status !== "nouvelle" && !customer && source !== "boutique") throw new HttpError(400, "Indique le numéro du client pour une commande confirmée.");

  const holds = stockMovement("nouvelle", status) === -1;
  if (holds) {
    const check = applyStock(products, lines, -1);
    if (check.shortages.length && body.force !== true) {
      throw new HttpError(409, "Stock insuffisant pour certains articles.", { shortages: check.shortages });
    }
  }

  const deliveryFee = optInt(body.deliveryFee, { max: 1_000_000 }) ?? 0;
  const { subtotal, total } = orderTotals(lines, deliveryFee);
  const paid = body.paid === true;
  const now = nowIso();
  let ref = generateOrderRef();
  for (let i = 0; i < 3 && (await env.DB.prepare("SELECT 1 FROM orders WHERE ref = ?").bind(ref).first()); i++) ref = generateOrderRef();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO orders (ref, status, source, customer_id, customer_name, customer_phone, district, delivery_zone, delivery_fee,
         subtotal, total, payment_method, paid, paid_at, notes, confirmed_at, delivered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      ref,
      status,
      source,
      customer?.id ?? null,
      customer?.name ?? optText(body.customer?.name, 120),
      customer?.phone ?? null,
      optText(body.customer?.district, 120),
      optText(body.deliveryZone, 60),
      deliveryFee,
      subtotal,
      total,
      paymentMethodOf(body.paymentMethod),
      paid ? 1 : 0,
      paid ? now : null,
      optText(body.notes, 1000),
      status === "nouvelle" ? null : now,
      status === "livree" ? now : null,
    ),
    ...lines.map((l) => itemInsert(env, { ref }, l)),
    ...(holds ? stockStatements(env, products, lines, -1) : []),
    eventInsert(env, { ref }, "creation", { to: status, note: `Saisie manuelle (${source})`, user }),
  ]);
  const created = await env.DB.prepare("SELECT id FROM orders WHERE ref = ?").bind(ref).first<{ id: number }>();
  return json({ ok: true, id: created?.id, ref }, 201);
}

/** Modifie les infos d'une commande (client, livraison, paiement, notes) et, si elle n'est pas encore confirmée, ses articles */
export async function adminUpdateOrder(request: Request, env: AppEnv, user: User, id: number): Promise<Response> {
  const order = await getOrderRow(env, id);
  const body = await readJson<OrderFields & { items?: unknown; customer?: CustomerInput }>(request, 32_000);
  const statements: D1PreparedStatement[] = [];
  const set: string[] = [];
  const params: unknown[] = [];
  const changes: string[] = [];

  if (body.customer) {
    const customer = await upsertCustomer(env, { zone: body.deliveryZone, ...body.customer });
    set.push("customer_id = ?", "customer_name = ?", "customer_phone = ?", "district = ?");
    const next = { name: customer?.name ?? optText(body.customer.name, 120), phone: customer?.phone ?? null, district: optText(body.customer.district, 120) };
    params.push(customer?.id ?? null, next.name, next.phone, next.district);
    if (next.name !== order.customer_name || next.phone !== order.customer_phone || next.district !== order.district) changes.push("client");
  }
  if (body.deliveryZone !== undefined) {
    set.push("delivery_zone = ?");
    const zone = optText(body.deliveryZone, 60);
    params.push(zone);
    if (zone !== order.delivery_zone) changes.push("zone");
  }
  let deliveryFee = order.delivery_fee;
  if (body.deliveryFee !== undefined) {
    deliveryFee = optInt(body.deliveryFee, { max: 1_000_000 }) ?? 0;
    set.push("delivery_fee = ?");
    params.push(deliveryFee);
    if (deliveryFee !== order.delivery_fee) changes.push("frais de livraison");
  }
  if (body.paymentMethod !== undefined) {
    set.push("payment_method = ?");
    const method = paymentMethodOf(body.paymentMethod);
    params.push(method);
    if (method !== order.payment_method) changes.push("moyen de paiement");
  }
  if (typeof body.paid === "boolean" && body.paid !== !!order.paid) {
    set.push("paid = ?", "paid_at = ?");
    params.push(body.paid ? 1 : 0, body.paid ? nowIso() : null);
    statements.push(eventInsert(env, { id }, body.paid ? "paiement" : "paiement_annule", { note: body.paid ? "Marquée payée" : "Paiement retiré", user }));
  }
  if (body.notes !== undefined) {
    set.push("notes = ?");
    params.push(optText(body.notes, 1000));
  }

  let subtotal = order.subtotal;
  if (body.items !== undefined) {
    if (!EDITABLE.has(order.status)) throw new HttpError(400, "Les articles ne peuvent plus être modifiés une fois la commande confirmée. Annule-la puis recrée-la si besoin.");
    const items = parseItems(body.items);
    if (typeof items === "string") throw new HttpError(400, items);
    const stored = await loadProducts(env, { slugs: [...new Set(items.map((i) => i.slug))] });
    const lines = priceItems(items, stored.map((s) => s.product));
    const invalid = lines.find((l) => l.issue && l.issue !== "stock_insuffisant");
    if (invalid) throw new HttpError(400, `Article invalide : ${invalid.name} (${invalid.color}, ${invalid.size}).`);
    subtotal = orderTotals(lines).subtotal;
    statements.push(env.DB.prepare("DELETE FROM order_items WHERE order_id = ?").bind(id), ...lines.map((l) => itemInsert(env, { id }, l)));
    set.push("subtotal = ?");
    params.push(subtotal);
    changes.push("articles");
  }

  if (!set.length && !statements.length) return adminGetOrder(env, id);
  set.push("total = ?", "updated_at = ?");
  params.push(subtotal + deliveryFee, nowIso());
  if (changes.length) statements.push(eventInsert(env, { id }, "modification", { note: `Modifié : ${changes.join(", ")}`, user }));
  await env.DB.batch([env.DB.prepare(`UPDATE orders SET ${set.join(", ")} WHERE id = ?`).bind(...params, id), ...statements]);
  return adminGetOrder(env, id);
}

/** Change le statut et fait suivre le stock (sortie à la confirmation, retour à l'annulation) */
export async function adminChangeStatus(request: Request, env: AppEnv, user: User, id: number): Promise<Response> {
  const body = await readJson<{ to?: unknown; note?: unknown; force?: unknown }>(request, 4_000);
  const to = body.to as OrderStatus;
  if (!(ORDER_STATUSES as readonly string[]).includes(to)) throw new HttpError(400, "Statut inconnu.");
  const order = await getOrderRow(env, id);
  if (!canTransition(order.status, to)) {
    throw new HttpError(400, `Impossible de passer de « ${STATUS_LABELS[order.status]} » à « ${STATUS_LABELS[to]} ».`);
  }
  if (to === "confirmee" && !order.customer_phone && order.source !== "boutique") {
    throw new HttpError(400, "Renseigne d'abord le numéro du client (bloc « Client »).");
  }

  const movement = stockMovement(order.status, to);
  const items = await getItems(env, id);
  const lines = items.map((i) => ({ slug: i.slug, color: i.color, size: i.size, qty: i.qty }));
  const statements: D1PreparedStatement[] = [];
  if (movement !== 0) {
    const stored = await loadProducts(env, { slugs: [...new Set(lines.map((l) => l.slug))] });
    const products = stored.map((s) => s.product);
    if (movement === -1) {
      const check = applyStock(products, lines, -1);
      if (check.shortages.length && body.force !== true) {
        throw new HttpError(409, "Stock insuffisant pour certains articles.", { shortages: check.shortages });
      }
    }
    statements.push(...stockStatements(env, products, lines, movement));
  }

  const now = nowIso();
  const stamps: Record<string, string> = {
    confirmee: "confirmed_at = coalesce(confirmed_at, ?)",
    livree: "delivered_at = ?",
    annulee: "cancelled_at = ?",
  };
  const extra = stamps[to] ? `, ${stamps[to]}` : "";
  await env.DB.batch([
    env.DB.prepare(`UPDATE orders SET status = ?, updated_at = ?${extra} WHERE id = ? AND status = ?`).bind(...[to, now, ...(stamps[to] ? [now] : []), id, order.status]),
    ...statements,
    eventInsert(env, { id }, "statut", {
      from: order.status,
      to,
      note: [optText(body.note, 500), movement === -1 ? "Stock déduit" : movement === 1 ? "Stock remis en vente" : null].filter(Boolean).join(" · ") || null,
      user,
    }),
  ]);
  return adminGetOrder(env, id);
}

export async function adminAddNote(request: Request, env: AppEnv, user: User, id: number): Promise<Response> {
  await getOrderRow(env, id);
  const body = await readJson<{ note?: unknown }>(request, 4_000);
  const note = optText(body.note, 1000);
  if (!note) throw new HttpError(400, "Note vide.");
  await eventInsert(env, { id }, "note", { note, user }).run();
  return adminGetOrder(env, id);
}

/* ------------------------- Tableau de bord ------------------------- */

export async function adminSummary(env: AppEnv): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [counts, unpaid, todayRow, weekRow, recent] = await Promise.all([
    env.DB.prepare("SELECT status, count(*) AS n, coalesce(sum(subtotal), 0) AS amount FROM orders WHERE status IN ('nouvelle','confirmee','en_livraison') GROUP BY status").all<{
      status: OrderStatus;
      n: number;
      amount: number;
    }>(),
    env.DB.prepare("SELECT count(*) AS n, coalesce(sum(total), 0) AS amount FROM orders WHERE status IN ('confirmee','en_livraison','livree') AND paid = 0").first<{ n: number; amount: number }>(),
    env.DB.prepare(
      "SELECT count(*) AS received, coalesce(sum(CASE WHEN status IN ('confirmee','en_livraison','livree') THEN subtotal ELSE 0 END), 0) AS revenue FROM orders WHERE created_at >= ?",
    )
      .bind(`${today}T00:00:00.000Z`)
      .first<{ received: number; revenue: number }>(),
    env.DB.prepare(
      "SELECT count(*) AS received, coalesce(sum(CASE WHEN status IN ('confirmee','en_livraison','livree') THEN subtotal ELSE 0 END), 0) AS revenue, coalesce(sum(CASE WHEN status IN ('confirmee','en_livraison','livree') THEN 1 ELSE 0 END), 0) AS validated FROM orders WHERE created_at >= ?",
    )
      .bind(weekAgo)
      .first<{ received: number; revenue: number; validated: number }>(),
    env.DB.prepare(
      `SELECT o.*, (SELECT coalesce(sum(qty), 0) FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o WHERE status IN ('nouvelle','confirmee','en_livraison') ORDER BY created_at DESC LIMIT 8`,
    ).all<OrderRow & { item_count: number }>(),
  ]);

  const products = await loadProducts(env, { publishedOnly: true });
  let outOfStock = 0;
  let low = 0;
  for (const { product } of products)
    for (const v of product.variants)
      for (const n of Object.values(v.stock)) {
        if ((n ?? 0) === 0) outOfStock += 1;
        else if ((n ?? 0) <= 1) low += 1;
      }

  return json({
    counts: Object.fromEntries(counts.results.map((r) => [r.status, { count: r.n, amount: r.amount }])),
    unpaid: unpaid ?? { n: 0, amount: 0 },
    today: todayRow ?? { received: 0, revenue: 0 },
    week: weekRow ?? { received: 0, revenue: 0, validated: 0 },
    recent: recent.results.map((o) => ({ ...orderJson(o), itemCount: o.item_count })),
    stock: { outOfStock, low, products: products.length },
  });
}

/* ------------------------------ Tâche du matin ------------------------------ */

/** Commandes du site restées « nouvelles » plus de 3 jours → « sans suite » ; ménage des sessions */
export async function dailyMaintenance(env: AppEnv): Promise<void> {
  const limit = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO order_events (order_id, type, from_status, to_status, note)
       SELECT id, 'statut', 'nouvelle', 'sans_suite', 'Automatique : pas de réponse du client depuis 3 jours' FROM orders
       WHERE status = 'nouvelle' AND source = 'site' AND created_at < ?`,
    ).bind(limit),
    env.DB.prepare("UPDATE orders SET status = 'sans_suite', updated_at = ? WHERE status = 'nouvelle' AND source = 'site' AND created_at < ?").bind(now, limit),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
    env.DB.prepare("DELETE FROM rate_limits WHERE reset_at < ?").bind(Date.now()),
  ]);
}

export function orderSummaryLine(lines: readonly { qty: number }[], total: number): string {
  const n = lines.reduce((s, l) => s + l.qty, 0);
  return `${n} article${n > 1 ? "s" : ""} — ${formatPrice(total)}`;
}

export const shopName = site.name;
