/**
 * Correctif post-build pour les exports statiques générés sous Windows.
 *
 * Next.js 16 nomme les fichiers de préchargement « __next.shop.__PAGE__.txt »,
 * mais sous Windows le séparateur « \ » n'est pas converti : on obtient des
 * sous-dossiers « __next.shop/__PAGE__.txt » que le navigateur ne trouve pas (404).
 * Ce script remet les fichiers au bon nom. Sous Linux/macOS (Vercel), il ne fait rien.
 */
import { existsSync } from "node:fs";
import { readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(process.cwd(), "out");

async function collectFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(full)));
    else files.push(full);
  }
  return files;
}

async function walk(dir) {
  let fixed = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("__next.")) {
      for (const file of await collectFiles(full)) {
        const relative = path.relative(dir, file).split(path.sep).join(".");
        await rename(file, path.join(dir, relative));
        fixed++;
      }
      await rm(full, { recursive: true, force: true });
    } else {
      fixed += await walk(full);
    }
  }
  return fixed;
}

if (existsSync(OUT) && (await stat(OUT)).isDirectory()) {
  const fixed = await walk(OUT);
  if (fixed > 0) console.log(`✓ ${fixed} fichier(s) de préchargement renommé(s) (correctif export Windows).`);
}
