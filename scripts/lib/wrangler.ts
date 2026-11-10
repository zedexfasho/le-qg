import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Échappe une valeur pour une requête SQL littérale (SQLite) */
export function sql(value: string | number | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Lance wrangler. Directement avec Node quand c'est possible (pas de shell : les arguments,
 * comme une requête SQL, passent tels quels), sinon via npx.
 */
export function runWrangler(args: string[]): boolean {
  const local = path.join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js");
  const result = existsSync(local)
    ? spawnSync(process.execPath, [local, ...args], { stdio: "inherit" })
    : spawnSync("npx", ["wrangler", ...args], { stdio: "inherit", shell: process.platform === "win32" });
  return result.status === 0;
}

/** Même commande, rejouée jusqu'à 3 fois en cas de coupure réseau (les requêtes doivent être rejouables) */
export function runWranglerWithRetry(args: string[], attempts = 3): void {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (runWrangler(args)) return;
    if (attempt < attempts) console.log(`\n↻ Nouvel essai (${attempt + 1}/${attempts})…\n`);
  }
  throw new Error("La commande wrangler a échoué (voir ci-dessus). Vérifie ta connexion internet et relance.");
}

/**
 * Exécute du SQL sur la base D1 (locale ou en ligne).
 * Petites requêtes : envoi direct (rapide). Gros lots : fichier importé (plus lent, verrouille la base le temps de l'import).
 */
export function executeSql(statements: string, target: "--local" | "--remote"): void {
  if (statements.length < 6_000) {
    runWranglerWithRetry(["d1", "execute", "le-qg-db", target, "--command", statements, "--yes"]);
    return;
  }
  const dir = mkdtempSync(path.join(tmpdir(), "leqg-"));
  const file = path.join(dir, "requete.sql");
  try {
    writeFileSync(file, statements, "utf8");
    runWranglerWithRetry(["d1", "execute", "le-qg-db", target, "--file", file, "--yes"]);
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
