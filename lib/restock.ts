/**
 * « Me prévenir du retour » : règles partagées par la fiche produit (formulaire),
 * l'API (contrôle final) et le dashboard (message WhatsApp au client).
 */
import { site } from "@/data/site";
import { formatSize } from "./format";
import { normalizePhone } from "./phone";
import type { Size } from "./types";

export const RESTOCK_STATUSES = ["en_attente", "prevenu", "annulee"] as const;
export type RestockStatus = (typeof RESTOCK_STATUSES)[number];

export interface RestockContactFields {
  name: string;
  phone: string;
}

export type RestockErrors = Partial<Record<keyof RestockContactFields, string>>;

/** Coordonnées du client : numéro obligatoire (pour le prévenir), prénom facultatif */
export function validateRestockContact(input: Partial<Record<keyof RestockContactFields, unknown>>): {
  data: { name: string | null; phone: string } | null;
  errors: RestockErrors;
} {
  const errors: RestockErrors = {};
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  const phone = normalizePhone(typeof input.phone === "string" ? input.phone : "");
  if (name.length > 60) errors.name = "Prénom trop long.";
  if (!phone) errors.phone = "Numéro sénégalais à 9 chiffres, ex. 77 123 45 67.";
  if (!phone || Object.keys(errors).length) return { data: null, errors };
  return { data: { name: name || null, phone }, errors };
}

/** Message WhatsApp envoyé depuis le dashboard quand la pièce est de retour */
export function restockReadyMessage(r: { name: string | null; productName: string; color: string; size: Size | null; slug: string }): string {
  const what = `« ${r.productName} » en ${r.color}${r.size ? ` (${formatSize(r.size)})` : ""}`;
  return [
    `Salam${r.name ? ` ${r.name}` : ""} 👋`,
    `Bonne nouvelle : ${what} est de retour au QG !`,
    `${site.url}/product/${r.slug}/`,
    "Les pièces partent vite, commande dès que tu peux 🔥",
  ].join("\n");
}
