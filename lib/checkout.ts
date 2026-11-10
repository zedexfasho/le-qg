/**
 * Commande directe sur le site (sans WhatsApp) : règles du formulaire,
 * partagées par la page (messages sous les champs) et par l'API (contrôle final).
 */
import { site } from "@/data/site";
import { PAYMENT_LABELS, type PaymentMethod } from "./orders";
import { normalizePhone } from "./phone";

/** Zones proposées au client : celles de la page Infos (data/site.ts) */
export const CHECKOUT_ZONES: readonly string[] = site.delivery.map((d) => d.zone);

/** Moyens de paiement proposés au client */
export const CHECKOUT_PAYMENTS = ["wave", "orange_money", "especes"] as const satisfies readonly PaymentMethod[];
export const CHECKOUT_PAYMENT_LABELS: Record<(typeof CHECKOUT_PAYMENTS)[number], string> = {
  wave: PAYMENT_LABELS.wave,
  orange_money: PAYMENT_LABELS.orange_money,
  especes: "À la livraison (espèces)",
};

/** Frais de livraison connus pour une zone (null = à confirmer avec le client) */
export function deliveryFeeFor(zone: string): number | null {
  return site.delivery.find((d) => d.zone === zone)?.price ?? null;
}

export interface CheckoutFields {
  name: string;
  phone: string;
  district: string;
  zone: string;
  payment: string;
  note: string;
}

export interface CheckoutData {
  name: string;
  /** Format international sans + (ex. 221771234567) */
  phone: string;
  district: string;
  zone: string;
  payment: (typeof CHECKOUT_PAYMENTS)[number];
  note: string | null;
}

export type CheckoutErrors = Partial<Record<keyof CheckoutFields, string>>;

const text = (value: unknown) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");

/** Vérifie le formulaire ; renvoie les données nettoyées ou un message par champ */
export function validateCheckout(input: Partial<Record<keyof CheckoutFields, unknown>>): { data: CheckoutData | null; errors: CheckoutErrors } {
  const errors: CheckoutErrors = {};
  const name = text(input.name);
  const district = text(input.district);
  const zone = text(input.zone);
  const payment = text(input.payment);
  const note = typeof input.note === "string" ? input.note.trim() : "";
  const phone = normalizePhone(typeof input.phone === "string" ? input.phone : "");

  if (name.length < 2) errors.name = "Indique ton nom.";
  else if (name.length > 80) errors.name = "Nom trop long.";
  if (!phone) errors.phone = "Numéro sénégalais à 9 chiffres, ex. 77 123 45 67.";
  if (district.length < 2) errors.district = "Indique ton quartier ou ta ville.";
  else if (district.length > 120) errors.district = "Adresse trop longue.";
  if (!CHECKOUT_ZONES.includes(zone)) errors.zone = "Choisis ta zone de livraison.";
  if (!(CHECKOUT_PAYMENTS as readonly string[]).includes(payment)) errors.payment = "Choisis ton moyen de paiement.";
  if (note.length > 500) errors.note = "Message trop long (500 caractères maximum).";

  if (Object.keys(errors).length || !phone) return { data: null, errors };
  return {
    data: { name, phone, district, zone, payment: payment as CheckoutData["payment"], note: note || null },
    errors,
  };
}
