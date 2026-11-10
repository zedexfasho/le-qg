import { CATEGORIES, type Product } from "./types";
import { ORDER_STATUSES, PAYMENT_LABELS, SOURCE_LABELS, VALIDATED, type OrderStatus, type PaymentMethod, type OrderSource } from "./orders";

/* ------------------------------------------------------------------
   Analyses du business — calcul pur à partir des commandes.
   Dakar est en UTC toute l'année : les dates ISO suffisent.
   ------------------------------------------------------------------ */

export interface AnalyticsItem {
  slug: string;
  name: string;
  category?: string | null;
  color: string;
  size: string;
  qty: number;
  unitPrice: number;
}

export interface AnalyticsOrder {
  id: number;
  status: OrderStatus;
  source: OrderSource;
  paymentMethod?: PaymentMethod | null;
  paid: boolean;
  deliveryZone?: string | null;
  customerId?: number | null;
  subtotal: number;
  deliveryFee: number;
  createdAt: string;
  items: AnalyticsItem[];
}

export interface AnalyticsCustomer {
  id: number;
  name?: string | null;
  phone: string;
}

export const PERIODS = { "7j": 7, "30j": 30, "90j": 90, "12m": 365 } as const;
export type PeriodKey = keyof typeof PERIODS;

export interface Breakdown {
  key: string;
  label: string;
  qty: number;
  revenue: number;
  orders: number;
}

export interface SeriesPoint {
  key: string;
  label: string;
  revenue: number;
  orders: number;
}

export interface Kpis {
  revenue: number;
  orders: number;
  avgBasket: number;
  items: number;
  siteReceived: number;
  siteValidated: number;
  /** Part des commandes du site confirmées (0–1), null si aucune commande site */
  conversion: number | null;
  newCustomers: number;
  returningCustomers: number;
  paidRevenue: number;
  cancelled: number;
}

export interface Analytics {
  period: { key: PeriodKey; from: string; to: string; granularity: "day" | "week" | "month" };
  kpis: Kpis;
  previous: Kpis;
  series: SeriesPoint[];
  topProducts: Breakdown[];
  byCategory: Breakdown[];
  bySize: Breakdown[];
  byColor: Breakdown[];
  byZone: Breakdown[];
  bySource: Breakdown[];
  byPayment: Breakdown[];
  pipeline: { status: OrderStatus; count: number; amount: number }[];
  topCustomers: { id: number; name: string; phone: string; orders: number; revenue: number }[];
  stock: {
    units: number;
    value: number;
    outOfStock: { slug: string; name: string; color: string; size: string }[];
    low: { slug: string; name: string; color: string; size: string; stock: number }[];
  };
}

const DAY = 86_400_000;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Début du jour (UTC) */
function startOfDay(t: number): number {
  return Math.floor(t / DAY) * DAY;
}

export function periodRange(key: PeriodKey, now = Date.now()): { from: number; to: number; prevFrom: number } {
  const days = PERIODS[key];
  const to = startOfDay(now) + DAY; // fin de journée incluse
  const from = to - days * DAY;
  return { from, to, prevFrom: from - days * DAY };
}

function computeKpis(orders: readonly AnalyticsOrder[], firstOrderAt: Map<number, number>, from: number): Kpis {
  const validated = orders.filter((o) => VALIDATED.has(o.status));
  const revenue = validated.reduce((s, o) => s + o.subtotal, 0);
  const site = orders.filter((o) => o.source === "site");
  const siteValidated = site.filter((o) => VALIDATED.has(o.status)).length;
  // Une commande « sans suite »/« nouvelle » récente n'est pas encore un échec : on mesure sur ce qui est tranché ou validé
  const customers = new Set(validated.map((o) => o.customerId).filter((id): id is number => typeof id === "number"));
  let newCustomers = 0;
  for (const id of customers) if ((firstOrderAt.get(id) ?? 0) >= from) newCustomers += 1;
  return {
    revenue,
    orders: validated.length,
    avgBasket: validated.length ? Math.round(revenue / validated.length) : 0,
    items: validated.reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0), 0),
    siteReceived: site.length,
    siteValidated,
    conversion: site.length ? siteValidated / site.length : null,
    newCustomers,
    returningCustomers: customers.size - newCustomers,
    paidRevenue: validated.filter((o) => o.paid).reduce((s, o) => s + o.subtotal + o.deliveryFee, 0),
    cancelled: orders.filter((o) => o.status === "annulee").length,
  };
}

function breakdown(
  orders: readonly AnalyticsOrder[],
  keyOf: (o: AnalyticsOrder, i: AnalyticsItem) => string | null | undefined,
  labelOf: (key: string, i: AnalyticsItem) => string = (k) => k,
): Breakdown[] {
  const map = new Map<string, Breakdown & { orderIds: Set<number> }>();
  for (const o of orders) {
    for (const i of o.items) {
      const key = keyOf(o, i) || "—";
      const row = map.get(key) ?? { key, label: labelOf(key, i), qty: 0, revenue: 0, orders: 0, orderIds: new Set<number>() };
      row.qty += i.qty;
      row.revenue += i.qty * i.unitPrice;
      row.orderIds.add(o.id);
      map.set(key, row);
    }
  }
  return [...map.values()]
    .map(({ orderIds, ...row }) => ({ ...row, orders: orderIds.size }))
    .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty);
}

/** Répartition par commande (zone, source, paiement) : le montant est celui des articles */
function orderBreakdown(orders: readonly AnalyticsOrder[], keyOf: (o: AnalyticsOrder) => string | null | undefined, labelOf: (k: string) => string = (k) => k): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const o of orders) {
    const key = keyOf(o) || "—";
    const row = map.get(key) ?? { key, label: key === "—" ? "Non renseigné" : labelOf(key), qty: 0, revenue: 0, orders: 0 };
    row.orders += 1;
    row.revenue += o.subtotal;
    row.qty += o.items.reduce((n, i) => n + i.qty, 0);
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);
}

