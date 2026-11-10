"use client";

import { site } from "@/data/site";
import { api } from "@/lib/admin/api";
import type { Customer } from "@/lib/admin/types";
import { normalizePhone } from "@/lib/phone";
import { PAYMENT_LABELS, PAYMENT_METHODS, type PaymentMethod } from "@/lib/orders";
import { Field, inputClasses } from "./ui";

export interface CustomerForm {
  phone: string;
  name: string;
  district: string;
  zone: string;
  deliveryFee: string;
  paymentMethod: PaymentMethod | "";
}

export const emptyCustomerForm: CustomerForm = { phone: "", name: "", district: "", zone: "", deliveryFee: "", paymentMethod: "" };

/** Zones de livraison (data/site.ts) + retrait sur place */
export const DELIVERY_ZONES = [...site.delivery.map((d) => d.zone), "Retrait au QG"];

const defaultFee = (zone: string) => site.delivery.find((d) => d.zone === zone)?.price ?? null;

/** Bloc « Client & livraison » partagé par la saisie manuelle et la fiche commande */
export function CustomerFields({ value, onChange, idPrefix = "c" }: { value: CustomerForm; onChange: (value: CustomerForm) => void; idPrefix?: string }) {
  const set = (patch: Partial<CustomerForm>) => onChange({ ...value, ...patch });

  // Client déjà connu : on pré-remplit son nom et son quartier
  const lookup = async () => {
    if (!normalizePhone(value.phone)) return;
    const { customer } = await api<{ customer: Customer | null }>(`/customers/lookup?tel=${encodeURIComponent(value.phone)}`).catch(() => ({ customer: null }));
    if (!customer) return;
    onChange({
      ...value,
      name: value.name || customer.name || "",
      district: value.district || customer.district || "",
      zone: value.zone || customer.zone || "",
    });
  };

  const phoneInvalid = value.phone.trim() !== "" && !normalizePhone(value.phone);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Téléphone / WhatsApp" htmlFor={`${idPrefix}-phone`} hint={phoneInvalid ? "Numéro invalide (ex. 77 123 45 67)" : "Un client déjà venu est reconnu automatiquement."}>
        <input
          id={`${idPrefix}-phone`}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={value.phone}
          onChange={(e) => set({ phone: e.target.value })}
          onBlur={lookup}
          aria-invalid={phoneInvalid}
          placeholder="77 123 45 67"
          className={inputClasses}
        />
      </Field>
      <Field label="Nom" htmlFor={`${idPrefix}-name`}>
        <input id={`${idPrefix}-name`} value={value.name} onChange={(e) => set({ name: e.target.value })} className={inputClasses} />
      </Field>
      <Field label="Quartier / ville" htmlFor={`${idPrefix}-district`}>
        <input id={`${idPrefix}-district`} value={value.district} onChange={(e) => set({ district: e.target.value })} placeholder="Mermoz, Pikine, Thiès…" className={inputClasses} />
      </Field>
      <Field label="Zone de livraison" htmlFor={`${idPrefix}-zone`}>
        <select
          id={`${idPrefix}-zone`}
          value={value.zone}
          onChange={(e) => {
            const fee = defaultFee(e.target.value);
            set({ zone: e.target.value, ...(fee !== null && !value.deliveryFee ? { deliveryFee: String(fee) } : {}), ...(e.target.value === "Retrait au QG" ? { deliveryFee: "0" } : {}) });
          }}
          className={inputClasses}
        >
          <option value="">Choisir…</option>
          {DELIVERY_ZONES.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Frais de livraison (FCFA)" htmlFor={`${idPrefix}-fee`}>
        <input
          id={`${idPrefix}-fee`}
          type="number"
          inputMode="numeric"
          min={0}
          value={value.deliveryFee}
          onChange={(e) => set({ deliveryFee: e.target.value })}
          placeholder="0"
          className={inputClasses}
        />
      </Field>
      <Field label="Paiement" htmlFor={`${idPrefix}-pay`}>
        <select id={`${idPrefix}-pay`} value={value.paymentMethod} onChange={(e) => set({ paymentMethod: e.target.value as PaymentMethod | "" })} className={inputClasses}>
          <option value="">Pas encore choisi</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_LABELS[m]}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

/** Données envoyées à l'API */
export function customerPayload(value: CustomerForm) {
  return {
    customer: { phone: value.phone.trim() || null, name: value.name.trim() || null, district: value.district.trim() || null },
    deliveryZone: value.zone || null,
    deliveryFee: value.deliveryFee === "" ? 0 : Number(value.deliveryFee),
    paymentMethod: value.paymentMethod || null,
  };
}
