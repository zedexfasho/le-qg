/**
 * Récupère le catalogue publié (base de données) et l'écrit dans data/catalog.json,
 * pour que le site soit construit avec les produits à jour du dashboard.
 *
 *   npm run catalog:pull
 *
 * En cas de problème réseau, le fichier existant est conservé (le site reste constructible).
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { Product } from "../lib/types";
import { validateProduct } from "../lib/validate-product";
import { siteUrl } from "./lib/wrangler";

const FILE = "data/catalog.json";

async function main() {
  const url = `${process.env.CATALOG_URL ?? siteUrl()}/api/catalogue`;
  let products: Product[];
  try {
    const res = await fetch(url, { headers: { "User-Agent": "le-qg-build" }, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`réponse ${res.status}`);
    products = ((await res.json()) as { products: Product[] }).products;
  } catch (err) {
    console.warn(`⚠ Catalogue non récupéré depuis ${url} (${(err as Error).message}). On garde ${FILE}.`);
    return;
  }

  if (!Array.isArray(products)) {
    console.warn(`⚠ Réponse inattendue de ${url} : on garde ${FILE}.`);
    return;
  }
  // Aucun produit publié = boutique vide (le site affiche « Les premières pièces arrivent très bientôt »)
  if (products.length === 0) console.warn("⚠ Aucun produit publié dans le dashboard : la boutique sera vide.");
  const valid = products.filter((p) => validateProduct(p).length === 0);
  const skipped = products.length - valid.length;
  if (skipped) console.warn(`⚠ ${skipped} produit(s) incomplet(s) ignoré(s).`);

  const previousCount = (JSON.parse(readFileSync(FILE, "utf8")) as { products: unknown[] }).products.length;
  writeFileSync(FILE, JSON.stringify({ generatedAt: new Date().toISOString(), source: url, products: valid }, null, 2) + "\n");
  console.log(`✓ Catalogue à jour : ${valid.length} produit(s) (avant : ${previousCount}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
