import { describe, expect, it } from "vitest";
import { formatDate, formatPrice, formatSize, normalizeText, slugify } from "@/lib/format";

const NBSP = " ";

describe("formatPrice", () => {
  it("formate en FCFA avec espaces insécables", () => {
    expect(formatPrice(25000)).toBe(`25${NBSP}000${NBSP}FCFA`);
    expect(formatPrice(1250000)).toBe(`1${NBSP}250${NBSP}000${NBSP}FCFA`);
  });

  it("gère les petits montants et zéro", () => {
    expect(formatPrice(500)).toBe(`500${NBSP}FCFA`);
    expect(formatPrice(0)).toBe(`0${NBSP}FCFA`);
  });

  it("n'utilise jamais d'espace normal ni d'espace fine (U+202F)", () => {
    const out = formatPrice(55000);
    expect(out).not.toMatch(/[  ]/);
  });

  it("arrondit et protège des valeurs invalides", () => {
    expect(formatPrice(9999.6)).toBe(`10${NBSP}000${NBSP}FCFA`);
    expect(formatPrice(Number.NaN)).toBe(`0${NBSP}FCFA`);
    expect(formatPrice(Infinity)).toBe(`0${NBSP}FCFA`);
  });
});

describe("helpers texte", () => {
  it("formatSize", () => {
    expect(formatSize("L")).toBe("Taille L");
    expect(formatSize("TU")).toBe("Taille unique");
  });

  it("normalizeText retire accents et majuscules", () => {
    expect(normalizeText("  Gris Chiné ")).toBe("gris chine");
  });

  it("slugify", () => {
    expect(slugify("T-shirt « Terrasse » été")).toBe("t-shirt-terrasse-ete");
  });

  it("formatDate en français, fuseau Dakar", () => {
    expect(formatDate("2026-11-06T10:00:00.000Z")).toBe("6 novembre 2026");
    expect(formatDate("pas une date")).toBe("");
  });
});
