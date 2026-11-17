import { formatPrice, formatSize } from "@/lib/format";
import { PAYMENT_LABELS, SOURCE_LABELS, type OrderSource, type PaymentMethod } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import type { Size } from "@/lib/types";
import { HttpError, json, type AppEnv } from "./http";

/** Échappe le texte pour le format HTML de Telegram */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function telegramConfigured(env: AppEnv): boolean {
  return !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
}

async function sendTelegram(env: AppEnv, text: string): Promise<boolean> {
  if (!telegramConfigured(env)) return false;
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!res.ok) console.error("telegram", res.status, await res.text());
  return res.ok;
}

export async function notifyNewOrder(
  env: AppEnv,
  order: {
    ref: string;
    total: number;
    source: OrderSource;
    lines: readonly { name: string; color: string; size: Size; qty: number }[];
    /** Rempli quand le client a utilisé le formulaire du site */
    customer?: { name: string; phone: string; district: string; zone: string; payment: PaymentMethod; note: string | null } | null;
    promo?: { code: string; discount: number } | null;
  },
): Promise<void> {
  const lines = order.lines.map((l) => `• ${esc(l.name)} — ${esc(l.color)} — ${formatSize(l.size)} — x${l.qty}`);
  const link = `${env.SITE_URL}/admin/commandes/?q=${encodeURIComponent(order.ref)}`;
  await sendTelegram(
    env,
    [
      `🛍️ <b>Nouvelle commande ${order.ref}</b> (${SOURCE_LABELS[order.source]})`,
      ...lines,
      ...(order.promo ? [`🏷️ Code ${esc(order.promo.code)} : -${formatPrice(order.promo.discount)}`] : []),
      `<b>Total : ${formatPrice(order.total)}</b>`,
      "",
      ...(order.customer
        ? [
            `👤 ${esc(order.customer.name)} — ${formatPhone(order.customer.phone)}`,
            `📍 ${esc(order.customer.district)} (${esc(order.customer.zone)})`,
            `💳 ${PAYMENT_LABELS[order.customer.payment]}`,
            ...(order.customer.note ? [`💬 ${esc(order.customer.note)}`] : []),
            "",
            "Commande passée avec le formulaire du site : appelle ou écris au client pour confirmer.",
          ]
        : ["Le client va t'écrire sur WhatsApp avec cette référence."]),
      `<a href="${link}">Ouvrir dans le dashboard</a>`,
    ].join("\n"),
  );
}

export async function testNotification(env: AppEnv): Promise<Response> {
  if (!telegramConfigured(env)) throw new HttpError(400, "Les alertes Telegram ne sont pas encore configurées (voir le guide dans le README).");
  const ok = await sendTelegram(env, "✅ Le QG : les alertes de commandes fonctionnent !");
  if (!ok) throw new HttpError(502, "Telegram a refusé le message : vérifie le jeton du bot et l'identifiant de discussion.");
  return json({ ok: true });
}

/** Alerte de sécurité : les numéros de paiement ont changé */
export async function notifyPaymentChange(env: AppEnv, by: string, changes: readonly string[]): Promise<void> {
  if (!changes.length) return;
  await sendTelegram(
    env,
    [
      `🔐 <b>Numéros de paiement modifiés</b> par ${esc(by)}`,
      ...changes.map((c) => `• ${esc(c)}`),
      "",
      "Si ce n'est pas toi ou ton équipe : connecte-toi au dashboard, corrige dans Réglages › Paiement et retire l'accès de la personne.",
      `<a href="${env.SITE_URL}/admin/paiement/">Ouvrir les réglages de paiement</a>`,
    ].join("\n"),
  );
}
