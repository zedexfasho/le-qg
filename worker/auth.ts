import { hashPassword, passwordProblem, temporaryPassword, toBase64, verifyPassword } from "@/lib/password";
import { isRole, type Role } from "@/lib/team";
import { HttpError, clearRateLimit, clientIp, json, nowIso, optText, rateLimit, readJson, type AppEnv } from "./http";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  must_change_password: number;
}

const COOKIE = "qg_admin";
const SESSION_DAYS = 30;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64(new Uint8Array(digest));
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function sessionCookie(token: string, maxAge: number): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export async function currentUser(request: Request, env: AppEnv): Promise<User | null> {
  const token = readCookie(request, COOKIE);
  if (!token || token.length > 100) return null;
  return env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.must_change_password FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`,
  )
    .bind(await sha256(token), nowIso())
    .first<User>();
}

export async function requireUser(request: Request, env: AppEnv): Promise<User> {
  const user = await currentUser(request, env);
  if (!user) throw new HttpError(401, "Connexion requise.");
  return user;
}

const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");

export async function login(request: Request, env: AppEnv): Promise<Response> {
  const body = await readJson<{ email?: unknown; password?: unknown }>(request, 4_000);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const ipKey = `login-ip:${clientIp(request)}`;
  const emailKey = `login-email:${email}`;

  // 10 essais / 15 min par adresse IP et par email
  if (!(await rateLimit(env, ipKey, 10, 900)) || !(await rateLimit(env, emailKey, 10, 900))) {
    throw new HttpError(429, "Trop de tentatives. Réessaie dans 15 minutes.");
  }

  const user = await env.DB.prepare(
    "SELECT id, email, name, role, password_hash, password_salt, password_iterations, must_change_password FROM users WHERE email = ? AND active = 1",
  )
    .bind(email)
    .first<User & { password_hash: string; password_salt: string; password_iterations: number }>();

  const ok = user
    ? await verifyPassword(password, { hash: user.password_hash, salt: user.password_salt, iterations: user.password_iterations })
    : // Même durée de calcul si l'email n'existe pas
      (await hashPassword(password), false);
  if (!user || !ok) throw new HttpError(401, "Email ou mot de passe incorrect.");

  await clearRateLimit(env, emailKey);
  const token = toBase64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c] ?? "");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(await sha256(token), user.id, expires),
    env.DB.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(nowIso(), user.id),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(nowIso()),
  ]);
  return json(
    { user: publicUser(user) },
    200,
    { "Set-Cookie": sessionCookie(token, SESSION_DAYS * 86_400) },
  );
}

export async function logout(request: Request, env: AppEnv): Promise<Response> {
  const token = readCookie(request, COOKIE);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
}

const publicUser = (user: User) => ({ id: user.id, email: user.email, name: user.name, role: user.role, mustChangePassword: !!user.must_change_password });

export function me(user: User): Response {
  return json({ user: publicUser(user) });
}

export async function changePassword(request: Request, env: AppEnv, user: User): Promise<Response> {
  const body = await readJson<{ current?: unknown; next?: unknown }>(request, 4_000);
  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";
  const problem = passwordProblem(next);
  if (problem) throw new HttpError(400, problem);
  // Vérifie l'ancien mot de passe (limité à 5 essais / 15 min, comme pour les réglages sensibles)
  try {
    await confirmPassword(env, user, current);
  } catch (e) {
    if (e instanceof HttpError && e.status === 400) throw new HttpError(400, "Le mot de passe actuel est incorrect.");
    throw e;
  }
  const h = await hashPassword(next);
  const token = readCookie(request, COOKIE) ?? "";
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?, must_change_password = 0 WHERE id = ?").bind(
      h.hash,
      h.salt,
      h.iterations,
      user.id,
    ),
    // Déconnecte tous les autres appareils (téléphone perdu, mot de passe vu par quelqu'un…) ; garde celui-ci
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").bind(user.id, await sha256(token)),
  ]);
  return json({ ok: true });
}

/* ------------------------------- Équipe ------------------------------- */

export async function listUsers(env: AppEnv): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT id, email, name, role, active, must_change_password, created_at, last_login_at FROM users ORDER BY active DESC, name",
  ).all();
  return json({ users: results });
}

export async function createUser(request: Request, env: AppEnv): Promise<Response> {
  const body = await readJson<{ email?: unknown; name?: unknown; role?: unknown }>(request, 4_000);
  const email = normalizeEmail(body.email);
  const name = optText(body.name, 80);
  if (body.role !== undefined && !isRole(body.role)) throw new HttpError(400, "Rôle inconnu.");
  const role: Role = isRole(body.role) ? body.role : "admin";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new HttpError(400, "Adresse email invalide.");
  if (!name) throw new HttpError(400, "Indique le prénom ou le nom.");
  const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (exists) throw new HttpError(409, "Cette adresse a déjà un accès.");
  const password = temporaryPassword();
  const h = await hashPassword(password);
  await env.DB.prepare(
    "INSERT INTO users (email, name, role, password_hash, password_salt, password_iterations, must_change_password) VALUES (?, ?, ?, ?, ?, ?, 1)",
  )
    .bind(email, name, role, h.hash, h.salt, h.iterations)
    .run();
  return json({ ok: true, temporaryPassword: password }, 201);
}

export async function updateUser(request: Request, env: AppEnv, actor: User, id: number): Promise<Response> {
  const body = await readJson<{ active?: unknown; resetPassword?: unknown; role?: unknown }>(request, 2_000);
  const target = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(id).first();
  if (!target) throw new HttpError(404, "Membre introuvable.");

  if (body.role !== undefined) {
    if (!isRole(body.role)) throw new HttpError(400, "Rôle inconnu.");
    if (id === actor.id) throw new HttpError(400, "Tu ne peux pas changer ton propre rôle.");
    await env.DB.prepare("UPDATE users SET role = ? WHERE id = ?").bind(body.role, id).run();
    return json({ ok: true });
  }

  if (typeof body.active === "boolean") {
    if (id === actor.id && !body.active) throw new HttpError(400, "Tu ne peux pas désactiver ton propre accès.");
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET active = ? WHERE id = ?").bind(body.active ? 1 : 0, id),
      ...(body.active ? [] : [env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id)]),
    ]);
    return json({ ok: true });
  }
  if (body.resetPassword === true) {
    if (id === actor.id) throw new HttpError(400, "Pour ton propre compte, utilise « Changer mon mot de passe ».");
    const password = temporaryPassword();
    const h = await hashPassword(password);
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?, must_change_password = 1 WHERE id = ?").bind(
        h.hash,
        h.salt,
        h.iterations,
        id,
      ),
      env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id),
    ]);
    return json({ ok: true, temporaryPassword: password });
  }
  throw new HttpError(400, "Aucune modification demandée.");
}

/** Redemande le mot de passe avant une action sensible (ex. changer les numéros de paiement) */
export async function confirmPassword(env: AppEnv, user: User, password: unknown): Promise<void> {
  const key = `confirm:${user.id}`;
  if (!(await rateLimit(env, key, 5, 15 * 60))) throw new HttpError(429, "Trop de tentatives. Réessaie dans 15 minutes.");
  const row = await env.DB.prepare("SELECT password_hash, password_salt, password_iterations FROM users WHERE id = ?")
    .bind(user.id)
    .first<{ password_hash: string; password_salt: string; password_iterations: number }>();
  const ok =
    typeof password === "string" &&
    !!password &&
    !!row &&
    (await verifyPassword(password, { hash: row.password_hash, salt: row.password_salt, iterations: row.password_iterations }));
  if (!ok) throw new HttpError(400, "Mot de passe incorrect.", { fields: { password: "Mot de passe incorrect." } });
  await clearRateLimit(env, key);
}
