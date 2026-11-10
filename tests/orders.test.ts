import { describe, expect, it } from "vitest";
import {
  applyStock,
  canTransition,
  generateOrderRef,
  mergeItems,
  orderTotals,
  ORDER_REF_RE,
  parseItems,
  parseOrderRef,
  priceItems,
  stockMovement,
} from "@/lib/orders";
import type { Product } from "@/lib/types";

const hoodie: Product = {
  slug: "hoodie",
  name: "Hoodie",
  condition: "Neuf",
  category: "hoodies",
  price: 25000,
  description: "",
  createdAt: "2026-11-01T00:00:00.000Z",
  variants: [
    { color: "Noir", colorHex: "#111111", images: ["/products/h/1.webp"], stock: { M: 2, L: 0 } },
    { color: "Gris", colorHex: "#999999", images: ["/products/h/2.webp"], stock: { S: 5 } },
  ],
};

describe("références de commande", () => {
  it("format QG- + 7 caractères lisibles", () => {
    for (let i = 0; i < 50; i++) expect(generateOrderRef()).toMatch(ORDER_REF_RE);
  });
  it("relit une saisie approximative", () => {
    expect(parseOrderRef("qg k7f3m9p")).toBe("QG-K7F3M9P");
    expect(parseOrderRef("K7F3M9P")).toBe("QG-K7F3M9P");
    expect(parseOrderRef("QG-123")).toBeNull();
    expect(parseOrderRef("QG-K7F3M9O")).toBeNull(); // O ambigu, jamais généré
  });
});

describe("statuts", () => {
  it("transitions autorisées", () => {
    expect(canTransition("nouvelle", "confirmee")).toBe(true);
    expect(canTransition("livree", "annulee")).toBe(false);
    expect(canTransition("nouvelle", "livree")).toBe(false);
  });
  it("mouvements de stock", () => {
    expect(stockMovement("nouvelle", "confirmee")).toBe(-1);
    expect(stockMovement("confirmee", "en_livraison")).toBe(0);
    expect(stockMovement("en_livraison", "annulee")).toBe(1);
    expect(stockMovement("nouvelle", "annulee")).toBe(0);
    expect(stockMovement("annulee", "confirmee")).toBe(-1);
  });
});

describe("articles", () => {
  it("rejette les données invalides", () => {
    expect(parseItems([])).toBeTypeOf("string");
    expect(parseItems([{ slug: "a", color: "Noir", size: "XXXL", qty: 1 }])).toBeTypeOf("string");
    expect(parseItems([{ slug: "a", color: "Noir", size: "M", qty: 0 }])).toBeTypeOf("string");
    expect(parseItems([{ slug: "a", color: "Noir", size: "M", qty: 1.5 }])).toBeTypeOf("string");
    expect(parseItems("x")).toBeTypeOf("string");
  });
  it("regroupe les doublons", () => {
    const items = parseItems([
      { slug: "a", color: "Noir", size: "M", qty: 1 },
      { slug: "a", color: "Noir", size: "M", qty: 2 },
      { slug: "a", color: "Noir", size: "L", qty: 1 },
    ]);
    expect(items).toEqual([
      { slug: "a", color: "Noir", size: "M", qty: 3 },
      { slug: "a", color: "Noir", size: "L", qty: 1 },
    ]);
    expect(mergeItems([])).toEqual([]);
  });
  it("prix toujours tirés du catalogue, problèmes signalés", () => {
    const lines = priceItems(
      [
        { slug: "hoodie", color: "Noir", size: "M", qty: 1 },
        { slug: "hoodie", color: "Noir", size: "L", qty: 1 },
        { slug: "hoodie", color: "Rose", size: "M", qty: 1 },
        { slug: "hoodie", color: "Gris", size: "XL", qty: 1 },
        { slug: "inconnu", color: "Noir", size: "M", qty: 1 },
      ],
      [hoodie],
    );
    expect(lines.map((l) => l.issue)).toEqual([undefined, "stock_insuffisant", "couleur_introuvable", "taille_introuvable", "produit_introuvable"]);
    expect(lines[0]).toMatchObject({ name: "Hoodie", unitPrice: 25000, stock: 2, image: "/products/h/1.webp" });
  });
  it("totaux", () => {
    expect(orderTotals([{ qty: 2, unitPrice: 15000 }, { qty: 1, unitPrice: 25000 }], 2000)).toEqual({ subtotal: 55000, count: 3, deliveryFee: 2000, total: 57000 });
  });
});

describe("stock", () => {
  it("sortie de stock sans modifier l'original", () => {
    const { products, shortages, changed } = applyStock([hoodie], [{ slug: "hoodie", color: "Noir", size: "M", qty: 2 }], -1);
    expect(shortages).toEqual([]);
    expect(changed.has("hoodie")).toBe(true);
    expect(products[0].variants[0].stock.M).toBe(0);
    expect(hoodie.variants[0].stock.M).toBe(2);
  });
  it("refuse tout s'il manque du stock", () => {
    const result = applyStock(
      [hoodie],
      [
        { slug: "hoodie", color: "Gris", size: "S", qty: 1 },
        { slug: "hoodie", color: "Noir", size: "M", qty: 3 },
      ],
      -1,
    );
    expect(result.shortages).toEqual([{ slug: "hoodie", name: "Hoodie", color: "Noir", size: "M", requested: 3, available: 2 }]);
    expect(result.products[0].variants[1].stock.S).toBe(5);
  });
  it("retour en stock et lignes disparues ignorées", () => {
    const { products } = applyStock(
      [hoodie],
      [
        { slug: "hoodie", color: "Noir", size: "L", qty: 1 },
        { slug: "supprime", color: "Noir", size: "M", qty: 1 },
      ],
      1,
    );
    expect(products[0].variants[0].stock.L).toBe(1);
  });
});
