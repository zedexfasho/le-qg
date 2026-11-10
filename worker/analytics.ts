import { PERIODS, computeAnalytics, type AnalyticsOrder, type PeriodKey } from "@/lib/analytics";
import type { OrderSource, OrderStatus, PaymentMethod } from "@/lib/orders";
import { json, type AppEnv } from "./http";
import { loadProducts } from "./products";

export async function adminAnalytics(request: Request, env: AppEnv): Promise<Response> {
  const param = new URL(request.url).searchParams.get("periode") ?? "30j";
  const key: PeriodKey = param in PERIODS ? (param as PeriodKey) : "30j";
  // Deux périodes (actuelle + précédente) + historique pour reconnaître les clients fidèles
  const since = new Date(Date.now() - 2 * 400 * 86_400_000).toISOString();

  const [orders, items, customers, products] = await Promise.all([
    env.DB.prepare(
      "SELECT id, status, source, payment_method, paid, delivery_zone, customer_id, subtotal, delivery_fee, created_at FROM orders WHERE created_at >= ?",
    )
      .bind(since)
      .all<{
        id: number;
        status: OrderStatus;
        source: OrderSource;
        payment_method: PaymentMethod | null;
        paid: number;
        delivery_zone: string | null;
        customer_id: number | null;
        subtotal: number;
        delivery_fee: number;
        created_at: string;
      }>(),
    env.DB.prepare(
      "SELECT i.order_id, i.slug, i.name, i.category, i.color, i.size, i.qty, i.unit_price FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.created_at >= ?",
    )
      .bind(since)
      .all<{ order_id: number; slug: string; name: string; category: string | null; color: string; size: string; qty: number; unit_price: number }>(),
    env.DB.prepare("SELECT id, name, phone FROM customers").all<{ id: number; name: string | null; phone: string }>(),
    loadProducts(env, { publishedOnly: true }),
  ]);

  const itemsByOrder = new Map<number, AnalyticsOrder["items"]>();
  for (const i of items.results) {
    const list = itemsByOrder.get(i.order_id) ?? [];
    list.push({ slug: i.slug, name: i.name, category: i.category, color: i.color, size: i.size, qty: i.qty, unitPrice: i.unit_price });
    itemsByOrder.set(i.order_id, list);
  }
  const data: AnalyticsOrder[] = orders.results.map((o) => ({
    id: o.id,
    status: o.status,
    source: o.source,
    paymentMethod: o.payment_method,
    paid: !!o.paid,
    deliveryZone: o.delivery_zone,
    customerId: o.customer_id,
    subtotal: o.subtotal,
    deliveryFee: o.delivery_fee,
    createdAt: o.created_at,
    items: itemsByOrder.get(o.id) ?? [],
  }));

  return json(
    computeAnalytics(
      data,
      customers.results,
      products.map((p) => p.product),
      key,
    ),
  );
}
