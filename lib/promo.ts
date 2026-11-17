/**
 * Codes promo : règles partagées par le formulaire de commande (aperçu de la remise),
 * l'API (contrôle final) et le dashboard (création, statistiques).
 */
import { formatPrice } from "./format";

export const PROMO_KINDS = ["percent", "fixed"] as const;
export type PromoKind = (typeof PROMO_KINDS)[number];

export interface Promo {
  code: string;
  kind: PromoKind;
  value: number;
  label: string | null;
  minSubtotal: number;
  maxUses: number | null;
  firstOrderOnly: boolean;
  /** AAAA-MM-JJ, inclus */
  startsAt: string | null;
  /** AAAA-MM-JJ, inclus */
  endsAt: string | null;
  active: boolean;
}

const CODE_RE = /^[A-Z0-9-]{3,20}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "  awa 10 " → "AWA10" ; null si le code est mal formé */
export function normalizePromoCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.toUpperCase().replace(/\s+/g, "");
  return CODE_RE.test(code) ? code : null;
}

/** Remise en FCFA pour un sous-total donné (jamais plus que le sous-total) */
export function promoDiscount(promo: Pick<Promo, "kind" | "value">, subtotal: number): number {
  const base = Math.max(0, Math.round(subtotal));
  const raw = promo.kind === "percent" ? Math.round((base * promo.value) / 100) : promo.value;
  return Math.max(0, Math.min(base, raw));
}

/** "-10 %" ou "-2 000 FCFA" */
export function describePromo(promo: Pick<Promo, "kind" | "value">): string {
  return promo.kind === "percent" ? `-${promo.value} %` : `-${formatPrice(promo.value)}`;
}

/** Date du jour à Dakar (UTC toute l'année) au format AAAA-MM-JJ */
export const todayInDakar = (now = new Date()) => now.toISOString().slice(0, 10);

/**
 * Pourquoi le code ne peut pas être utilisé (message pour le client), ou null s'il est valable.
 * `uses` : commandes non annulées qui l'ont déjà utilisé.
 * `customerUsed` / `customerHasOrdered` : seulement quand on connaît le numéro du client.
 */
export function promoProblem(
  promo: Promo,
  ctx: { subtotal: number; today?: string; uses: number; customerUsed?: boolean; customerHasOrdered?: boolean },
): string | null {
  const today = ctx.today ?? todayInDakar();
  if (!promo.active) return "Ce code n'est plus actif.";
  if (promo.startsAt && today < promo.startsAt) return "Ce code n'est pas encore valable.";
  if (promo.endsAt && today > promo.endsAt) return "Ce code a expiré.";
  if (promo.maxUses !== null && ctx.uses >= promo.maxUses) return "Ce code a déjà été utilisé le nombre de fois prévu.";
  if (ctx.customerUsed) return "Tu as déjà utilisé ce code.";
  if (promo.firstOrderOnly && ctx.customerHasOrdered) return "Ce code est réservé à une première commande.";
  if (ctx.subtotal < promo.minSubtotal) return `Ce code est valable dès ${formatPrice(promo.minSubtotal)} d'articles.`;
  return null;
}

export type PromoFields = Record<keyof Omit<Promo, "firstOrderOnly" | "active">, string> & { firstOrderOnly: boolean; active: boolean };
export type PromoErrors = Partial<Record<keyof Promo, string>>;

const int = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(typeof value === "string" ? value.replace(/\s/g, "") : value);
  return Number.isInteger(n) ? n : NaN;
};

const realDay = (day: string) => {
  const d = new Date(`${day}T12:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day;
};

/** Formulaire du dashboard (création / modification d'un code) */
export function validatePromo(input: Partial<Record<keyof Promo, unknown>>): { data: Promo | null; errors: PromoErrors } {
  const errors: PromoErrors = {};
  const code = normalizePromoCode(input.code);
  const kind = input.kind as PromoKind;
  const value = int(input.value);
  const label = typeof input.label === "string" ? input.label.trim().replace(/\s+/g, " ") : "";
  const minSubtotal = int(input.minSubtotal) ?? 0;
  const maxUses = int(input.maxUses);
  const day = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const startsAt = day(input.startsAt);
  const endsAt = day(input.endsAt);

  if (!code) errors.code = "De 3 à 20 lettres ou chiffres, sans espace (ex. AWA10).";
  if (!(PROMO_KINDS as readonly string[]).includes(kind)) errors.kind = "Choisis le type de remise.";
  else if (value === null || Number.isNaN(value)) errors.value = "Indique la remise.";
  else if (kind === "percent" && (value < 1 || value > 90)) errors.value = "Entre 1 et 90 %.";
  else if (kind === "fixed" && (value < 100 || value > 1_000_000)) errors.value = "Entre 100 et 1 000 000 FCFA.";
  if (label.length > 60) errors.label = "60 caractères maximum.";
  if (Number.isNaN(minSubtotal) || minSubtotal < 0 || minSubtotal > 10_000_000) errors.minSubtotal = "Montant invalide.";
  if (maxUses !== null && (Number.isNaN(maxUses) || maxUses < 1 || maxUses > 100_000)) errors.maxUses = "Nombre invalide (laisse vide pour illimité).";
  if (startsAt && (!DAY_RE.test(startsAt) || !realDay(startsAt))) errors.startsAt = "Date invalide.";
  if (endsAt && (!DAY_RE.test(endsAt) || !realDay(endsAt))) errors.endsAt = "Date invalide.";
  else if (startsAt && endsAt && endsAt < startsAt) errors.endsAt = "La fin doit être après le début.";

  if (Object.keys(errors).length || !code || value === null) return { data: null, errors };
  return {
    data: {
      code,
      kind,
      value,
      label: label || null,
      minSubtotal,
      maxUses,
      firstOrderOnly: input.firstOrderOnly === true,
      startsAt,
      endsAt,
      active: input.active !== false,
    },
    errors,
  };
}
