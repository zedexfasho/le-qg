/**
 * Copie data/catalog.json dans la base (une seule fois, au démarrage de la plateforme).
 * Les produits déjà présents en base ne sont pas écrasés.
 *
 *   npm run db:seed          (base en ligne)
 *   npm run db:seed:local    (base de développement)
 */
import { readFileSync } from "node:fs";
import type { Product } from "../lib/types";
import { executeSql, sql, targetFromArgs } from "./lib/wrangler";

const { products } = JSON.parse(readFileSync("data/catalog.json", "utf8")) as { products: Product[] };
const statements = products
  .map((p) => `INSERT OR IGNORE INTO products (slug, data, published, created_at) VALUES (${sql(p.slug)}, ${sql(JSON.stringify(p))}, 1, ${sql(p.createdAt)});`)
  .join("\n");

executeSql(statements, targetFromArgs());
console.log(`✓ ${products.length} produit(s) envoyés (ceux qui existaient déjà sont conservés).`);
