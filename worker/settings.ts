/**
 * Réglages modifiables depuis le dashboard (table `settings`).
 * Pour l'instant : les numéros Wave / Orange Money, lus en direct par le site.
 */
import {
  describePaymentChange,
  EMPTY_PAYMENT_SETTINGS,
  publicMobileMoney,
  validatePaymentSettings,
  type PaymentSettings,
} from "@/lib/payment";
import { confirmPassword, type User } from "./auth";
import { HttpError, json, nowIso, readJson, type AppEnv } from "./http";
import { notifyPaymentChange, telegramConfigured } from "./notify";

const PAYMENT_KEY = "payment";

interface Stored<T> {
  value: T;
  updatedAt: string | null;
  updatedBy: string | null;
}

async function loadPayment(env: AppEnv): Promise<Stored<PaymentSettings>> {
  const row = await env.DB.prepare("SELECT value, updated_at, updated_by FROM settings WHERE key = ?")
    .bind(PAYMENT_KEY)
    .first<{ value: string; updated_at: string; updated_by: string | null }>();
  if (!row) return { value: EMPTY_PAYMENT_SETTINGS, updatedAt: null, updatedBy: null };
  let value = EMPTY_PAYMENT_SETTINGS;
  try {
    value = { ...EMPTY_PAYMENT_SETTINGS, ...(JSON.parse(row.value) as Partial<PaymentSettings>) };
  } catch {
    console.error("settings: payment illisible");
  }
  return { value, updatedAt: row.updated_at, updatedBy: row.updated_by };
}

/** GET /api/payment : ce que voit le client (moyens désactivés retirés) */
export async function publicPayment(env: AppEnv): Promise<Response> {
  const { value } = await loadPayment(env);
  return json(publicMobileMoney(value), 200, { "Cache-Control": "public, max-age=60" });
}

/** GET /api/admin/settings/payment */
export async function adminGetPayment(env: AppEnv): Promise<Response> {
  const stored = await loadPayment(env);
  return json({ settings: stored.value, updatedAt: stored.updatedAt, updatedBy: stored.updatedBy, telegram: telegramConfigured(env) });
}

/** PUT /api/admin/settings/payment : { settings, password } — mot de passe redemandé, alerte Telegram */
export async function adminSavePayment(request: Request, env: AppEnv, user: User, ctx: ExecutionContext): Promise<Response> {
  const body = await readJson<{ settings?: Record<string, unknown>; password?: unknown }>(request, 8_000);
  const { data, errors } = validatePaymentSettings(body.settings ?? {});
  if (!data) throw new HttpError(400, "Vérifie les réglages de paiement.", { fields: errors });
  await confirmPassword(env, user, body.password);

  const before = (await loadPayment(env)).value;
  const updatedAt = nowIso();
  await env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3, updated_by = ?4`,
  )
    .bind(PAYMENT_KEY, JSON.stringify(data), updatedAt, user.name)
    .run();

  const changes = describePaymentChange(before, data);
  if (changes.length) {
    console.log("payment settings changed by", user.id, changes.join(" | "));
    ctx.waitUntil(notifyPaymentChange(env, user.name, changes).catch((e) => console.error("telegram", e)));
  }
  return json({ settings: data, updatedAt, updatedBy: user.name, changes });
}
