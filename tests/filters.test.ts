import { describe, expect, it } from "vitest";
import fixture from "./fixtures/products.json";
import type { Product } from "@/lib/types";
import { applyFilters, facetsOf, parseFilters, serializeFilters, type FilterState } from "@/lib/filters";

// Catalogue de test figé (indépendant des produits réels publiés depuis le dashboard)
const products = fixture as Product[];

const params = (query: string) => new URLSearchParams(query);
const base: FilterState = { sizes: [], colors: [], sort: "new" };

describe("URL ⇄ filtres", () => {
  it("aller-retour", () => {
    const state = parseFilters(params("taille=M,L&couleur=Noir&min=10000&max=30000&tri=prix-asc&q=zip"));
    expect(state).toEqual({ category: undefined, sizes: ["M", "L"], colors: ["Noir"], min: 10000, max: 30000, sort: "price-asc", q: "zip" });
    expect(parseFilters(params(serializeFilters(state)))).toEqual(state);
  });

  it("ignore les valeurs invalides", () => {
    const state = parseFilters(params("taille=XXXL,M&min=-5&max=abc&tri=n-importe&categorie=chaussures"));
    expect(state.sizes).toEqual(["M"]);
    expect(state.min).toBeUndefined();
    expect(state.max).toBeUndefined();
    expect(state.sort).toBe("new");
    expect(state.category).toBeUndefined();
  });

  it("URL vide par défaut", () => {
    expect(serializeFilters(base)).toBe("");
  });
});

describe("applyFilters", () => {
  it("tri nouveautés par défaut", () => {
    const dates = applyFilters(products, base).map((p) => p.createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("tri prix", () => {
    const asc = applyFilters(products, { ...base, sort: "price-asc" }).map((p) => p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = applyFilters(products, { ...base, sort: "price-desc" }).map((p) => p.price);
    expect(desc[0]).toBe(Math.max(...desc));
  });

  it("taille dispo : exclut les tailles en rupture", () => {
    // XXL : seul le hoodie noir (1) et le t-shirt blanc (1) en ont en stock
    const slugs = applyFilters(products, { ...base, sizes: ["XXL"] }).map((p) => p.slug).sort();
    expect(slugs).toEqual(["hoodie-zippe-essentiel", "tshirt-graphique-terrasse"]);
  });

  it("couleur ET taille sur la même variante", () => {
    // Hoodie gris chiné : XXL en rupture → exclu ; hoodie noir XXL dispo
    expect(applyFilters(products, { ...base, sizes: ["XXL"], colors: ["Gris chiné"] })).toHaveLength(0);
    expect(applyFilters(products, { ...base, sizes: ["XXL"], colors: ["Noir"] }).map((p) => p.slug)).toContain("hoodie-zippe-essentiel");
  });

  it("fourchette de prix et catégorie", () => {
    const result = applyFilters(products, { ...base, category: "accessoires", max: 10000 });
    expect(result.every((p) => p.category === "accessoires" && p.price <= 10000)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("recherche sans accents ni majuscules", () => {
    expect(applyFilters(products, { ...base, q: "HOODIE zippe" }).map((p) => p.slug)).toEqual(["hoodie-zippe-essentiel"]);
    expect(applyFilters(products, { ...base, q: "chiné" })).toHaveLength(1);
    expect(applyFilters(products, { ...base, q: "introuvable" })).toEqual([]);
  });

  it("facettes", () => {
    const facets = facetsOf(products);
    expect(facets.sizes[0]).toBe("XS");
    expect(facets.sizes.at(-1)).toBe("TU");
    expect(facets.colors.some((c) => c.name === "Noir")).toBe(true);
  });
});
