import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { drops } from "@/data/drops";
import { products } from "@/data/products";
import { site } from "@/data/site";
import { validateProduct } from "@/lib/validate-product";
import { normalizePhone } from "@/lib/whatsapp";

const publicFile = (src: string) => path.join(process.cwd(), "public", src);

describe("catalogue (data/products.ts)", () => {
  it.each(products.map((p) => [p.slug, p] as const))("%s est valide", (_, product) => {
    expect(validateProduct(product)).toEqual([]);
  });

  it("slugs uniques", () => {
    const slugs = products.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("toutes les images existent (en 2 tailles)", () => {
    const missing = products
      .flatMap((p) => p.variants.flatMap((v) => v.images))
      // Les photos ajoutées depuis le dashboard sont stockées en ligne (/media), pas dans public/
      .filter((src) => !src.startsWith("/media/"))
      .flatMap((src) => [src, src.replace(/\.webp$/, "-sm.webp")])
      .filter((src) => !existsSync(publicFile(src)));
    expect(missing).toEqual([]);
  });

  it("chaque dropId correspond à un drop existant", () => {
    const ids = new Set(drops.map((d) => d.id));
    expect(products.filter((p) => p.dropId && !ids.has(p.dropId)).map((p) => p.slug)).toEqual([]);
  });

  it("les couvertures de drops existent", () => {
    expect(drops.filter((d) => !existsSync(publicFile(d.cover))).map((d) => d.id)).toEqual([]);
  });

  it("le placeholder de secours existe", () => {
    expect(existsSync(publicFile("/products/placeholder.webp"))).toBe(true);
  });
});

describe("réglages (data/site.ts)", () => {
  it("le numéro WhatsApp est vide (à remplir) ou valide", () => {
    if (site.whatsapp) expect(normalizePhone(site.whatsapp)).not.toBeNull();
  });
});
