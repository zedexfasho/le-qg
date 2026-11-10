import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Échappe une valeur pour une requête SQL littérale (SQLite) */
export function sql(value: string | number | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

/** Exécute un fichier SQL sur la base D1 (locale ou en ligne) via wrangler */
export function executeSql(statements: string, target: "--local" | "--remote"): void {
  const dir = mkdtempSync(path.join(tmpdir(), "leqg-"));
  const file = path.join(dir, "requete.sql");
  try {
    writeFileSync(file, statements, "utf8");
    const result = spawnSync("npx", ["wrangler", "d1", "execute", "le-qg-db", target, "--file", file, "--yes"], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (result.status !== 0) throw new Error("La commande wrangler a échoué (voir ci-dessus).");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function targetFromArgs(): "--local" | "--remote" {
  return process.argv.includes("--remote") ? "--remote" : "--local";
}

/** Adresse publique du site : variable d'environnement, sinon .env.production */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  try {
    const line = readFileSync(".env.production", "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("NEXT_PUBLIC_SITE_URL="));
    if (line) return line.slice("NEXT_PUBLIC_SITE_URL=".length).trim().replace(/\/+$/, "");
  } catch {
    // pas de fichier
  }
  throw new Error("Adresse du site inconnue : renseigne NEXT_PUBLIC_SITE_URL dans .env.production");
}
