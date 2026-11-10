/**
 * Ajoute un produit au catalogue à partir d'un dossier de photos + un fichier product.json.
 *
 *   npm run add-product -- imports/hoodie-noir
 *   npm run add-product -- imports/hoodie-noir --dry-run   (vérifie sans rien écrire)
 *
 * Le dossier contient :
 *   product.json   (voir imports/exemple/product.json)
 *   les photos     (.jpg, .jpeg, .png ou .webp)
 *
 * Le script :
 *   1. vérifie le JSON (catégorie, prix, tailles, couleurs…) et que le slug n'existe pas déjà
 *   2. convertit les photos en WebP 1200 px + 600 px (orientation du téléphone corrigée)
 *   3. les range dans public/products/<slug>/1.webp, 2.webp…
 *   4. crée l'image de partage WhatsApp public/products/<slug>/og.jpg
 *   5. ajoute le produit en haut des nouveautés dans data/products.ts
 */
import { existsSync } from "node:fs";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { drops } from "../data/drops";
import { products } from "../data/products";
import { slugify } from "../lib/format";
import type { Product, Size, Variant } from "../lib/types";
import { validateProduct } from "../lib/validate-product";
import { writeProductOg, writeResponsiveWebp } from "./lib/images";

const ROOT = process.cwd();
const PRODUCTS_FILE = path.join(ROOT, "data", "products.ts");
const MARKER = "// @add-product";
const PHOTO_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

interface InputVariant {
  color: string;
  colorHex: string;
  /** Noms des fichiers photo dans le dossier, dans l'ordre d'affichage */
  photos?: string[];
  stock: Partial<Record<Size, number>>;
}

interface InputProduct extends Omit<Product, "slug" | "variants" | "createdAt"> {
  slug?: string;
  createdAt?: string;
  variants: InputVariant[];
}

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const folderArg = args.find((a) => !a.startsWith("--"));
  if (!folderArg) fail("Indique le dossier du produit. Exemple : npm run add-product -- imports/hoodie-noir");

  const folder = path.resolve(ROOT, folderArg);
  if (!existsSync(folder)) fail(`Dossier introuvable : ${folder}`);
  const jsonPath = path.join(folder, "product.json");
  if (!existsSync(jsonPath)) fail(`Il manque product.json dans ${folderArg} (copie imports/exemple/product.json).`);

  let input: InputProduct;
  try {
    input = JSON.parse(await readFile(jsonPath, "utf8"));
  } catch (error) {
    fail(`product.json n'est pas un JSON valide : ${(error as Error).message}\nAstuce : vérifie les virgules et les guillemets.`);
  }

  // Photos présentes dans le dossier
  const files = (await readdir(folder)).filter((f) => f !== "product.json").sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
  const heic = files.filter((f) => /\.(heic|heif)$/i.test(f));
  if (heic.length) fail(`Photos HEIC non prises en charge (${heic.join(", ")}). Envoie-les en JPG (ex. via WhatsApp) ou change le format de l'appareil photo en « Le plus compatible ».`);
  const photos = files.filter((f) => PHOTO_EXT.has(path.extname(f).toLowerCase()));

  if (!Array.isArray(input.variants) || input.variants.length === 0) fail("variants : indique au moins une couleur.");

  // Une seule couleur sans liste de photos → toutes les photos du dossier
  if (input.variants.length === 1 && !input.variants[0].photos) input.variants[0].photos = photos;

  for (const [i, v] of input.variants.entries()) {
    if (!v.photos || v.photos.length === 0) fail(`variants[${i}] (${v.color}) : liste "photos" manquante.`);
    for (const photo of v.photos) {
      if (!files.includes(photo)) fail(`Photo « ${photo} » (couleur ${v.color}) introuvable dans ${folderArg}. Photos trouvées : ${photos.join(", ") || "aucune"}.`);
      if (!PHOTO_EXT.has(path.extname(photo).toLowerCase())) fail(`« ${photo} » : format non pris en charge (jpg, png ou webp).`);
    }
  }

  const slug = input.slug?.trim() || slugify(input.name ?? "");
  if (products.some((p) => p.slug === slug)) fail(`Le slug « ${slug} » existe déjà dans data/products.ts. Choisis un autre "slug" dans product.json.`);
  const outDir = path.join(ROOT, "public", "products", slug);
  if (existsSync(outDir)) fail(`Le dossier public/products/${slug} existe déjà. Supprime-le ou change le slug.`);
  if (input.dropId && !drops.some((d) => d.id === input.dropId)) {
    fail(`dropId « ${input.dropId} » inconnu. Drops existants : ${drops.map((d) => d.id).join(", ")} (ou retire "dropId").`);
  }

  // Construit le produit final avec les chemins d'images numérotés
  let n = 0;
  const plan: { source: string; target: string }[] = [];
  const variants: Variant[] = input.variants.map((v) => ({
    color: v.color,
    colorHex: v.colorHex,
    images: (v.photos ?? []).map((photo) => {
      n += 1;
      const target = `/products/${slug}/${n}.webp`;
      plan.push({ source: path.join(folder, photo), target });
      return target;
    }),
    stock: v.stock,
  }));

  const product: Product = {
    slug,
    name: input.name,
    ...(input.brandLabel ? { brandLabel: input.brandLabel } : {}),
    condition: input.condition,
    category: input.category,
    price: input.price,
    ...(input.oldPrice ? { oldPrice: input.oldPrice } : {}),
    description: input.description ?? "",
    variants,
    isNew: input.isNew ?? true,
    ...(input.dropId ? { dropId: input.dropId } : {}),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };

  const errors = validateProduct(product);
  if (errors.length) fail(`product.json contient des erreurs :\n  - ${errors.join("\n  - ")}`);

  const source = await readFile(PRODUCTS_FILE, "utf8");
  const markerIndex = source.indexOf(MARKER);
  if (markerIndex === -1) fail(`Repère « ${MARKER} » introuvable dans data/products.ts : remets la ligne avant le "];" final.`);

  console.log(`\nProduit : ${product.name} (${slug})`);
  console.log(`Couleurs : ${variants.map((v) => `${v.color} [${v.images.length} photo(s)]`).join(", ")}`);
  if (dryRun) {
    console.log("\n✓ Vérification OK (--dry-run : rien n'a été écrit).\n");
    return;
  }

  // Conversion des photos
  try {
    for (const { source: src, target } of plan) {
      await writeResponsiveWebp(src, path.join(ROOT, "public", target.replace(/\.webp$/, "")));
      process.stdout.write(`  ✓ ${target}\n`);
    }
    await writeProductOg(path.join(ROOT, "public", variants[0].images[0]), path.join(ROOT, "public", "brand", "badge.png"), path.join(outDir, "og.jpg"));
    process.stdout.write(`  ✓ /products/${slug}/og.jpg (aperçu WhatsApp)\n`);
  } catch (error) {
    await rm(outDir, { recursive: true, force: true });
    fail(`Conversion impossible : ${(error as Error).message}`);
  }

  // Insertion dans data/products.ts, juste au-dessus du repère
  const lineStart = source.lastIndexOf("\n", markerIndex) + 1;
  const entry = JSON.stringify(product, null, 2)
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
  const updated = `${source.slice(0, lineStart)}${entry},\n${source.slice(lineStart)}`;
  await writeFile(PRODUCTS_FILE, updated, "utf8");

  console.log(`\n✓ « ${product.name} » ajouté à data/products.ts.`);
  console.log("  Étapes suivantes : npm run dev (pour vérifier), puis npm run check et publie (voir README).\n");
}

main().catch((error) => fail((error as Error).message));
