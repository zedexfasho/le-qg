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

type Muted = { _writeToOutput: (s: string) => void };

function ask(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    const muted = rl as unknown as Muted;
    const write = muted._writeToOutput.bind(rl);
    muted._writeToOutput = (s: string) => {
      if (s.startsWith(question) || s === "\r\n" || s === "\n") write(s);
      else write("*".repeat(s.length));
    };
  }
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    }),
  );
}

async function main() {
  const target = targetFromArgs();
  console.log(`Création d'un accès au dashboard (${target === "--remote" ? "site EN LIGNE" : "base de développement"})\n`);
  // Variables d'environnement : uniquement pour l'automatisation en développement
  const email = (process.env.ADMIN_EMAIL ?? (await ask("Email : "))).toLowerCase();
  const name = process.env.ADMIN_NAME ?? (await ask("Prénom : "));
  let password = process.env.ADMIN_PASSWORD ?? "";
  if (!password) {
    password = await ask("Mot de passe (10 caractères minimum) : ", true);
    const again = await ask("Confirme le mot de passe : ", true);
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
