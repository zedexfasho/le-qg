import type { Drop, Product } from "@/lib/types";
import catalog from "./catalog.json";

/**
 * Catalogue (produits publiés + drops) utilisé pour construire le site.
 *
 * La source de vérité est la base de données (dashboard → Produits).
 * `data/catalog.json` en est une copie, mise à jour automatiquement avant chaque
 * publication (`npm run catalog:pull`, lancé par `npm run deploy` et par GitHub Actions).
 * Ne pas modifier ce fichier à la main : passe par le dashboard.
 */
export const products = catalog.products as Product[];

/** Drops (arrivages), gérés eux aussi dans le dashboard (Produits → Drops) */
export const drops = ((catalog as { drops?: unknown[] }).drops ?? []) as Drop[];
