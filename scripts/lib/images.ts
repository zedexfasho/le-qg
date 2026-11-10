import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/** Fond crème des logos fournis */
export const CREAM = { r: 252, g: 239, b: 218 };

export const FULL_WIDTH = 1200;
export const SMALL_WIDTH = 600;

/**
 * Écrit une image en deux tailles WebP :
 *   <base>.webp     (largeur ≤ maxWidth)
 *   <base>-sm.webp  (largeur ≤ 600, ou `smallWidth`)
 * `input` peut être un chemin, un Buffer ou une instance sharp.
 */
export async function writeResponsiveWebp(
  input: string | Buffer,
  outBase: string,
  options: { maxWidth?: number; smallWidth?: number; quality?: number } = {},
): Promise<{ full: string; small: string }> {
  const maxWidth = options.maxWidth ?? FULL_WIDTH;
  const smallWidth = options.smallWidth ?? SMALL_WIDTH;
  const quality = options.quality ?? 80;
  await mkdir(path.dirname(outBase), { recursive: true });
  const full = `${outBase}.webp`;
  const small = `${outBase}-sm.webp`;
  // rotate() applique l'orientation EXIF des photos de téléphone
  await sharp(input).rotate().resize({ width: maxWidth, height: maxWidth, fit: "inside", withoutEnlargement: true }).webp({ quality }).toFile(full);
  await sharp(input).rotate().resize({ width: smallWidth, height: smallWidth * 1.5, fit: "inside", withoutEnlargement: true }).webp({ quality: quality - 4 }).toFile(small);
  return { full, small };
}

function distance(r: number, g: number, b: number, bg = CREAM): number {
  return Math.sqrt((r - bg.r) ** 2 + (g - bg.g) ** 2 + (b - bg.b) ** 2);
}

/**
 * Rend transparent le fond crème d'un logo.
 *  - mode "global" : tous les pixels proches du crème (lettrage seul)
 *  - mode "flood"  : seulement le fond relié aux bords (préserve le crème à l'intérieur d'un badge)
 * Les pixels de bord reçoivent une transparence partielle, couleur « décontaminée ».
 */
export async function keyOutCream(file: string, mode: "global" | "flood"): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const T0 = 18;
  const T1 = 95;

  let mask: Uint8Array | null = null;
  if (mode === "flood") {
    mask = new Uint8Array(width * height);
    const stack: number[] = [];
    const push = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const p = y * width + x;
      if (mask![p]) return;
      const i = p * 4;
      if (distance(data[i], data[i + 1], data[i + 2]) >= T1) return;
      mask![p] = 1;
      stack.push(p);
    };
    for (let x = 0; x < width; x++) {
      push(x, 0);
      push(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      push(0, y);
      push(width - 1, y);
    }
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % width;
      const y = (p - x) / width;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }
  }

  for (let p = 0; p < width * height; p++) {
    if (mask && !mask[p]) continue;
    const i = p * 4;
    const d = distance(data[i], data[i + 1], data[i + 2]);
    const alpha = Math.max(0, Math.min(1, (d - T0) / (T1 - T0)));
    if (alpha <= 0) {
      data[i + 3] = 0;
      continue;
    }
    const unmix = (c: number, bg: number) => Math.max(0, Math.min(255, Math.round(bg + (c - bg) / alpha)));
    data[i] = unmix(data[i], CREAM.r);
    data[i + 1] = unmix(data[i + 1], CREAM.g);
    data[i + 2] = unmix(data[i + 2], CREAM.b);
    data[i + 3] = Math.round(alpha * 255);
  }
  return { data, width, height };
}

/** Variante claire pour le mode sombre : le brun devient crème, l'orange reste orange */
export function recolorBrownToCream(raw: { data: Buffer; width: number; height: number }): { data: Buffer; width: number; height: number } {
  const data = Buffer.from(raw.data);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i];
    const b = data[i + 2];
    const t = Math.max(0, Math.min(1, (r - b - 60) / 140)); // 0 = brun, 1 = orange
    data[i] = Math.round(CREAM.r * (1 - t) + r * t);
    data[i + 1] = Math.round(CREAM.g * (1 - t) + data[i + 1] * t);
    data[i + 2] = Math.round(CREAM.b * (1 - t) + b * t);
  }
  return { ...raw, data };
}

export function rawToSharp(raw: { data: Buffer; width: number; height: number }) {
  return sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } });
}

/**
 * Image de partage (Open Graph) 1200×630 : badge à gauche, photo produit à droite.
 * Format JPEG : le mieux supporté par les aperçus WhatsApp.
 */
export async function writeProductOg(productImage: string, badge: string, out: string): Promise<void> {
  await mkdir(path.dirname(out), { recursive: true });
  const badgeBuf = await sharp(badge).resize({ width: 400, height: 400, fit: "inside" }).toBuffer();
  const photo = await sharp(productImage).rotate().resize({ width: 600, height: 630, fit: "cover" }).toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: CREAM } })
    .composite([
      { input: badgeBuf, left: 100, top: 115 },
      { input: photo, left: 600, top: 0 },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
}
