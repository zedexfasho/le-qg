/**
 * Génère des images d'EXEMPLE neutres (fond sable, silhouette de vêtement dans la
 * couleur de la variante, cintre) pour chaque image référencée dans data/products.ts
 * et data/drops.ts — uniquement si le fichier n'existe pas déjà.
 *
 * Usage : npm run placeholders          (ne remplace rien)
 *         npm run placeholders -- --force (régénère tout)
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { drops } from "../data/drops";
import { products } from "../data/products";
import type { Category } from "../lib/types";
import { writeProductOg, writeResponsiveWebp } from "./lib/images";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const BADGE = path.join(PUBLIC, "brand", "badge.png");
const force = process.argv.includes("--force");

const W = 960;
const H = 1200;
const STROKE = 'stroke="#31160A" stroke-opacity="0.35" stroke-width="5" stroke-linejoin="round"';

const HANGER = `<g fill="none" stroke="#31160A" stroke-opacity="0.55" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
  <path d="M200 58 q0 -20 18 -20 q18 0 18 18 q0 14 -18 22 v14"/>
  <path d="M218 92 L120 150 h196 Z"/>
</g>`;

function silhouette(category: Category, fill: string): string {
  const shape = (d: string) => `<path d="${d}" fill="${fill}" ${STROKE}/>`;
  switch (category) {
    case "hoodies":
      return `${shape("M128 150 L100 162 L58 340 L96 352 L132 238 L132 420 L304 420 L304 238 L340 352 L378 340 L336 162 L308 150 Z")}
        ${shape("M156 158 Q152 92 218 86 Q284 92 280 158 Q252 182 218 182 Q184 182 156 158 Z")}
        <path d="M218 182 V420" stroke="#31160A" stroke-opacity="0.45" stroke-width="4"/>
        <path d="M150 330 H286" stroke="#31160A" stroke-opacity="0.25" stroke-width="4"/>`;
    case "ensembles":
      return `<g transform="translate(40 0) scale(0.82)">${shape("M128 150 L100 162 L58 300 L96 312 L132 228 L132 330 L304 330 L304 228 L340 312 L378 300 L336 162 L308 150 Q218 196 128 150 Z")}</g>
        <g transform="translate(70 250) scale(0.68)">${shape("M140 90 L296 90 L310 420 L246 420 L218 200 L190 420 L126 420 Z")}</g>`;
    case "joggings":
      return `${shape("M136 96 L300 96 L318 430 L250 430 L218 196 L186 430 L118 430 Z")}
        <path d="M136 120 H300" stroke="#31160A" stroke-opacity="0.35" stroke-width="6"/>
        <rect x="130" y="250" width="34" height="46" rx="6" fill="${fill}" ${STROKE}/>
        <rect x="272" y="250" width="34" height="46" rx="6" fill="${fill}" ${STROKE}/>`;
    case "tshirts":
      return `${shape("M128 130 L180 104 Q218 132 256 104 L308 130 L368 196 L326 232 L304 210 L304 420 L132 420 L132 210 L110 232 L68 196 Z")}
        <circle cx="218" cy="270" r="44" fill="#E76117" fill-opacity="0.85"/>
        <path d="M168 290 H268" stroke="#31160A" stroke-opacity="0.6" stroke-width="6"/>`;
    case "maillots":
      return `${shape("M128 130 L184 104 L218 150 L252 104 L308 130 L368 196 L326 232 L304 210 L304 420 L132 420 L132 210 L110 232 L68 196 Z")}
        <path d="M132 260 H304" stroke="#FFFDF8" stroke-opacity="0.75" stroke-width="16"/>
        <path d="M132 290 H304" stroke="#31160A" stroke-opacity="0.25" stroke-width="6"/>`;
    case "chemises":
      return `${shape("M128 130 L184 104 L218 126 L252 104 L308 130 L368 196 L326 232 L304 210 L304 420 L132 420 L132 210 L110 232 L68 196 Z")}
        ${shape("M184 104 L218 150 L200 168 L176 120 Z")}${shape("M252 104 L218 150 L236 168 L260 120 Z")}
        <path d="M218 150 V420" stroke="#31160A" stroke-opacity="0.4" stroke-width="3"/>
        ${[190, 240, 290, 340, 390].map((y) => `<circle cx="226" cy="${y}" r="4" fill="#31160A" fill-opacity="0.5"/>`).join("")}
        ${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${160 + (i % 3) * 30}" cy="${230 + Math.floor(i / 3) * 80}" r="10" fill="#FFFDF8" fill-opacity="0.35"/>`).join("")}`;
    case "accessoires":
    default:
      return "";
  }
}

function accessory(slug: string, fill: string): string {
  if (slug.includes("bonnet")) {
    return `<path d="M120 320 Q120 140 218 130 Q316 140 316 320 Z" fill="${fill}" ${STROKE}/>
      ${[150, 184, 218, 252, 286].map((x) => `<path d="M${x} ${x === 218 ? 140 : 170} V320" stroke="#31160A" stroke-opacity="0.18" stroke-width="5"/>`).join("")}
      <rect x="104" y="300" width="228" height="70" rx="16" fill="${fill}" ${STROKE}/>`;
  }
  return `<path d="M136 230 Q218 40 300 230" fill="none" stroke="#31160A" stroke-opacity="0.6" stroke-width="10"/>
    <rect x="110" y="220" width="216" height="170" rx="30" fill="${fill}" ${STROKE}/>
    <path d="M130 270 H306" stroke="#31160A" stroke-opacity="0.45" stroke-width="5" stroke-dasharray="10 6"/>`;
}

function productSvg(category: Category, slug: string, fill: string, alt: boolean): string {
  const art = category === "accessoires" ? accessory(slug, fill) : `${HANGER}${silhouette(category, fill)}`;
  // Vue 2 : plan rapproché, fond inversé
  const transform = alt ? "translate(-130 -128) scale(2.8)" : "translate(42 70) scale(2)";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${alt ? "#FCEFDA" : "#FDE0AF"}"/>
      <stop offset="1" stop-color="${alt ? "#FDE0AF" : "#FCEFDA"}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="480" cy="1010" rx="300" ry="36" fill="#31160A" fill-opacity="0.08"/>
  <g transform="${transform}">${art}</g>
</svg>`;
}

function placeholderSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#FDE0AF"/>
  <g transform="translate(44 412) scale(2)">${HANGER}</g>
</svg>`;
}

function dropSvg(seed: number): string {
  const bulbs = [160, 400, 640, 880, 1120]
    .map((x, i) => `<line x1="${x}" y1="${70 + (i % 2) * 18}" x2="${x}" y2="${100 + (i % 2) * 18}" stroke="#31160A" stroke-width="4"/><circle cx="${x}" cy="${120 + (i % 2) * 18}" r="22" fill="#FDE0AF"/>`)
    .join("");
  const colors = seed % 2 === 0 ? ["#1C1A19", "#BDBAB4", "#6B1E2A"] : ["#1E7B45", "#D9661F", "#2B4C8C"];
  const pieces = (["hoodies", "tshirts", "joggings"] as Category[])
    .map((c, i) => `<g transform="translate(${170 + i * 330} 230) scale(1.05)">${HANGER}${silhouette(c, colors[i])}</g>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F39A3A"/>
      <stop offset="1" stop-color="#E76117"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#sun)"/>
  <path d="M0 60 Q300 130 600 70 T1200 60" fill="none" stroke="#31160A" stroke-width="4"/>
  ${bulbs}
  <circle cx="600" cy="820" r="260" fill="#FDE0AF" fill-opacity="0.35"/>
  ${pieces}
</svg>`;
}

async function writeIfMissing(publicPath: string, svg: string): Promise<boolean> {
  const outBase = path.join(PUBLIC, publicPath.replace(/\.webp$/, ""));
  if (!force && existsSync(`${outBase}.webp`)) return false;
  await writeResponsiveWebp(Buffer.from(svg), outBase, { quality: 78 });
  return true;
}

async function main() {
  let count = 0;
  if (await writeIfMissing("/products/placeholder.webp", placeholderSvg())) count++;

  for (const product of products) {
    for (const variant of product.variants) {
      for (const [i, image] of variant.images.entries()) {
        if (await writeIfMissing(image, productSvg(product.category, product.slug, variant.colorHex, i % 2 === 1))) count++;
      }
    }
    const og = path.join(PUBLIC, "products", product.slug, "og.jpg");
    const first = product.variants[0]?.images[0];
    if (first && (force || !existsSync(og))) {
      await writeProductOg(path.join(PUBLIC, first), BADGE, og);
      count++;
    }
  }

  for (const [i, drop] of drops.entries()) {
    if (await writeIfMissing(drop.cover, dropSvg(i))) count++;
  }

  console.log(`✓ ${count} image(s) d'exemple générée(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
