"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/styles";
import { ApiError, api, useApi } from "@/lib/admin/api";
import type { AdminProduct, Shortage } from "@/lib/admin/types";
import { formatSize } from "@/lib/format";
import { ORDER_SOURCES, SOURCE_LABELS, type OrderSource } from "@/lib/orders";
import { CustomerFields, customerPayload, emptyCustomerForm, type CustomerForm } from "../CustomerFields";
import { OrderItemsEditor, type EditableItem } from "../OrderItemsEditor";
import { ErrorBox, Field, Loading, PageHeader, inputClasses, panelClasses } from "../ui";

const START_STATUSES = [
  { value: "confirmee", label: "Confirmée (le stock est réservé tout de suite)" },
  { value: "livree", label: "Déjà livrée / vendue en boutique" },
  { value: "nouvelle", label: "Nouvelle (à confirmer plus tard)" },
] as const;

export function NewOrderPage() {
  const router = useRouter();
  const { data, error: loadError, reload } = useApi<{ products: AdminProduct[] }>("/products");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomerForm);
  const [source, setSource] = useState<OrderSource>("instagram");
  const [status, setStatus] = useState<(typeof START_STATUSES)[number]["value"]>("confirmee");
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shortages, setShortages] = useState<Shortage[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (force = false) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ id: number; ref: string }>("/orders", {
        body: {
          source,
          status,
          paid,
          notes: notes.trim() || null,
          items: items.map(({ slug, color, size, qty }) => ({ slug, color, size, qty })),
          force,
          ...customerPayload(customer),
        },
      });
      router.push(`/admin/commande/?id=${result.id}&cree=1`);
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.data.shortages)) setShortages(err.data.shortages as Shortage[]);
      setError((err as Error).message);
      setBusy(false);
    }
  };

  if (loadError) return <ErrorBox message={loadError} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <>
      <PageHeader title="Saisir une commande" subtitle="Pour les commandes reçues en DM, par téléphone ou en boutique : les chiffres et le stock restent justes." />
      <form
        className="grid gap-5 lg:grid-cols-[1fr_320px]"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="space-y-5">
          <section className={panelClasses} aria-labelledby="new-items">
            <h2 id="new-items" className="mb-3 font-display text-lg font-bold">
              Articles
            </h2>
            <OrderItemsEditor products={data.products} items={items} onChange={(next) => (setItems(next), setShortages([]))} />
          </section>
          <section className={panelClasses} aria-labelledby="new-customer">
            <h2 id="new-customer" className="mb-3 font-display text-lg font-bold">
              Client & livraison
            </h2>
            <CustomerFields value={customer} onChange={setCustomer} idPrefix="new" />
          </section>
        </div>

        <aside className={`${panelClasses} h-fit space-y-4 lg:sticky lg:top-6`}>
          <Field label="Origine" htmlFor="new-source">
            <select id="new-source" value={source} onChange={(e) => setSource(e.target.value as OrderSource)} className={inputClasses}>
              {ORDER_SOURCES.filter((s) => s !== "site").map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statut" htmlFor="new-status">
            <select id="new-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputClasses}>
              {START_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="size-5 accent-[var(--accent-strong)]" />
            Déjà payée
          </label>
          <Field label="Note interne" htmlFor="new-notes">
            <textarea id="new-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClasses} h-auto py-2`} />
          </Field>

          {error && <ErrorBox message={error} />}
          {shortages.length > 0 && (
            <div className="space-y-2 text-sm">
              <ul className="list-disc pl-5">
                {shortages.map((s) => (
                  <li key={`${s.slug}-${s.color}-${s.size}`}>
                    {s.name} {s.color} {formatSize(s.size)} : {s.available} en stock pour {s.requested} demandé(s)
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => submit(true)} disabled={busy} className={buttonClasses("secondary", "md", "w-full")}>
                Enregistrer quand même (stock mis à 0)
              </button>
            </div>
          )}
          <button type="submit" disabled={busy || items.length === 0} className={buttonClasses("primary", "lg", "w-full")}>
            {busy ? "Enregistrement…" : "Enregistrer la commande"}
          </button>
        </aside>
      </form>
    </>
  );
}
