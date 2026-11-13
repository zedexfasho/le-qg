"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { useId, useRef, useState } from "react";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { Modal } from "@/components/ui/Modal";
import { buttonClasses } from "@/components/ui/styles";
import { site } from "@/data/site";
import {
  CHECKOUT_PAYMENT_LABELS,
  CHECKOUT_PAYMENTS,
  deliveryFeeFor,
  validateCheckout,
  type CheckoutErrors,
  type CheckoutFields,
} from "@/lib/checkout";
import { formatPrice, formatSize } from "@/lib/format";
import { submitDirectOrder, type DirectOrderFailure } from "@/lib/order-capture";
import type { OrderItemInput } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { readStorage, writeStorage } from "@/lib/storage";
import type { OrderLine } from "@/lib/types";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const STORAGE_KEY = "qg-coordonnees";
const EMPTY: CheckoutFields = { name: "", phone: "", district: "", zone: "", payment: "", note: "" };

export interface ConfirmedOrder {
  ref: string;
  name: string;
  phone: string;
  zone: string;
  payment: (typeof CHECKOUT_PAYMENTS)[number];
  subtotal: number;
  /** null = frais à confirmer avec le client */
  deliveryFee: number | null;
  lines: readonly OrderLine[];
}

/** Coordonnées mémorisées sur cet appareil (si le client l'a demandé) */
function savedFields(): { fields: CheckoutFields; remembered: boolean } {
  try {
    const raw = readStorage(STORAGE_KEY);
    if (!raw) return { fields: EMPTY, remembered: false };
    const saved = JSON.parse(raw) as Partial<CheckoutFields>;
    return {
      fields: { ...EMPTY, name: saved.name ?? "", phone: saved.phone ?? "", district: saved.district ?? "", zone: saved.zone ?? "" },
      remembered: true,
    };
  } catch {
    return { fields: EMPTY, remembered: false };
  }
}

const inputClasses =
  "w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none aria-[invalid=true]:border-accent-strong";
const choiceClasses =
  "flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-3 has-[:checked]:border-accent-strong has-[:checked]:bg-surface-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm font-semibold text-accent-strong">
      {message}
    </p>
  );
}

/**
 * Formulaire de commande directe : le client laisse ses coordonnées,
 * la commande arrive complète dans le dashboard (pas besoin de WhatsApp).
 */
