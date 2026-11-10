import { formatPrice, formatSize } from "@/lib/format";
import { SOURCE_LABELS, type OrderSource } from "@/lib/orders";
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
  order: { ref: string; total: number; source: OrderSource; lines: readonly { name: string; color: string; size: Size; qty: number }[] },
): Promise<void> {
  const lines = order.lines.map((l) => `• ${esc(l.name)} — ${esc(l.color)} — ${formatSize(l.size)} — x${l.qty}`);
  const link = `${env.SITE_URL}/admin/commandes/?q=${encodeURIComponent(order.ref)}`;
  await sendTelegram(
    env,
    [
      `🛍️ <b>Nouvelle commande ${order.ref}</b> (${SOURCE_LABELS[order.source]})`,
      ...lines,
      `<b>Total articles : ${formatPrice(order.total)}</b>`,
      "",
      `Le client va t'écrire sur WhatsApp avec cette référence.`,
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
