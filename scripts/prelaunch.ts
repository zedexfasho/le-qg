/**
 * Vérifie que tout est prêt avant la mise en ligne publique :
 *   npm run prelaunch
 *
 * Réglages du site (data/site.ts), nom de domaine, et (si wrangler est connecté)
 * la base en ligne : migrations, produits publiés, comptes, alertes, numéros de paiement.
 * Ne modifie rien : lecture seule.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { site } from "../data/site";
import { normalizePhone } from "../lib/phone";

type Level = "ok" | "warn" | "fail";
const results: { level: Level; text: string }[] = [];
const report = (level: Level, text: string) => results.push({ level, text });

/* ------------------------- Réglages du site ------------------------- */

if (normalizePhone(site.whatsapp)) report("ok", "Numéro WhatsApp de commande renseigné");
else report("fail", "data/site.ts : `whatsapp` est vide ou invalide (les clients ne pourraient pas te joindre)");

const unpriced = site.delivery.filter((d) => d.price === null).map((d) => d.zone);
if (unpriced.length) report("warn", `Tarifs de livraison « à confirmer » : ${unpriced.join(", ")} (data/site.ts › delivery)`);
else report("ok", "Tarifs de livraison renseignés");

if (Object.values(site.socials).some(Boolean)) report("ok", "Réseaux sociaux renseignés");
else report("warn", "Aucun réseau social (data/site.ts › socials)");

if (site.story[0]?.startsWith("Le QG, c'est d'abord une terrasse")) report("warn", "« Notre histoire » est encore le brouillon : relis-le ou remplace-le (data/site.ts › story)");
if (site.exchangePolicy[0] === "Échange possible sous 48h après la livraison si la taille ne va pas.") {
  report("warn", "La politique d'échange est encore le texte d'exemple : vérifie qu'elle correspond à ta pratique");
}

/* ------------------------- Nom de domaine ------------------------- */

const envUrl = /^NEXT_PUBLIC_SITE_URL=(.*)$/m.exec(existsSync(".env.production") ? readFileSync(".env.production", "utf8") : "")?.[1]?.trim() ?? "";
const wrangler = readFileSync("wrangler.jsonc", "utf8");
const workerUrl = /"SITE_URL":\s*"([^"]*)"/.exec(wrangler)?.[1] ?? "";
const routes = [...wrangler.matchAll(/"pattern":\s*"([^"]+)",\s*"custom_domain":\s*true/g)].map((m) => m[1]);

if (!envUrl || envUrl !== workerUrl) report("fail", `Adresses différentes : .env.production (${envUrl || "vide"}) ≠ wrangler.jsonc (${workerUrl || "vide"}). Lance : npm run domain -- tondomaine.com`);
else if (envUrl.includes(".workers.dev")) report("warn", `Pas encore de nom de domaine (${envUrl}). Après l'achat : npm run domain -- tondomaine.com`);
else if (!routes.includes(new URL(envUrl).hostname)) report("fail", `${new URL(envUrl).hostname} n'est pas branché dans wrangler.jsonc (routes). Lance : npm run domain -- ${new URL(envUrl).hostname}`);
else report("ok", `Nom de domaine : ${envUrl} (${routes.join(", ")})`);

/* ------------------------- Base en ligne (lecture seule) ------------------------- */

function wranglerOut(args: string[]): { ok: boolean; out: string } {
  const local = path.join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js");
  const r = spawnSync(process.execPath, [local, ...args], { encoding: "utf8", env: { ...process.env, WRANGLER_LOG: "error" } });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function query<T>(sqlText: string): T[] | null {
  const r = wranglerOut(["d1", "execute", "le-qg-db", "--remote", "--json", "--command", sqlText]);
  if (!r.ok) return null;
  try {
    const start = r.out.indexOf("[");
    return (JSON.parse(r.out.slice(start)) as { results: T[] }[])[0]?.results ?? [];
  } catch {
    return null;
  }
}

const offline = process.argv.includes("--offline");
const whoami = offline ? { ok: false, out: "" } : wranglerOut(["whoami"]);
if (offline) {
  report("warn", "Base en ligne non vérifiée (--offline)");
} else if (!whoami.ok || /not authenticated/i.test(whoami.out)) {
  report("warn", "Base en ligne non vérifiée : connecte wrangler (npx wrangler login) puis relance");
} else {
  const migrations = wranglerOut(["d1", "migrations", "list", "le-qg-db", "--remote"]);
  const pending = [...migrations.out.matchAll(/(\d{4}_[\w-]+\.sql)/g)].map((m) => m[1]);
  if (!migrations.ok) report("warn", "Impossible de lire les migrations en ligne");
  else if (pending.length) report("ok", `Migrations à appliquer au prochain déploiement (automatique) : ${pending.join(", ")}`);
  else report("ok", "Base en ligne à jour");

  const products = query<{ n: number }>("SELECT COUNT(*) AS n FROM products WHERE published = 1");
  const drafts = query<{ n: number }>("SELECT COUNT(*) AS n FROM products WHERE published = 0");
  if (products === null) report("warn", "Impossible de compter les produits en ligne");
  else if (!products[0]?.n) report("fail", `Aucun produit publié (${drafts?.[0]?.n ?? 0} brouillon(s)) : dashboard › Produits › coche « Publié »`);
  else report("ok", `${products[0].n} produit(s) publié(s)${drafts?.[0]?.n ? `, ${drafts[0].n} brouillon(s)` : ""}`);

  const users = query<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE active = 1");
  if (users === null) report("warn", "Impossible de lire les comptes du dashboard");
  else if (!users[0]?.n) report("fail", "Aucun compte pour le dashboard : npm run admin:create -- --remote");
  else report("ok", `${users[0].n} compte(s) actif(s) sur le dashboard`);

  const payment = query<{ value: string }>("SELECT value FROM settings WHERE key = 'payment'");
  if (payment === null) report("warn", "Numéros Wave / Orange Money : à régler dans le dashboard (Réglages › Paiement) après le déploiement");
  else if (!payment.length) report("warn", "Numéros Wave / Orange Money pas encore réglés : dashboard › Réglages › Paiement");
  else report("ok", "Numéros Wave / Orange Money réglés dans le dashboard");

  const secrets = wranglerOut(["secret", "list", "--format", "json"]);
  if (secrets.ok && /TELEGRAM_BOT_TOKEN/.test(secrets.out) && /TELEGRAM_CHAT_ID/.test(secrets.out)) report("ok", "Alertes Telegram branchées");
  else if (secrets.ok) report("warn", "Alertes Telegram pas branchées (nouvelles commandes, changement des numéros de paiement) : voir README");
}

/* ------------------------- Bilan ------------------------- */

const icon: Record<Level, string> = { ok: "✅", warn: "⚠️ ", fail: "❌" };
console.log("\nAvant la mise en ligne\n");
for (const level of ["fail", "warn", "ok"] as const) for (const r of results.filter((x) => x.level === level)) console.log(`${icon[level]} ${r.text}`);
const fails = results.filter((r) => r.level === "fail").length;
console.log(fails ? `\n${fails} point(s) bloquant(s) à régler avant d'ouvrir le site au public.` : "\nRien de bloquant. Les ⚠️ sont à vérifier, puis : npm run deploy");
process.exitCode = fails ? 1 : 0;
