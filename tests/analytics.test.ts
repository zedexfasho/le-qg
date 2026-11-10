import { describe, expect, it } from "vitest";
import { computeAnalytics, delta, periodRange, type AnalyticsOrder } from "@/lib/analytics";
import type { Product } from "@/lib/types";

const NOW = Date.parse("2026-11-10T12:00:00.000Z");
const day = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

const item = (slug: string, qty: number, unitPrice: number, size = "M", category = "hoodies") => ({ slug, name: slug, category, color: "Noir", size, qty, unitPrice });

const orders: AnalyticsOrder[] = [
  // Période actuelle (7 derniers jours)
  { id: 1, status: "livree", source: "site", paymentMethod: "wave", paid: true, deliveryZone: "Dakar", customerId: 1, subtotal: 50000, deliveryFee: 2000, createdAt: day(1), items: [item("hoodie", 2, 25000)] },
  { id: 2, status: "confirmee", source: "instagram", paymentMethod: "especes", paid: false, deliveryZone: "Banlieue", customerId: 2, subtotal: 15000, deliveryFee: 0, createdAt: day(2), items: [item("jogging", 1, 15000, "L", "joggings")] },
  { id: 3, status: "sans_suite", source: "site", paid: false, subtotal: 25000, deliveryFee: 0, createdAt: day(3), items: [item("hoodie", 1, 25000)] },
  { id: 4, status: "annulee", source: "site", paid: false, subtotal: 25000, deliveryFee: 0, createdAt: day(3), items: [item("hoodie", 1, 25000)] },
  // Période précédente
  { id: 5, status: "livree", source: "site", paymentMethod: "wave", paid: true, deliveryZone: "Dakar", customerId: 1, subtotal: 25000, deliveryFee: 0, createdAt: day(10), items: [item("hoodie", 1, 25000)] },
];

const products: Product[] = [
  {
    slug: "hoodie",
    name: "Hoodie",
    condition: "Neuf",
    category: "hoodies",
    price: 25000,
    description: "",
    createdAt: day(30),
    variants: [{ color: "Noir", colorHex: "#111111", images: [], stock: { M: 0, L: 1, XL: 4 } }],
  },
];

describe("analyses", () => {
  const a = computeAnalytics(orders, [{ id: 1, name: "Awa", phone: "221771234567" }, { id: 2, name: null, phone: "221781234567" }], products, "7j", NOW);

  it("indicateurs clés sur les commandes validées", () => {
    expect(a.kpis.revenue).toBe(65000);
    expect(a.kpis.orders).toBe(2);
    expect(a.kpis.avgBasket).toBe(32500);
    expect(a.kpis.items).toBe(3);
    expect(a.kpis.paidRevenue).toBe(52000);
    expect(a.kpis.cancelled).toBe(1);
  });

  it("conversion des commandes du site", () => {
    expect(a.kpis.siteReceived).toBe(3);
    expect(a.kpis.siteValidated).toBe(1);
    expect(a.kpis.conversion).toBeCloseTo(1 / 3);
  });

  it("nouveaux clients vs fidèles", () => {
    expect(a.kpis.newCustomers).toBe(1); // client 2
    expect(a.kpis.returningCustomers).toBe(1); // client 1 avait déjà commandé
  });

  it("période précédente", () => {
    expect(a.previous.revenue).toBe(25000);
    expect(delta(a.kpis.revenue, a.previous.revenue)).toBeCloseTo(1.6);
    expect(delta(10, 0)).toBeNull();
  });

  it("répartitions", () => {
    expect(a.topProducts[0]).toMatchObject({ key: "hoodie", qty: 2, revenue: 50000, orders: 1 });
    expect(a.byCategory.map((r) => r.label)).toEqual(["Hoodies", "Joggings"]);
    expect(a.bySize.map((r) => r.key)).toEqual(["M", "L"]);
    expect(a.bySource.map((r) => r.label)).toEqual(["Site", "Instagram"]);
    expect(a.byZone[0]).toMatchObject({ key: "Dakar", orders: 1 });
    expect(a.topCustomers[0]).toMatchObject({ id: 1, name: "Awa", revenue: 50000 });
  });

  it("série jour par jour, sans trou", () => {
    expect(a.series).toHaveLength(7);
    expect(a.series.reduce((s, p) => s + p.revenue, 0)).toBe(65000);
    expect(a.period.granularity).toBe("day");
  });

  it("stock", () => {
    expect(a.stock.units).toBe(5);
    expect(a.stock.value).toBe(125000);
    expect(a.stock.outOfStock).toHaveLength(1);
    expect(a.stock.low).toEqual([{ slug: "hoodie", name: "Hoodie", color: "Noir", size: "L", stock: 1 }]);
  });

  it("granularité selon la période", () => {
    expect(computeAnalytics([], [], [], "90j", NOW).period.granularity).toBe("week");
    expect(computeAnalytics([], [], [], "12m", NOW).series.length).toBeGreaterThanOrEqual(12);
    const { from, to } = periodRange("30j", NOW);
    expect((to - from) / 86_400_000).toBe(30);
  });
});
