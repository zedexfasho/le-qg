/**
 * Crée (ou réinitialise) un accès au dashboard.
 *
 *   npm run admin:create -- --remote     (site en ligne)
 *   npm run admin:create                 (base de développement)
 *
 * Le mot de passe est demandé sans s'afficher et n'est jamais enregistré en clair.
 */
import { createInterface } from "node:readline";
import { hashPassword, passwordProblem } from "../lib/password";
import { executeSql, sql, targetFromArgs } from "./lib/wrangler";

/** Question visible (email, prénom) */
function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    }),
  );
}

/**
 * Mot de passe : lu touche par touche, seules des étoiles s'affichent.
 * (Ne passe pas par readline, qui réaffiche parfois la ligne en clair.)
 */
function askHidden(question: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) throw new Error("Lance la commande dans un terminal (le mot de passe est saisi au clavier).");
  process.stdout.write(question);
  return new Promise((resolve, reject) => {
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const done = (error?: Error) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") return done();
        if (char === "\u0003") return done(new Error("Annulé."));
        if (char === "\u007f" || char === "\b") {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (char >= " ") {
          value += char;
          process.stdout.write("*");
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const target = targetFromArgs();
  console.log(`Création d'un accès au dashboard (${target === "--remote" ? "site EN LIGNE" : "base de développement"})\n`);
  // Variables d'environnement : uniquement pour l'automatisation en développement
  const email = (process.env.ADMIN_EMAIL ?? (await ask("Email : "))).toLowerCase();
  const name = process.env.ADMIN_NAME ?? (await ask("Prénom : "));
  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    password = await askHidden("Mot de passe (10 caractères minimum) : ");
    const again = await askHidden("Confirme le mot de passe : ");
    if (again !== password) throw new Error("Les deux mots de passe ne correspondent pas.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email invalide.");
  if (!name) throw new Error("Prénom manquant.");
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);

  const h = await hashPassword(password);
  executeSql(
    `INSERT INTO users (email, name, password_hash, password_salt, password_iterations, active, must_change_password)
     VALUES (${sql(email)}, ${sql(name)}, ${sql(h.hash)}, ${sql(h.salt)}, ${h.iterations}, 1, 0)
     ON CONFLICT(email) DO UPDATE SET name = excluded.name, password_hash = excluded.password_hash,
       password_salt = excluded.password_salt, password_iterations = excluded.password_iterations, active = 1, must_change_password = 0;`,
    target,
  );
  console.log(`\n✓ Accès prêt pour ${email}. Connexion : /admin/connexion/`);
}

main().catch((err) => {
  console.error(`✗ ${(err as Error).message}`);
  process.exit(1);
});
