"use client";

import { Check, Copy, ExternalLink, Wallet } from "lucide-react";
import { useState } from "react";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { buttonClasses } from "@/components/ui/styles";
import { formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/lib/orders";
import { mobileOptions, paidMessage, type MobileMoneyConfig } from "@/lib/payment";
import { useMobileMoney } from "@/lib/use-mobile-money";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/** Petit bouton « copier » (numéro, montant, référence) */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          () => undefined,
        );
      }}
      className="grid size-9 shrink-0 place-items-center rounded-full border border-line hover:bg-ink/5"
      aria-label={copied ? `${label} copié` : `Copier ${label}`}
    >
      {copied ? <Check className="size-4 text-accent-strong" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
    </button>
  );
}

/**
 * Instructions de paiement Wave / Orange Money : numéro de la boutique, montant exact,
 * référence à mettre en motif, puis « J'ai payé » (capture sur WhatsApp).
 * Les numéros viennent du dashboard (Réglages › Paiement), lus en direct :
 * rien ne s'affiche tant qu'aucun numéro n'est renseigné.
 */
interface PayNowProps {
  orderRef: string;
  amount: number;
  preferred?: PaymentMethod | null;
  title?: string;
}

export function PayNow(props: PayNowProps) {
  const config = useMobileMoney();
  if (!config) return null;
  return <PayNowView {...props} config={config} />;
}

/** Affichage seul (aussi utilisé pour l'aperçu du dashboard) */
export function PayNowView({ orderRef, amount, preferred, title = "Payer maintenant", config }: PayNowProps & { config: MobileMoneyConfig }) {
  const options = mobileOptions(amount, preferred, config);
  const [selected, setSelected] = useState(0);
  if (!options.length || amount <= 0) return null;
  const option = options[Math.min(selected, options.length - 1)];
  const holder = config.holder;

  return (
    <section aria-labelledby="pay-title" className="rounded-2xl border border-line bg-surface p-4 text-left">
      <h3 id="pay-title" className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        <Wallet className="size-5 text-accent-strong" aria-hidden="true" /> {title}
      </h3>

      {options.length > 1 && (
        <div role="tablist" aria-label="Moyen de paiement" className="mb-3 grid grid-cols-2 gap-2">
          {options.map((o, i) => (
            <button
              key={o.method}
              type="button"
              role="tab"
              aria-selected={i === selected}
              onClick={() => setSelected(i)}
              className={`h-11 rounded-full border-2 text-sm font-semibold ${i === selected ? "border-ink bg-ink text-bg" : "border-line hover:border-ink/40"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
          <div>
            <dt className="text-muted">Montant exact</dt>
            <dd className="text-lg font-bold tabular-nums">{formatPrice(amount)}</dd>
          </div>
          <CopyButton value={String(amount)} label="le montant" />
        </div>
        {option.number && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
            <div>
              <dt className="text-muted">
                Numéro {option.label}
                {holder ? ` · ${holder}` : ""}
              </dt>
              <dd className="text-lg font-bold tracking-wide tabular-nums">{option.number}</dd>
            </div>
            <CopyButton value={option.number.replace(/\s/g, "")} label="le numéro" />
          </div>
        )}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
          <div>
            <dt className="text-muted">Motif (référence)</dt>
            <dd className="font-mono text-lg font-bold tracking-wide">{orderRef}</dd>
          </div>
          <CopyButton value={orderRef} label="la référence" />
        </div>
      </dl>

      <div className="mt-4 flex flex-col gap-2">
        {option.link && (
          <a href={option.link} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "lg", "w-full")}>
            <ExternalLink className="size-5" aria-hidden="true" /> Payer {formatPrice(amount)} avec {option.label}
          </a>
        )}
        <a
          href={buildWhatsAppUrl(paidMessage(orderRef, amount, option.method))}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses(option.link ? "secondary" : "whatsapp", "md", "w-full")}
        >
          <WhatsAppIcon className="size-4" /> J&apos;ai payé : j&apos;envoie la capture
        </a>
      </div>
      <p className="mt-2 text-xs text-muted">On vérifie la réception puis on prépare ta commande. Tu peux aussi payer à la livraison si tu préfères.</p>
    </section>
  );
}
