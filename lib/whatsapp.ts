import { site } from "@/data/site";
import { formatPrice, formatSize } from "./format";
import { normalizePhone } from "./phone";
import type { OrderLine } from "./types";

export { normalizePhone };

/** Nettoie un texte pour qu'il tienne sur une seule ligne du message */
function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export interface MessageOptions {
  shopName?: string;
  paymentLine?: string;
  /** Référence de commande enregistrée (ex. "QG-K7F3M9P"), affichée dans le message */
  reference?: string;
}

/**
 * Construit le message de commande WhatsApp (fiche produit ET panier).
 * Les lignes invalides (quantité ≤ 0) sont ignorées.
 */
export function buildWhatsAppMessage(items: readonly OrderLine[], options: MessageOptions = {}): string {
  const shopName = options.shopName ?? site.name;
  const paymentLine = options.paymentLine ?? site.paymentLine;

  const lines = items
    .filter((item) => Number.isFinite(item.qty) && item.qty > 0)
    .map((item) => {
      const qty = Math.floor(item.qty);
      const lineTotal = item.unitPrice * qty;
      return `• ${oneLine(item.name)} — ${oneLine(item.color)} — ${formatSize(item.size)} — x${qty} — ${formatPrice(lineTotal)}`;
    });

  const total = items
    .filter((item) => Number.isFinite(item.qty) && item.qty > 0)
    .reduce((sum, item) => sum + item.unitPrice * Math.floor(item.qty), 0);

  return [
    `Salam ${shopName} 👋`,
    options.reference ? `Je veux commander (réf. ${options.reference}) :` : "Je veux commander :",
    "",
    ...lines,
    "",
    `Total : ${formatPrice(total)}`,
    "Nom :",
    "Quartier / ville de livraison :",
    `Paiement : ${paymentLine}`,
  ].join("\n");
}

/**
 * Lien wa.me. Si le numéro est absent ou invalide, le lien ouvre WhatsApp
 * et laisse le client choisir le destinataire (le message reste pré-rempli).
 */
export function buildWhatsAppUrl(message?: string, phone: string = site.whatsapp): string {
  const number = normalizePhone(phone);
  const base = number ? `https://wa.me/${number}` : "https://wa.me/";
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Message court pour le bouton flottant / contact général */
export function contactMessage(): string {
  return `Salam ${site.name} 👋 J'ai une question :`;
}

/** Message pour demander le retour d'un article en rupture */
export function restockMessage(productName: string, color: string): string {
  return `Salam ${site.name} 👋 Le modèle « ${oneLine(productName)} » en ${oneLine(color)} revient bientôt ? Préviens-moi stp 🙏`;
}