export function CheckoutForm({
  items,
  lines,
  getRef,
  onConfirmed,
}: {
  items: readonly OrderItemInput[];
  lines: readonly OrderLine[];
  getRef: () => string;
  onConfirmed: (order: ConfirmedOrder) => void;
}) {
  const id = useId();
  const [initial] = useState(savedFields);
  const [fields, setFields] = useState<CheckoutFields>(initial.fields);
  const [remember, setRemember] = useState(initial.remembered);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [failure, setFailure] = useState<DirectOrderFailure | null>(null);
  const [sending, setSending] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const fee = fields.zone ? deliveryFeeFor(fields.zone) : null;
  const set = (patch: Partial<CheckoutFields>) => {
    setFields((f) => ({ ...f, ...patch }));
    // L'erreur d'un champ disparaît dès qu'on le corrige
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch) as (keyof CheckoutFields)[]) delete next[key];
      return next;
    });
  };

  const focusFirstError = (errs: CheckoutErrors) => {
    const first = (["name", "phone", "zone", "district", "payment", "note"] as const).find((k) => errs[k]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setFailure(null);
    const { data, errors: errs } = validateCheckout(fields);
    if (!data) {
      setErrors(errs);
      focusFirstError(errs);
      return;
    }
    setSending(true);
    const ref = getRef();
    const result = await submitDirectOrder(ref, items, fields, honeypot.current?.value ?? "");
    setSending(false);
    if (!result.ok) {
      if (result.fields) {
        setErrors(result.fields);
        focusFirstError(result.fields);
      }
      setFailure(result);
      return;
    }
    writeStorage(STORAGE_KEY, remember ? JSON.stringify({ name: data.name, phone: fields.phone, district: data.district, zone: data.zone }) : "");
    onConfirmed({
      ref,
      name: data.name,
      phone: data.phone,
      zone: data.zone,
      payment: data.payment,
      subtotal,
      deliveryFee: deliveryFeeFor(data.zone),
      lines,
    });
  };

  const describedBy = (key: keyof CheckoutFields) => (errors[key] ? `${id}-${key}-error` : undefined);

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
      {/* Récap */}
      <div className="rounded-2xl bg-surface-2 p-4 text-sm">
        <ul className="space-y-1">
          {lines.map((l) => (
            <li key={`${l.name}-${l.color}-${l.size}`} className="flex justify-between gap-3">
              <span>
                {l.name} · {l.color} · {formatSize(l.size)} · x{l.qty}
              </span>
              <span className="shrink-0 font-semibold">{formatPrice(l.unitPrice * l.qty)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label htmlFor={`${id}-name`} className="mb-1.5 block font-semibold">
          Ton nom
        </label>
        <input
          id={`${id}-name`}
          data-field="name"
          value={fields.name}
          onChange={(e) => set({ name: e.target.value })}
          autoComplete="name"
          maxLength={80}
          aria-invalid={!!errors.name}
          aria-describedby={describedBy("name")}
          className={`${inputClasses} h-12`}
        />
        <FieldError id={`${id}-name-error`} message={errors.name} />
      </div>

      <div>
        <label htmlFor={`${id}-phone`} className="mb-1.5 block font-semibold">
          Ton numéro (WhatsApp ou appel)
        </label>
        <input
          id={`${id}-phone`}
          data-field="phone"
          type="tel"
          inputMode="tel"
          value={fields.phone}
          onChange={(e) => set({ phone: e.target.value })}
          autoComplete="tel"
          placeholder="77 123 45 67"
          maxLength={20}
          aria-invalid={!!errors.phone}
          aria-describedby={describedBy("phone")}
          className={`${inputClasses} h-12`}
        />
        <FieldError id={`${id}-phone-error`} message={errors.phone} />
      </div>

      <fieldset>
        <legend className="mb-1.5 font-semibold">Livraison</legend>
        <div className="space-y-2">
          {site.delivery.map((d, i) => (
            <label key={d.zone} className={choiceClasses}>
              <input
                type="radio"
                name={`${id}-zone`}
                value={d.zone}
                checked={fields.zone === d.zone}
                onChange={() => set({ zone: d.zone })}
                data-field={i === 0 ? "zone" : undefined}
                aria-describedby={describedBy("zone")}
                className="mt-1 size-4 accent-[var(--accent-strong)]"
              />
              <span className="min-w-0 flex-1 text-sm">
                <span className="flex justify-between gap-2 font-semibold">
                  <span>{d.zone}</span>
                  <span className="shrink-0">{d.price === null ? "Tarif à confirmer" : formatPrice(d.price)}</span>
                </span>
                <span className="block text-muted">
                  {d.detail} · {d.delay}
                </span>
              </span>
            </label>
          ))}
        </div>
        <FieldError id={`${id}-zone-error`} message={errors.zone} />
      </fieldset>

      <div>
        <label htmlFor={`${id}-district`} className="mb-1.5 block font-semibold">
          Adresse de livraison
        </label>
        <input
          id={`${id}-district`}
          data-field="district"
          value={fields.district}
          onChange={(e) => set({ district: e.target.value })}
          autoComplete="street-address"
          placeholder="Quartier, rue, repère (ex. Ouakam, près de la mosquée)"
          maxLength={120}
          aria-invalid={!!errors.district}
          aria-describedby={describedBy("district")}
          className={`${inputClasses} h-12`}
        />
        <FieldError id={`${id}-district-error`} message={errors.district} />
      </div>

      <fieldset>
        <legend className="mb-1.5 font-semibold">Paiement</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {CHECKOUT_PAYMENTS.map((p, i) => (
            <label key={p} className={`${choiceClasses} items-center`}>
              <input
                type="radio"
                name={`${id}-payment`}
                value={p}
                checked={fields.payment === p}
                onChange={() => set({ payment: p })}
                data-field={i === 0 ? "payment" : undefined}
                aria-describedby={describedBy("payment")}
                className="size-4 accent-[var(--accent-strong)]"
              />
              <span className="text-sm font-semibold">{CHECKOUT_PAYMENT_LABELS[p]}</span>
            </label>
          ))}
        </div>
        <FieldError id={`${id}-payment-error`} message={errors.payment} />
      </fieldset>

      <div>
        <label htmlFor={`${id}-note`} className="mb-1.5 block font-semibold">
          Un message ? <span className="font-normal text-muted">(facultatif)</span>
        </label>
        <textarea
          id={`${id}-note`}
          data-field="note"
          rows={2}
          value={fields.note}
          onChange={(e) => set({ note: e.target.value })}
          maxLength={500}
          placeholder="Ex. livrer après 18h"
          aria-invalid={!!errors.note}
          aria-describedby={describedBy("note")}
          className={`${inputClasses} py-3`}
        />
        <FieldError id={`${id}-note-error`} message={errors.note} />
      </div>

      {/* Champ piège pour les robots : invisible et ignoré par les vrais clients */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site web
          <input ref={honeypot} name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--accent-strong)]" />
        Mémoriser mes coordonnées sur ce téléphone
      </label>

      <dl className="space-y-1 border-t border-line pt-4 text-sm">
        <div className="flex justify-between">
          <dt>Articles</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Livraison</dt>
          <dd className="text-right">{fields.zone ? (fee === null ? "à confirmer avec toi" : formatPrice(fee)) : "selon ta zone"}</dd>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <dt>Total</dt>
          <dd>{formatPrice(subtotal + (fee ?? 0))}</dd>
        </div>
      </dl>

      {failure && (
        <div role="alert" className="rounded-2xl border border-accent-strong/40 bg-surface-2 p-3 text-sm">
          <p className="flex items-start gap-2 font-semibold text-accent-strong">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {failure.error}
          </p>
          {failure.shortages && (
            <ul className="mt-1 list-disc pl-6">
              {failure.shortages.map((s) => (
                <li key={`${s.name}-${s.color}-${s.size}`}>
                  {s.name} · {s.color} · {formatSize(s.size)} : {s.stock > 0 ? `plus que ${s.stock} en stock` : "épuisé"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button type="submit" disabled={sending} className={buttonClasses("primary", "lg", "w-full")}>
        <Send className="size-5" aria-hidden="true" />
        {sending ? "Envoi en cours…" : "Envoyer ma commande"}
      </button>
      <p className="text-center text-xs text-muted">Rien à payer maintenant : on te contacte pour confirmer, puis tu paies à la livraison ou par mobile money.</p>
    </form>
  );
}

/** Écran affiché une fois la commande reçue */
export function OrderConfirmation({ order }: { order: ConfirmedOrder }) {
  const firstName = order.name.split(" ")[0];
  const question = buildWhatsAppUrl(`Salam Le QG 👋 J'ai passé la commande ${order.ref} sur le site. `);
  return (
    <div role="status" className="text-center">
      <CheckCircle2 className="mx-auto mb-3 size-14 text-accent-strong" strokeWidth={1.75} aria-hidden="true" />
      <p className="font-display text-2xl font-bold">Merci {firstName}, c&apos;est reçu !</p>
      <p className="mt-2 text-muted">
        Ta commande <span className="font-bold whitespace-nowrap text-ink">{order.ref}</span> est enregistrée. On te contacte au{" "}
        <span className="font-semibold whitespace-nowrap text-ink">{formatPhone(order.phone)}</span> pour confirmer la livraison.
      </p>

      <dl className="mx-auto mt-5 max-w-sm space-y-1 rounded-2xl bg-surface-2 p-4 text-left text-sm">
        {order.lines.map((l) => (
          <div key={`${l.name}-${l.color}-${l.size}`} className="flex justify-between gap-3">
            <dt>
              {l.name} · {l.color} · {formatSize(l.size)} · x{l.qty}
            </dt>
            <dd className="shrink-0">{formatPrice(l.unitPrice * l.qty)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-line pt-2">
          <dt>Livraison ({order.zone})</dt>
          <dd>{order.deliveryFee === null ? "à confirmer" : formatPrice(order.deliveryFee)}</dd>
        </div>
        <div className="flex justify-between gap-3 font-bold">
          <dt>Total</dt>
          <dd>{formatPrice(order.subtotal + (order.deliveryFee ?? 0))}</dd>
        </div>
        <div className="flex justify-between gap-3 text-muted">
          <dt>Paiement</dt>
          <dd>{CHECKOUT_PAYMENT_LABELS[order.payment]}</dd>
        </div>
      </dl>

      <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3">
        <Link href="/shop/" className={buttonClasses("primary", "lg", "w-full")}>
          Continuer mes achats
        </Link>
        <Link href={`/suivi/?ref=${order.ref}`} className={buttonClasses("secondary", "md", "w-full")}>
          Suivre ma commande
        </Link>
        <a href={question} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold underline underline-offset-4">
          <WhatsAppIcon className="size-4" /> Une question ? Écris-nous
        </a>
      </div>
      <p className="mt-3 text-xs text-muted">Garde ta référence {order.ref} : elle te permet de suivre ta commande à tout moment.</p>
    </div>
  );
}

/** Fenêtre « Commander sur le site » : formulaire, puis confirmation */
export function CheckoutDialog({
  open,
  onClose,
  items,
  lines,
  getRef,
  onConfirmed,
}: {
  open: boolean;
  onClose: () => void;
  items: readonly OrderItemInput[];
  lines: readonly OrderLine[];
  getRef: () => string;
  onConfirmed?: (order: ConfirmedOrder) => void;
}) {
  const [confirmed, setConfirmed] = useState<ConfirmedOrder | null>(null);
  return (
    <Modal open={open} onClose={onClose} title={confirmed ? "Commande envoyée" : "Commander sur le site"} layout="sheet">
      {/* Monté seulement à l'ouverture : les coordonnées mémorisées sont lues côté navigateur */}
      {open &&
        (confirmed ? (
          <OrderConfirmation order={confirmed} />
        ) : (
          <CheckoutForm
            items={items}
            lines={lines}
            getRef={getRef}
            onConfirmed={(order) => {
              setConfirmed(order);
              onConfirmed?.(order);
            }}
          />
        ))}
    </Modal>
  );
}
