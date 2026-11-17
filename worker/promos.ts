import { normalizePromoCode, promoDiscount, promoProblem, validatePromo, type Promo } from "@/lib/promo";
import { HttpError, clientIp, json, nowIso, rateLimit, readJson, type AppEnv } from "./http";

interface PromoRow {
  code: string;
  kind: Promo["kind"];
  value: number;
  label: string | null;
  min_subtotal: number;
  max_uses: number | null;
  first_order_only: number;
  starts_at: string | null;
  ends_at: string | null;
  active: number;
  created_at: string;
}

const toPromo = (r: PromoRow): Promo => ({
  code: r.code,
  kind: r.kind,
  value: r.value,
  label: r.label,
  minSubtotal: r.min_subtotal,
  maxUses: r.max_uses,
  firstOrderOnly: !!r.first_order_only,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  active: !!r.active,
});

/** Commandes qui comptent comme une utilisation du code (annulées et sans suite exclues) */
const COUNTED = "status NOT IN ('annulee','sans_suite')";

export async function loadPromo(env: AppEnv, code: string): Promise<Promo | null> {
  const row = await env.DB.prepare("SELECT * FROM promo_codes WHERE code = ?").bind(code).first<PromoRow>();
  return row ? toPromo(row) : null;
}

/**
 * Vérifie un code pour une commande du site et renvoie la remise.
 * `phone` connu (commande envoyée) : une utilisation par client, et « première commande » contrôlée.
 * `ignoreOrder` : la commande en cours de modification (même référence) ne compte pas.
 */
export async function checkPromo(
  env: AppEnv,
  rawCode: unknown,
  subtotal: number,
  phone: string | null,
  ignoreOrder?: string,
): Promise<{ promo: Promo; discount: number }> {
  const code = normalizePromoCode(rawCode);
  const promo = code ? await loadPromo(env, code) : null;
  if (!promo) throw new HttpError(400, "Ce code promo n'existe pas.", { fields: { promo: "Ce code promo n'existe pas." } });
  const skip = ignoreOrder ?? "";
  const [uses, customer] = await Promise.all([
    env.DB.prepare(`SELECT count(*) AS n FROM orders WHERE promo_code = ? AND ${COUNTED} AND ref != ?`).bind(promo.code, skip).first<{ n: number }>(),
    phone
      ? env.DB.prepare(
          `SELECT
             sum(CASE WHEN promo_code = ?1 AND ${COUNTED} THEN 1 ELSE 0 END) AS used,
             sum(CASE WHEN status IN ('confirmee','en_livraison','livree') THEN 1 ELSE 0 END) AS ordered
           FROM orders WHERE customer_phone = ?2 AND ref != ?3`,
        )
          .bind(promo.code, phone, skip)
          .first<{ used: number | null; ordered: number | null }>()
      : null,
  ]);
  const problem = promoProblem(promo, {
    subtotal,
    uses: uses?.n ?? 0,
    customerUsed: (customer?.used ?? 0) > 0,
    customerHasOrdered: (customer?.ordered ?? 0) > 0,
  });
  if (problem) throw new HttpError(400, problem, { fields: { promo: problem } });
  return { promo, discount: promoDiscount(promo, subtotal) };
}

/** Aperçu dans le formulaire de commande : GET /api/promo?code=AWA10&subtotal=25000 */
export async function publicCheckPromo(request: Request, env: AppEnv): Promise<Response> {
  // Limite pour empêcher de deviner les codes en essayant au hasard
  if (!(await rateLimit(env, `promo:${clientIp(request)}`, 20, 600))) {
    throw new HttpError(429, "Trop d'essais. Réessaie dans quelques minutes.", { fields: { promo: "Trop d'essais. Réessaie dans quelques minutes." } });
  }
  const url = new URL(request.url);
  const subtotal = Math.max(0, Math.min(100_000_000, Number(url.searchParams.get("subtotal")) || 0));
  const { promo, discount } = await checkPromo(env, url.searchParams.get("code"), subtotal, null);
  // Le libellé reste interne (nom de l'influenceur…)
  return json({ code: promo.code, kind: promo.kind, value: promo.value, discount });
}

