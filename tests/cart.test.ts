import { describe, expect, it } from "vitest";
import fixture from "./fixtures/products.json";
import type { Product } from "@/lib/types";
import { addLine, cartCount, cartTotal, parseCart, removeLine, resolveCart, setLineQty, toOrderLines } from "@/lib/cart";
import type { CartItem } from "@/lib/types";

// Catalogue de test figé (indépendant des produits réels publiés depuis le dashboard)
const products = fixture as Product[];

const item: CartItem = { slug: "hoodie-zippe-essentiel", color: "Gris chiné", size: "M", qty: 1 };

describe("panier — logique pure", () => {
  it("ajoute puis cumule une même ligne", () => {
    let cart = addLine([], item, 4);
    cart = addLine(cart, { ...item, qty: 2 }, 4);
    expect(cart).toEqual([{ ...item, qty: 3 }]);
  });

  it("ne dépasse jamais le stock", () => {
    const cart = addLine(addLine([], { ...item, qty: 3 }, 4), { ...item, qty: 5 }, 4);
    expect(cart[0].qty).toBe(4);
  });

  it("n'ajoute rien si le stock est à 0", () => {
    expect(addLine([], item, 0)).toEqual([]);
  });

  it("distingue couleur et taille", () => {
    const cart = addLine(addLine([], item, 4), { ...item, size: "L" }, 3);
    expect(cart).toHaveLength(2);
    expect(cartCount(cart)).toBe(2);
  });

  it("setLineQty borne et supprime à 0", () => {
    const cart = [{ ...item, qty: 2 }];
    expect(setLineQty(cart, item, 10, 4)[0].qty).toBe(4);
    expect(setLineQty(cart, item, 0, 4)).toEqual([]);
    expect(removeLine(cart, item)).toEqual([]);
  });
});

describe("parseCart", () => {
  it("relit un panier valide", () => {
    expect(parseCart(JSON.stringify([item]))).toEqual([item]);
  });

  it("ignore les données corrompues ou absentes", () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart("pas du json")).toEqual([]);
    expect(parseCart('{"a":1}')).toEqual([]);
    expect(parseCart(JSON.stringify([{ ...item, size: "XXXL" }, { ...item, qty: -1 }, { ...item, qty: 1.5 }, item]))).toEqual([item]);
  });
});

describe("resolveCart — croisement avec le catalogue", () => {
  it("article disponible", () => {
    const [line] = resolveCart([item], products);
    expect(line.status).toBe("ok");
    expect(line.product?.name).toBe("Hoodie zippé essentiel");
  });

  it("quantité supérieure au stock → réduite", () => {
    const [line] = resolveCart([{ ...item, qty: 9 }], products); // stock M gris = 4
    expect(line.status).toBe("reduced");
    expect(line.qty).toBe(4);
  });

  it("taille en rupture, couleur inconnue ou produit retiré → indisponible", () => {
    const lines = resolveCart(
      [
        { ...item, size: "XXL" }, // stock 0
        { ...item, color: "Violet" },
        { ...item, slug: "produit-supprime" },
      ],
      products,
    );
    expect(lines.map((l) => l.status)).toEqual(["unavailable", "unavailable", "unavailable"]);
    expect(toOrderLines(lines)).toEqual([]);
  });

  it("le total n'inclut que les articles commandables", () => {
    const lines = resolveCart([item, { ...item, size: "XXL" }, { slug: "jogging-cargo", color: "Noir", size: "M", qty: 2 }], products);
    const order = toOrderLines(lines);
    expect(order).toHaveLength(2);
    expect(cartTotal(order)).toBe(25000 + 2 * 15000);
  });
});
