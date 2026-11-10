/**
 * Importe un lot de produits depuis un dossier de photos, en BROUILLONS.
 * Les photos sont redimensionnées (1200 px + 600 px, WebP) et envoyées dans le stockage
 * des photos du dashboard ; les produits apparaissent dans Dashboard → Produits → Brouillons,
 * où il reste à mettre le prix, les tailles et le stock puis à cocher « Publié ».
 *
 *   npm run import:photos -- <dossier-photos> <fichier.json> --remote
 *
 * Le fichier JSON décrit les produits (une photo peut servir à plusieurs couleurs) :
 *   [{ "name": "…", "category": "joggings", "description": "…", "sizes": ["S","M","L"],
 *      "variants": [{ "color": "Noir", "colorHex": "#151515", "photos": ["IMG_0533.jpg"] }] }]
 *
 * Un produit dont le lien (slug) existe déjà en base n'est pas modifié.
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { slugify } from "../lib/format";
import { CATEGORIES, SIZES, type Category, type Product, type Size } from "../lib/types";
import { validateProduct } from "../lib/validate-product";
import { executeSql, runWranglerWithRetry, sql, targetFromArgs } from "./lib/wrangler";

interface Draft {
  name: string;
  slug?: string;
  category: Category;
  description?: string;
  condition?: string;
  price?: number;
  sizes: Size[];
  variants: { color: string; colorHex: string; photos: string[] }[];
}

const FULL = 1200;
const SMALL = 600;

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function encode(file: string, width: number): Promise<Buffer> {
  return sharp(file).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
}

async function main() {
  const [dir, manifestPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!dir || !manifestPath) fail("Usage : npm run import:photos -- <dossier-photos> <fichier.json> --remote");
  const target = targetFromArgs();
  const drafts = JSON.parse(readFileSync(manifestPath, "utf8")) as Draft[];

  // 1. Vérifications avant tout envoi
  const errors: string[] = [];
  const photos = new Set<string>();
  for (const d of drafts) {
    if (!CATEGORIES.includes(d.category)) errors.push(`${d.name} : catégorie « ${d.category} » inconnue.`);
    if (!d.sizes?.length || d.sizes.some((s) => !SIZES.includes(s))) errors.push(`${d.name} : tailles invalides.`);
    for (const v of d.variants) {
      for (const p of v.photos) {
        if (!existsSync(path.join(dir, p))) errors.push(`${d.name} (${v.color}) : photo introuvable « ${p} ».`);
        photos.add(p);
      }
    }
  }
  if (errors.length) fail(`Fichier incomplet :\n  ${errors.join("\n  ")}`);

  // 2. Photos : redimensionnement + envoi groupé
  const tmp = mkdtempSync(path.join(tmpdir(), "leqg-photos-"));
  try {
    const srcOf = new Map<string, string>();
    const entries: { key: string; value: string; base64: true; metadata: { contentType: string } }[] = [];
    for (const p of photos) {
      const id = randomBytes(10).toString("hex");
      const file = path.join(dir, p);
      const [full, small] = await Promise.all([encode(file, FULL), encode(file, SMALL)]);
      const metadata = { contentType: "image/webp" };
      entries.push({ key: `${id}.webp`, value: full.toString("base64"), base64: true, metadata });
      entries.push({ key: `${id}-sm.webp`, value: small.toString("base64"), base64: true, metadata });
      srcOf.set(p, `/media/${id}.webp`);
      console.log(`  ${p} → ${Math.round(full.length / 1024)} Ko`);
    }
    // Envoi par petits paquets (~1,5 Mo) : une seule grosse requête dépasse le délai de l'API
    const batches: (typeof entries)[] = [[]];
    let size = 0;
    for (const e of entries) {
      if (size + e.value.length > 1_500_000 && batches[batches.length - 1].length) {
        batches.push([]);
        size = 0;
      }
      batches[batches.length - 1].push(e);
      size += e.value.length;
    }
    console.log(`Envoi de ${photos.size} photo(s) en ${batches.length} paquet(s)…`);
    batches.forEach((batch, i) => {
      const bulk = path.join(tmp, `photos-${i}.json`);
      writeFileSync(bulk, JSON.stringify(batch));
      try {
        runWranglerWithRetry(["kv", "bulk", "put", bulk, "--binding", "MEDIA", target]);
      } catch {
        fail(`L'envoi des photos a échoué (paquet ${i + 1}/${batches.length}, voir ci-dessus).`);
      }
    });

    // 3. Produits en brouillon
    const now = Date.now();
    const products: Product[] = drafts.map((d, i) => {
      const product: Product = {
        slug: d.slug ?? slugify(d.name),
        name: d.name,
        condition: d.condition ?? "Neuf avec étiquette",
        category: d.category,
        price: d.price ?? 0,
        description: d.description ?? "",
        variants: d.variants.map((v) => ({
          color: v.color,
          colorHex: v.colorHex,
          images: v.photos.map((p) => srcOf.get(p)!),
          stock: Object.fromEntries(d.sizes.map((s) => [s, 0])),
        })),
        isNew: true,
        // Ordre du fichier conservé (le plus récent en premier dans la liste)
        createdAt: new Date(now - i * 1000).toISOString(),
      };
      const problems = validateProduct(product, { requireImages: false });
      if (problems.length) fail(`${d.name} : ${problems.join(" ; ")}`);
      return product;
    });
    executeSql(
      products
        .map((p) => `INSERT OR IGNORE INTO products (slug, data, published, created_at) VALUES (${sql(p.slug)}, ${sql(JSON.stringify(p))}, 0, ${sql(p.createdAt)});`)
        .join("\n"),
      target,
    );
    console.log(`✓ ${products.length} produit(s) en brouillon : ${products.map((p) => p.slug).join(", ")}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => fail((err as Error).message));
