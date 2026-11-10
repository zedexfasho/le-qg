/**
 * Génère toutes les déclinaisons du logo à partir des 3 fichiers de public/brand :
 *   logo-wordmark.png, logo-icon.png, logo-badge.png  (fond crème #FCEFDA)
 *
 * Produit :
 *   public/brand/wordmark(.webp|-sm.webp)        lettrage sans fond (header, mode clair)
 *   public/brand/wordmark-light(.webp|-sm.webp)  lettrage crème (header, mode sombre)
 *   public/brand/badge(.webp|-sm.webp)           badge sans fond (hero, footer)
 *   public/brand/badge.png                       badge sans fond (fallback)
 *   public/icons/*                               favicons 16/32, apple-touch 180, PWA 192/512, maskable
 *   public/favicon.ico
 *   public/og/og-default.jpg                     aperçu de partage 1200×630 (JPEG < 300 Ko pour WhatsApp)
 *
 * Usage : npm run brand
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CREAM, keyOutCream, rawToSharp, recolorBrownToCream, writeResponsiveWebp } from "./lib/images";

const ROOT = process.cwd();
const BRAND = path.join(ROOT, "public", "brand");
const ICONS = path.join(ROOT, "public", "icons");
const OG = path.join(ROOT, "public", "og");

async function main() {
  await mkdir(ICONS, { recursive: true });
  await mkdir(OG, { recursive: true });

  // 1. Lettrage
  const wordmark = await keyOutCream(path.join(BRAND, "logo-wordmark.png"), "global");
  const wordmarkPng = await rawToSharp(wordmark).trim().png().toBuffer();
  // Le header affiche le lettrage sur ~104 px : version mobile de 320 px suffisante
  await writeResponsiveWebp(wordmarkPng, path.join(BRAND, "wordmark"), { quality: 90, smallWidth: 320 });
  const light = recolorBrownToCream(wordmark);
  const lightPng = await rawToSharp(light).trim().png().toBuffer();
  await writeResponsiveWebp(lightPng, path.join(BRAND, "wordmark-light"), { quality: 90, smallWidth: 320 });

  // 2. Badge
  const badge = await keyOutCream(path.join(BRAND, "logo-badge.png"), "flood");
  const badgePng = await rawToSharp(badge).trim().png().toBuffer();
  await writeFile(path.join(BRAND, "badge.png"), badgePng);
  await writeResponsiveWebp(badgePng, path.join(BRAND, "badge"), { quality: 80 });

  // 3. Icône (carrée, centrée)
  const icon = await keyOutCream(path.join(BRAND, "logo-icon.png"), "flood");
  const iconTrim = await rawToSharp(icon).trim().png().toBuffer();
  const square = async (size: number, opts: { padding?: number; background?: typeof CREAM | null } = {}) => {
    const inner = Math.round(size * (1 - 2 * (opts.padding ?? 0)));
    const resized = await sharp(iconTrim)
      .resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    const background = opts.background ? { ...opts.background, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 };
    return sharp({ create: { width: size, height: size, channels: 4, background } })
      .composite([{ input: resized, gravity: "center" }])
      .png()
      .toBuffer();
  };

  const favicon16 = await square(16);
  const favicon32 = await square(32);
  await writeFile(path.join(ICONS, "favicon-16.png"), favicon16);
  await writeFile(path.join(ICONS, "favicon-32.png"), favicon32);
  await writeFile(path.join(ICONS, "apple-touch-icon.png"), await square(180, { padding: 0.06, background: CREAM }));
  await writeFile(path.join(ICONS, "icon-192.png"), await square(192));
  await writeFile(path.join(ICONS, "icon-512.png"), await square(512));
  await writeFile(path.join(ICONS, "icon-maskable-512.png"), await square(512, { padding: 0.12, background: CREAM }));
  await writeFile(path.join(ROOT, "public", "favicon.ico"), buildIco([favicon16, favicon32], [16, 32]));

  // 4. Image Open Graph par défaut
  const badgeOg = await sharp(badgePng).resize({ width: 560, height: 560, fit: "inside" }).toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: CREAM } })
    .composite([{ input: badgeOg, gravity: "center" }])
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(path.join(OG, "og-default.jpg"));

  console.log("✓ Logos, favicons et image de partage générés.");
}

/** Fichier .ico contenant des PNG (format accepté par tous les navigateurs) */
function buildIco(images: Buffer[], sizes: number[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries: Buffer[] = [];
  let offset = 6 + 16 * images.length;
  images.forEach((img, i) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(sizes[i] % 256, 0);
    entry.writeUInt8(sizes[i] % 256, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += img.length;
    entries.push(entry);
  });
  return Buffer.concat([header, ...entries, ...images]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
