/**
 * Exporte l'affiche en PNG (et JPG léger pour WhatsApp) avec Chrome ou Edge, sans rien installer :
 *   node marketing/affiche/export.mjs
 * Résultat : marketing/affiche/le-qg-affiche-post.png (1080×1350), le-qg-affiche-story.png (1080×1920)
 * et l'aperçu des liens du site public/og/og-default.jpg (1200×630, < 300 Ko pour WhatsApp)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const dir = path.dirname(fileURLToPath(import.meta.url));
const browsers = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
];
const browser = browsers.find((b) => existsSync(b));
if (!browser) throw new Error("Chrome ou Edge introuvable");

const page = pathToFileURL(path.join(dir, "affiche.html")).href;
for (const [format, width, height] of [["post", 1080, 1350], ["story", 1080, 1920], ["og", 1200, 630]]) {
  const png = path.join(dir, `le-qg-affiche-${format}.png`);
  const profile = mkdtempSync(path.join(os.tmpdir(), "qg-affiche-"));
  execFileSync(browser, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    `--user-data-dir=${profile}`,
    "--force-device-scale-factor=1",
    "--virtual-time-budget=4000",
    `--window-size=${width},${height}`,
    `--screenshot=${png}`,
    `${page}?format=${format}`,
  ], { stdio: "ignore" });
  rmSync(profile, { recursive: true, force: true });
  await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toFile(png.replace(/\.png$/, ".jpg"));
  if (format === "og") await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(dir, "../../public/og/og-default.jpg"));
  console.log(`✓ ${path.relative(process.cwd(), png)} (+ .jpg)`);
}