/* ---------------------------- Dashboard ----------------------------- */

export async function adminListPromos(env: AppEnv): Promise<Response> {
  const [{ results }, stats] = await Promise.all([
    env.DB.prepare("SELECT * FROM promo_codes ORDER BY active DESC, created_at DESC").all<PromoRow>(),
    env.DB.prepare(
      `SELECT promo_code AS code,
         sum(CASE WHEN ${COUNTED} THEN 1 ELSE 0 END) AS uses,
         sum(CASE WHEN status IN ('confirmee','en_livraison','livree') THEN 1 ELSE 0 END) AS validated,
         sum(CASE WHEN status IN ('confirmee','en_livraison','livree') THEN subtotal - discount ELSE 0 END) AS revenue,
         sum(CASE WHEN status IN ('confirmee','en_livraison','livree') THEN discount ELSE 0 END) AS discounts
       FROM orders WHERE promo_code IS NOT NULL GROUP BY promo_code`,
    ).all<{ code: string; uses: number; validated: number; revenue: number; discounts: number }>(),
  ]);
  const byCode = new Map(stats.results.map((s) => [s.code, s]));
  return json({
    promos: results.map((r) => {
      const s = byCode.get(r.code);
      return { ...toPromo(r), createdAt: r.created_at, uses: s?.uses ?? 0, validated: s?.validated ?? 0, revenue: s?.revenue ?? 0, discounts: s?.discounts ?? 0 };
    }),
  });
}

function promoBinds(p: Promo) {
  return [p.kind, p.value, p.label, p.minSubtotal, p.maxUses, p.firstOrderOnly ? 1 : 0, p.startsAt, p.endsAt, p.active ? 1 : 0] as const;
}

export async function adminCreatePromo(request: Request, env: AppEnv): Promise<Response> {
  const { data, errors } = validatePromo(await readJson(request, 4_000));
  if (!data) throw new HttpError(400, "Vérifie le code promo.", { fields: errors });
  if (await loadPromo(env, data.code)) throw new HttpError(409, "Ce code existe déjà.", { fields: { code: "Ce code existe déjà." } });
  await env.DB.prepare(
    `INSERT INTO promo_codes (code, kind, value, label, min_subtotal, max_uses, first_order_only, starts_at, ends_at, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(data.code, ...promoBinds(data))
    .run();
  return json({ promo: data }, 201);
}

/** Modifie un code (le code lui-même ne change pas : il est déjà dans des commandes) */
export async function adminUpdatePromo(request: Request, env: AppEnv, code: string): Promise<Response> {
  const current = await loadPromo(env, code);
  if (!current) throw new HttpError(404, "Code introuvable.");
  const body = await readJson<Record<string, unknown>>(request, 4_000);
  const { data, errors } = validatePromo({ ...current, ...body, code });
  if (!data) throw new HttpError(400, "Vérifie le code promo.", { fields: errors });
  await env.DB.prepare(
    `UPDATE promo_codes SET kind = ?, value = ?, label = ?, min_subtotal = ?, max_uses = ?, first_order_only = ?, starts_at = ?, ends_at = ?, active = ?, updated_at = ?
     WHERE code = ?`,
  )
    .bind(...promoBinds(data), nowIso(), code)
    .run();
  return json({ promo: data });
}

/** Suppression possible seulement si aucune commande ne l'a utilisé (sinon : le désactiver) */
export async function adminDeletePromo(env: AppEnv, code: string): Promise<Response> {
  const used = await env.DB.prepare("SELECT 1 FROM orders WHERE promo_code = ? LIMIT 1").bind(code).first();
  if (used) throw new HttpError(409, "Ce code a déjà servi : désactive-le plutôt (les statistiques restent).");
  const result = await env.DB.prepare("DELETE FROM promo_codes WHERE code = ?").bind(code).run();
  if (!result.meta.changes) throw new HttpError(404, "Code introuvable.");
  return json({ ok: true });
}
