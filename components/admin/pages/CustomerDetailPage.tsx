"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { buttonClasses } from "@/components/ui/styles";
import { api, useApi } from "@/lib/admin/api";
import { formatDay, timeAgo } from "@/lib/admin/format";
import type { Customer, Order } from "@/lib/admin/types";
import { formatPrice, formatSize } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import type { Size } from "@/lib/types";
import { DELIVERY_ZONES } from "../CustomerFields";
import { OrderList } from "../OrderList";
import { ErrorBox, Field, Loading, Stat, inputClasses, panelClasses, useToast } from "../ui";

interface Detail {
  customer: Customer;
  orders: (Order & { created_at: string; item_count: number })[];
  stats: { orders: number; revenue: number; first_order_at: string | null; last_order_at: string | null };
  favorites: { name: string; size: Size; qty: number }[];
}

export function CustomerDetailPage() {
  const id = Number(useSearchParams().get("id"));
  const { data, error, loading, reload, setData } = useApi<Detail>(id > 0 ? `/customers/${id}` : null);
  const toast = useToast();
  const [form, setForm] = useState({ name: "", district: "", zone: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const [synced, setSynced] = useState<Detail | null>(null);
  if (data && data !== synced) {
    setSynced(data);
    setForm({ name: data.customer.name ?? "", district: data.customer.district ?? "", zone: data.customer.zone ?? "", notes: data.customer.notes ?? "" });
  }

  if (!(id > 0)) return <ErrorBox message="Client introuvable." />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  if (!data) return null;
  const c = data.customer;
  const dirty = form.name !== (c.name ?? "") || form.district !== (c.district ?? "") || form.zone !== (c.zone ?? "") || form.notes !== (c.notes ?? "");

  const save = async () => {
    setBusy(true);
    try {
      setData(await api<Detail>(`/customers/${id}`, { method: "PATCH", body: form }));
      toast.ok("Fiche client enregistrée.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // L'API renvoie les commandes en snake_case ici : on les adapte à la liste
  const orders: Order[] = data.orders.map((o) => {
    const raw = o as unknown as Record<string, unknown>;
    return {
      ...o,
      createdAt: String(raw.created_at),
      customerName: c.name,
      customerPhone: c.phone,
      district: c.district,
      paid: !!raw.paid,
      itemCount: Number(raw.item_count),
    } as Order;
  });

  return (
    <>
      {toast.node}
      <Link href="/admin/clients/" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Clients
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{c.name || "Client sans nom"}</h1>
          <p className="mt-1 text-sm text-muted">
            {formatPhone(c.phone)} · client depuis {formatDay(data.stats.first_order_at ?? c.created_at)}
          </p>
        </div>
        <a href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "md")}>
          <WhatsAppIcon className="size-4" /> Écrire sur WhatsApp
        </a>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total dépensé" value={formatPrice(data.stats.revenue)} tone="accent" />
        <Stat label="Commandes" value={data.stats.orders} />
        <Stat label="Panier moyen" value={formatPrice(data.stats.orders ? Math.round(data.stats.revenue / data.stats.orders) : 0)} />
        <Stat label="Dernière commande" value={<span className="text-xl">{data.stats.last_order_at ? timeAgo(data.stats.last_order_at) : "—"}</span>} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="client-orders">
          <h2 id="client-orders" className="mb-3 font-display text-lg font-bold">
            Commandes
          </h2>
          {orders.length ? <OrderList orders={orders} /> : <p className="text-sm text-muted">Aucune commande.</p>}
        </section>

        <div className="space-y-5">
          <section className={`${panelClasses} space-y-3`} aria-labelledby="client-info">
            <h2 id="client-info" className="font-display text-lg font-bold">
              Fiche
            </h2>
            <Field label="Nom" htmlFor="cl-name">
              <input id="cl-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClasses} />
            </Field>
            <Field label="Quartier / ville" htmlFor="cl-district">
              <input id="cl-district" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className={inputClasses} />
            </Field>
            <Field label="Zone" htmlFor="cl-zone">
              <select id="cl-zone" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} className={inputClasses}>
                <option value="">—</option>
                {DELIVERY_ZONES.map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </Field>
            <Field label="Notes" htmlFor="cl-notes" hint="Tailles habituelles, préférences, adresse précise…">
              <textarea id="cl-notes" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClasses} h-auto py-2`} />
            </Field>
            {dirty && (
              <button type="button" onClick={save} disabled={busy} className={buttonClasses("primary", "md", "w-full")}>
                {busy ? "Enregistrement…" : "Enregistrer"}
              </button>
            )}
          </section>

          {data.favorites.length > 0 && (
            <section className={panelClasses} aria-labelledby="client-fav">
              <h2 id="client-fav" className="mb-2 font-display text-lg font-bold">
                Ce qu&apos;il/elle achète
              </h2>
              <ul className="space-y-1 text-sm">
                {data.favorites.map((f) => (
                  <li key={`${f.name}-${f.size}`} className="flex justify-between gap-2">
                    <span>
                      {f.name} · {formatSize(f.size)}
                    </span>
                    <span className="font-semibold">x{f.qty}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
