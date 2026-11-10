import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/types";
import { validateProduct } from "@/lib/validate-product";

const base: Product = {
  slug: "jogging-molleton",
  name: "Jogging molleton",
  condition: "Neuf avec étiquette",
  category: "joggings",
  price: 15000,
  description: "",
  variants: [{ color: "Noir", colorHex: "#151515", images: ["/media/0123456789abcdef0123.webp"], stock: { M: 2 } }],
  createdAt: "2026-11-10T10:00:00.000Z",
};

describe("validateProduct", () => {
  it("accepte un produit complet", () => {
    expect(validateProduct(base)).toEqual([]);
  });

  it("brouillon : prix et photos peuvent manquer", () => {
    const draft = { ...base, price: 0, variants: [{ ...base.variants[0], images: [] }] };
    expect(validateProduct(draft, { requireImages: false })).toEqual([]);
  });

  it("publié : prix obligatoire", () => {
    expect(validateProduct({ ...base, price: 0 })).toHaveLength(1);
  });

  it("publié : au moins une photo par couleur", () => {
    expect(validateProduct({ ...base, variants: [{ ...base.variants[0], images: [] }] })).toHaveLength(1);
  });

  it("prix négatif refusé même en brouillon", () => {
    expect(validateProduct({ ...base, price: -1 }, { requireImages: false })).toHaveLength(1);
  });

  it("prix libre (pas forcément un multiple de 500)", () => {
    expect(validateProduct({ ...base, price: 8250 })).toEqual([]);
  });
});
