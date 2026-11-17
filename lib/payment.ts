/**
 * Paiement mobile (Wave / Orange Money) : numéros de la boutique, lien Wave
 * avec le montant, et textes partagés par le site et le dashboard.
 *
 * Les numéros se règlent dans le dashboard (Réglages › Paiement) et sont lus
 * en direct par le site : pas besoin de republier pour changer de numéro.
 */
import { site } from "@/data/site";
import { formatPrice } from "./format";
import type { PaymentMethod } from "./orders";
import { formatPhone, normalizePhone } from "./phone";

export type MobileMethod = Extract<PaymentMethod, "wave" | "orange_money">;

/** Ce que voit le client (moyens désactivés déjà retirés) */
export interface MobileMoneyConfig {
  /** Nom affiché sur le compte, pour que le client sache qu'il paie la bonne personne */
  holder: string;
  wave: string;
  /** Lien de paiement Wave Business, ex. https://pay.wave.com/m/M_xxxxx/c/sn/ */
  waveLink: string;
  orangeMoney: string;
  /** Moyens que la boutique a désactivés (masqués dans le formulaire de commande) */
  disabled?: MobileMethod[];
}

/** Réglages enregistrés (dashboard) */
export interface PaymentSettings extends MobileMoneyConfig {
  waveEnabled: boolean;
  orangeMoneyEnabled: boolean;
}

export const EMPTY_MOBILE_MONEY: MobileMoneyConfig = { holder: "", wave: "", waveLink: "", orangeMoney: "" };
export const EMPTY_PAYMENT_SETTINGS: PaymentSettings = { ...EMPTY_MOBILE_MONEY, waveEnabled: true, orangeMoneyEnabled: true };

/** Version publique : un moyen désactivé disparaît */
export function publicMobileMoney(s: PaymentSettings): MobileMoneyConfig {
  return {
    holder: s.holder,
    wave: s.waveEnabled ? s.wave : "",
    waveLink: s.waveEnabled ? s.waveLink : "",
    orangeMoney: s.orangeMoneyEnabled ? s.orangeMoney : "",
    disabled: [...(s.waveEnabled ? [] : ["wave" as const]), ...(s.orangeMoneyEnabled ? [] : ["orange_money" as const])],
  };
}

export interface MobileOption {
  method: MobileMethod;
  label: string;
  /** Numéro lisible, ex. "77 123 45 67" */
  number: string;
  /** Lien qui ouvre l'appli avec le montant (Wave Business uniquement) */
  link: string | null;
}

const WAVE_HOSTS = new Set(["pay.wave.com"]);

/** Lien de paiement Wave Business avec le montant pré-rempli */
export function waveLinkFor(base: string, amount: number): string | null {
  if (!base) return null;
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" || !WAVE_HOSTS.has(url.hostname)) return null;
    url.searchParams.set("amount", String(Math.max(0, Math.round(amount))));
    return url.toString();
  } catch {
    return null;
  }
}

/** Moyens de paiement configurés, celui choisi par le client en premier. Vide tant que rien n'est rempli. */
export function mobileOptions(amount: number, preferred: PaymentMethod | null | undefined, config: MobileMoneyConfig): MobileOption[] {
  const options: MobileOption[] = [];
  const wave = normalizePhone(config.wave);
  const waveLink = waveLinkFor(config.waveLink, amount);
  const orange = normalizePhone(config.orangeMoney);
  if (wave || waveLink) options.push({ method: "wave", label: "Wave", number: wave ? formatPhone(wave) : "", link: waveLink });
  if (orange) options.push({ method: "orange_money", label: "Orange Money", number: formatPhone(orange), link: null });
  return options.sort((a, b) => Number(b.method === preferred) - Number(a.method === preferred));
}

/** Le client doit-il payer par mobile (et non en espèces à la livraison) ? */
export function paysByMobile(method: PaymentMethod | null | undefined): boolean {
  return method !== "especes";
}

/** Lignes ajoutées au message WhatsApp « commande confirmée » du dashboard */
export function paymentInstructions(order: { ref: string; total: number; paymentMethod: PaymentMethod | null }, config: MobileMoneyConfig): string[] {
  if (!paysByMobile(order.paymentMethod)) return [`Paiement à la livraison : ${formatPrice(order.total)} en espèces.`];
  const options = mobileOptions(order.total, order.paymentMethod, config);
  if (!options.length) return [];
  const holder = config.holder ? ` (${config.holder})` : "";
  return [
    `Pour payer ${formatPrice(order.total)} :`,
    ...options.map((o) => `• ${o.label}${o.number ? ` au ${o.number}${holder}` : ""}${o.link ? ` : ${o.link}` : ""}`),
    `Motif : ${order.ref}. Envoie-nous la capture une fois payé 🙏`,
  ];
}

