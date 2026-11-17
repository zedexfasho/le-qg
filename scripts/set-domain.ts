/**
 * Branche un nom de domaine en une commande :
 *   npm run domain -- leqg.com            (domaine + www.leqg.com)
 *   npm run domain -- leqg.com --no-www   (domaine seul)
 *
 * Met à jour au même endroit :
 *   - .env.production  → NEXT_PUBLIC_SITE_URL (sitemap, aperçus WhatsApp, liens de suivi)
 *   - wrangler.jsonc   → SITE_URL (alertes Telegram, sécurité de l'API) et "routes" (domaine personnalisé)
 *
 * Le domaine doit déjà être dans ton compte Cloudflare (acheté sur Cloudflare, ou ajouté
 * au compte si acheté ailleurs). Ensuite : npm run prelaunch, puis npm run deploy.
 */
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const raw = args.find((a) => !a.startsWith("--"));
const withWww = !args.includes("--no-www");

function normalizeDomain(input: string | undefined): string | null {
  if (!input) return null;
  const d = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
  return /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/.test(d) && !d.endsWith(".workers.dev") ? d : null;
}

const domain = normalizeDomain(raw);
if (!domain) {
  console.error("Indique ton nom de domaine, ex. : npm run domain -- leqg.com");
  process.exit(1);
}
const url = `https://${domain}`;

// .env.production
const envFile = ".env.production";
let env = readFileSync(envFile, "utf8");
env = /^NEXT_PUBLIC_SITE_URL=.*$/m.test(env) ? env.replace(/^NEXT_PUBLIC_SITE_URL=.*$/m, `NEXT_PUBLIC_SITE_URL=${url}`) : `${env.trimEnd()}\nNEXT_PUBLIC_SITE_URL=${url}\n`;
writeFileSync(envFile, env);

// wrangler.jsonc (fichier commenté : modifié en texte, sans toucher au reste)
const wranglerFile = "wrangler.jsonc";
let w = readFileSync(wranglerFile, "utf8");
if (!/"SITE_URL":\s*"[^"]*"/.test(w)) throw new Error(`SITE_URL introuvable dans ${wranglerFile}`);
w = w.replace(/"SITE_URL":\s*"[^"]*"/, `"SITE_URL": "${url}"`);
const patterns = [domain, ...(withWww ? [`www.${domain}`] : [])];
const routes = `"routes": [\n${patterns.map((p) => `    { "pattern": "${p}", "custom_domain": true }`).join(",\n")}\n  ],`;
if (/"routes":\s*\[[\s\S]*?\],/.test(w)) w = w.replace(/"routes":\s*\[[\s\S]*?\],/, routes);
else w = w.replace(/(\n\s*)"d1_databases":/, `$1// Nom de domaine (npm run domain -- …) : branché automatiquement au déploiement$1${routes}$1"d1_databases":`);
writeFileSync(wranglerFile, w);

console.log(`✓ Adresse du site : ${url}`);
console.log(`✓ Domaines branchés au déploiement : ${patterns.join(", ")}`);
if (withWww) console.log(`  (www.${domain} : ajoute la redirection vers ${domain}, voir README « Mise en ligne avec ton nom de domaine »)`);
console.log("\nÉtapes suivantes :\n  npm run prelaunch   (vérifie que tout est prêt)\n  npm run deploy");