function buildSeries(orders: readonly AnalyticsOrder[], from: number, to: number, granularity: "day" | "week" | "month"): SeriesPoint[] {
  const buckets: SeriesPoint[] = [];
  const index = new Map<string, SeriesPoint>();
  const keyOf = (t: number): string => {
    const d = new Date(t);
    if (granularity === "month") return d.toISOString().slice(0, 7);
    if (granularity === "week") {
      // Semaine commençant le lundi
      const monday = startOfDay(t) - ((d.getUTCDay() + 6) % 7) * DAY;
      return isoDay(monday);
    }
    return isoDay(t);
  };
  const months = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const labelOf = (key: string): string => {
    if (granularity === "month") return `${months[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`;
    const [, m, d] = key.split("-");
    return `${Number(d)} ${months[Number(m) - 1]}`;
  };
  for (let t = from; t < to; t += DAY) {
    const key = keyOf(t);
    if (!index.has(key)) {
      const point = { key, label: labelOf(key), revenue: 0, orders: 0 };
      index.set(key, point);
      buckets.push(point);
    }
  }
  for (const o of orders) {
    const point = index.get(keyOf(Date.parse(o.createdAt)));
    if (!point) continue;
    point.revenue += o.subtotal;
    point.orders += 1;
  }
  return buckets;
}

export function computeAnalytics(
  allOrders: readonly AnalyticsOrder[],
  customers: readonly AnalyticsCustomer[],
  products: readonly Product[],
  key: PeriodKey,
  now = Date.now(),
): Analytics {
  const { from, to, prevFrom } = periodRange(key, now);
  const inRange = (o: AnalyticsOrder, a: number, b: number) => {
    const t = Date.parse(o.createdAt);
    return t >= a && t < b;
  };

  // Première commande validée de chaque client (pour distinguer nouveaux / fidèles)
  const firstOrderAt = new Map<number, number>();
  for (const o of allOrders) {
    if (!VALIDATED.has(o.status) || typeof o.customerId !== "number") continue;
    const t = Date.parse(o.createdAt);
    const prev = firstOrderAt.get(o.customerId);
    if (prev === undefined || t < prev) firstOrderAt.set(o.customerId, t);
  }

  const current = allOrders.filter((o) => inRange(o, from, to));
  const previous = allOrders.filter((o) => inRange(o, prevFrom, from));
  const validated = current.filter((o) => VALIDATED.has(o.status));
  const granularity = PERIODS[key] <= 31 ? "day" : PERIODS[key] <= 90 ? "week" : "month";

  const categoryLabel = (k: string) => (CATEGORIES as readonly string[]).includes(k) ? k.charAt(0).toUpperCase() + k.slice(1) : k;

  // Clients
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const perCustomer = new Map<number, { orders: number; revenue: number }>();
  for (const o of validated) {
    if (typeof o.customerId !== "number") continue;
    const row = perCustomer.get(o.customerId) ?? { orders: 0, revenue: 0 };
    row.orders += 1;
    row.revenue += o.subtotal;
    perCustomer.set(o.customerId, row);
  }

  // Stock actuel
  const outOfStock: Analytics["stock"]["outOfStock"] = [];
  const low: Analytics["stock"]["low"] = [];
  let units = 0;
  let value = 0;
  for (const p of products) {
    for (const v of p.variants) {
      for (const [size, n] of Object.entries(v.stock)) {
        const stock = n ?? 0;
        units += stock;
        value += stock * p.price;
        if (stock === 0) outOfStock.push({ slug: p.slug, name: p.name, color: v.color, size });
        else if (stock <= 1) low.push({ slug: p.slug, name: p.name, color: v.color, size, stock });
      }
    }
  }

  return {
    period: { key, from: new Date(from).toISOString(), to: new Date(to).toISOString(), granularity },
    kpis: computeKpis(current, firstOrderAt, from),
    previous: computeKpis(previous, firstOrderAt, prevFrom),
    series: buildSeries(validated, from, to, granularity),
    topProducts: breakdown(validated, (_, i) => i.slug, (_, i) => i.name).slice(0, 10),
    byCategory: breakdown(validated, (_, i) => i.category, categoryLabel),
    bySize: breakdown(validated, (_, i) => i.size, (k) => (k === "TU" ? "Taille unique" : k)),
    byColor: breakdown(validated, (_, i) => i.color).slice(0, 10),
    byZone: orderBreakdown(validated, (o) => o.deliveryZone),
    bySource: orderBreakdown(validated, (o) => o.source, (k) => SOURCE_LABELS[k as OrderSource] ?? k),
    byPayment: orderBreakdown(validated, (o) => o.paymentMethod, (k) => PAYMENT_LABELS[k as PaymentMethod] ?? k),
    pipeline: ORDER_STATUSES.map((status) => {
      const list = allOrders.filter((o) => o.status === status && (status === "nouvelle" || status === "confirmee" || status === "en_livraison" || inRange(o, from, to)));
      return { status, count: list.length, amount: list.reduce((s, o) => s + o.subtotal, 0) };
    }),
    topCustomers: [...perCustomer.entries()]
      .map(([id, row]) => ({ id, name: customerById.get(id)?.name || "Client", phone: customerById.get(id)?.phone ?? "", ...row }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    stock: { units, value, outOfStock, low },
  };
}

/** Variation en % entre deux valeurs (null si pas de base de comparaison) */
export function delta(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / previous;
}