/** Message WhatsApp du client après avoir payé */
export function paidMessage(ref: string, amount: number, method: MobileMethod): string {
  return `Salam ${site.name} 👋 J'ai payé la commande ${ref} par ${method === "wave" ? "Wave" : "Orange Money"} (${formatPrice(amount)}). Voici la capture :`;
}

/* ----------------------- Formulaire du dashboard ----------------------- */

export type PaymentErrors = Partial<Record<keyof PaymentSettings, string>>;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Vérifie les réglages saisis ; renvoie les données nettoyées (numéros au format 221XXXXXXXXX) */
export function validatePaymentSettings(input: Partial<Record<keyof PaymentSettings, unknown>>): { data: PaymentSettings | null; errors: PaymentErrors } {
  const errors: PaymentErrors = {};
  const holder = str(input.holder).replace(/\s+/g, " ");
  const waveRaw = str(input.wave);
  const omRaw = str(input.orangeMoney);
  const waveLink = str(input.waveLink);
  const waveEnabled = input.waveEnabled !== false;
  const orangeMoneyEnabled = input.orangeMoneyEnabled !== false;
  const wave = waveRaw ? normalizePhone(waveRaw) : "";
  const orangeMoney = omRaw ? normalizePhone(omRaw) : "";

  if (holder.length > 60) errors.holder = "60 caractères maximum.";
  if (wave === null) errors.wave = "Numéro invalide (ex. 77 123 45 67).";
  if (orangeMoney === null) errors.orangeMoney = "Numéro invalide (ex. 77 123 45 67).";
  if (waveLink && !waveLinkFor(waveLink, 0)) errors.waveLink = "Colle le lien Wave Business complet, il commence par https://pay.wave.com/";
  if (waveEnabled && !waveRaw && !waveLink) errors.wave = "Indique le numéro Wave (ou désactive Wave).";
  if (orangeMoneyEnabled && !omRaw) errors.orangeMoney = "Indique le numéro Orange Money (ou désactive Orange Money).";

  if (Object.keys(errors).length) return { data: null, errors };
  return { data: { holder, wave: wave ?? "", waveLink, orangeMoney: orangeMoney ?? "", waveEnabled, orangeMoneyEnabled }, errors };
}

/** Résumé lisible d'un changement (alerte Telegram, historique) */
export function describePaymentChange(before: PaymentSettings, after: PaymentSettings): string[] {
  const show = (n: string) => (n ? formatPhone(n) : "—");
  const lines: string[] = [];
  if (before.wave !== after.wave) lines.push(`Wave : ${show(before.wave)} → ${show(after.wave)}`);
  if (before.orangeMoney !== after.orangeMoney) lines.push(`Orange Money : ${show(before.orangeMoney)} → ${show(after.orangeMoney)}`);
  if (before.waveLink !== after.waveLink) lines.push(`Lien Wave : ${after.waveLink || "retiré"}`);
  if (before.holder !== after.holder) lines.push(`Nom affiché : ${after.holder || "—"}`);
  if (before.waveEnabled !== after.waveEnabled) lines.push(`Wave ${after.waveEnabled ? "activé" : "désactivé"}`);
  if (before.orangeMoneyEnabled !== after.orangeMoneyEnabled) lines.push(`Orange Money ${after.orangeMoneyEnabled ? "activé" : "désactivé"}`);
  return lines;
}

/* ------------------------- Lecture côté navigateur ------------------------- */

let cache: { at: number; promise: Promise<MobileMoneyConfig> } | null = null;

/** Réglages publics, lus sur /api/payment (mis en cache 1 minute dans la page) */
export function loadMobileMoney(): Promise<MobileMoneyConfig> {
  if (cache && Date.now() - cache.at < 60_000) return cache.promise;
  const promise = fetch("/api/payment")
    .then((r) => (r.ok ? (r.json() as Promise<MobileMoneyConfig>) : EMPTY_MOBILE_MONEY))
    .then((c) => ({ ...EMPTY_MOBILE_MONEY, ...c }))
    .catch(() => {
      cache = null;
      return EMPTY_MOBILE_MONEY;
    });
  cache = { at: Date.now(), promise };
  return promise;
}
