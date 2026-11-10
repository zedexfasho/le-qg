"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleDollarSign, History, MessageSquarePlus, Truck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { ProductImage } from "@/components/product/ProductImage";
import { buttonClasses } from "@/components/ui/styles";
import { site } from "@/data/site";
import { ApiError, api, useApi } from "@/lib/admin/api";
import { formatDateTime, timeAgo } from "@/lib/admin/format";
import type { AdminProduct, OrderDetail, Shortage } from "@/lib/admin/types";
import { formatPrice, formatSize } from "@/lib/format";
import { EDITABLE, ISSUE_LABELS, PAYMENT_LABELS, SOURCE_LABELS, STATUS_HINTS, STATUS_LABELS, type LineIssue, type OrderStatus } from "@/lib/orders";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { CustomerFields, customerPayload, type CustomerForm } from "../CustomerFields";
import { OrderItemsEditor, type EditableItem } from "../OrderItemsEditor";
import { ErrorBox, Loading, StatusBadge, inputClasses, panelClasses, useToast } from "../ui";

type Detail = OrderDetail;

const NEXT_ACTIONS: Record<OrderStatus, { to: OrderStatus; label: string; primary?: boolean; confirm?: string }[]> = {
  nouvelle: [
    { to: "confirmee", label: "Confirmer la commande", primary: true },
    { to: "sans_suite", label: "Sans suite" },
    { to: "annulee", label: "Annuler", confirm: "Annuler cette commande ?" },
  ],
  sans_suite: [
    { to: "confirmee", label: "Confirmer finalement", primary: true },
    { to: "annulee", label: "Annuler", confirm: "Annuler cette commande ?" },
  ],
  confirmee: [
    { to: "en_livraison", label: "Remise au livreur", primary: true },
    { to: "livree", label: "Livrée" },
    { to: "annulee", label: "Annuler", confirm: "Annuler cette commande ? Les articles seront remis en stock." },
  ],
  en_livraison: [
    { to: "livree", label: "Livrée", primary: true },
    { to: "confirmee", label: "Retour en préparation" },
    { to: "annulee", label: "Annuler (retour)", confirm: "Annuler cette commande ? Les articles seront remis en stock." },
  ],
  livree: [],
  annulee: [{ to: "confirmee", label: "Réactiver la commande", confirm: "Réactiver cette commande ? Le stock sera de nouveau réservé." }],
};

const STATUS_ICON: Partial<Record<OrderStatus, typeof Truck>> = { confirmee: CheckCircle2, en_livraison: Truck, livree: CheckCircle2, annulee: XCircle };

/** Message WhatsApp prêt à envoyer au client selon l'étape */
function customerMessage(d: Detail): string {
  const o = d.order;
  const hello = `Salam${o.customerName ? ` ${o.customerName}` : ""} 👋`;
  const lines = o.items.map((i) => `• ${i.name} — ${i.color} — ${formatSize(i.size)} — x${i.qty}`).join("\n");
  const total = `Total : ${formatPrice(o.total)}${o.deliveryFee ? ` (dont livraison ${formatPrice(o.deliveryFee)})` : ""}`;
  switch (o.status) {
    case "confirmee":
      return `${hello}\nTa commande ${o.ref} est confirmée ✅\n${lines}\n${total}\nOn te livre ${o.district ? `à ${o.district} ` : ""}très vite. Merci de passer au QG !`;
    case "en_livraison":
      return `${hello}\nTa commande ${o.ref} est en route 🛵 Le livreur t'appelle bientôt.\n${total}${o.paid ? "" : `\nPaiement : ${o.paymentMethod ? PAYMENT_LABELS[o.paymentMethod] : site.paymentLine}`}`;
    case "livree":
      return `${hello}\nMerci pour ta commande ${o.ref} 🙏 Tout est bon ? Envoie-nous une photo avec ta pièce, on adore !`;
    default:
      return `${hello}\nOn a bien reçu ta commande ${o.ref} :\n${lines}\n${total}\nTu confirmes ? Envoie-nous ton nom et ton quartier pour la livraison.`;
  }
}

function toForm(d: Detail): CustomerForm {
  const o = d.order;
  return {
    phone: o.customerPhone ? formatPhone(o.customerPhone) : "",
    name: o.customerName ?? "",
    district: o.district ?? "",
    zone: o.deliveryZone ?? "",
    deliveryFee: o.deliveryFee ? String(o.deliveryFee) : "",
    paymentMethod: o.paymentMethod ?? "",
  };
}

export function OrderDetailPage() {
  const params = useSearchParams();
  const id = Number(params.get("id"));
  const { data, error, loading, reload, setData } = useApi<Detail>(id > 0 ? `/orders/${id}` : null);
  const products = useApi<{ products: AdminProduct[] }>(data && EDITABLE.has(data.order.status) ? "/products" : null);
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [shortages, setShortages] = useState<Shortage[] | null>(null);
  const [customer, setCustomer] = useState<CustomerForm | null>(null);
  const [items, setItems] = useState<EditableItem[] | null>(null);
  const [notes, setNotes] = useState("");
  const [note, setNote] = useState("");

  // Remet les formulaires à jour à chaque rechargement de la commande
  const [synced, setSynced] = useState<Detail | null>(null);
  if (data && data !== synced) {
    setSynced(data);
    setCustomer(toForm(data));
    setItems(data.order.items.map(({ slug, name, color, size, qty, unitPrice }) => ({ slug, name, color, size, qty, unitPrice })));
    setNotes(data.order.notes ?? "");
  }

  useEffect(() => {
    if (params.get("cree")) toast.ok("Commande enregistrée.");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois à l'arrivée
  }, []);

  if (!(id > 0)) return <ErrorBox message="Commande introuvable." />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  if (!data || !customer || !items) return null;
  const o = data.order;

  const run = async (key: string, fn: () => Promise<Detail>, success: string) => {
    setBusy(key);
    try {
      const next = await fn();
      setData(next);
      toast.ok(success);
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const changeStatus = async (to: OrderStatus, force = false) => {
    setBusy(`status-${to}`);
    try {
      const next = await api<Detail>(`/orders/${id}/status`, { body: { to, force } });
      setData(next);
      setShortages(null);
      toast.ok(`Commande « ${STATUS_LABELS[to]} ».`);
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.data.shortages)) setShortages(err.data.shortages as Shortage[]);
      else toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const saveCustomer = () => run("customer", () => api<Detail>(`/orders/${id}`, { method: "PATCH", body: customerPayload(customer) }), "Infos client enregistrées.");
  const saveItems = () =>
    run("items", () => api<Detail>(`/orders/${id}`, { method: "PATCH", body: { items: items.map(({ slug, color, size, qty }) => ({ slug, color, size, qty })) } }), "Articles mis à jour.");
  const togglePaid = () => run("paid", () => api<Detail>(`/orders/${id}`, { method: "PATCH", body: { paid: !o.paid } }), o.paid ? "Paiement retiré." : "Commande marquée payée.");
  const saveNotes = () => run("notes", () => api<Detail>(`/orders/${id}`, { method: "PATCH", body: { notes } }), "Note enregistrée.");
  const addNote = async () => {
    if (!note.trim()) return;
    if (await run("note", () => api<Detail>(`/orders/${id}/notes`, { body: { note } }), "Ajouté à l'historique.")) setNote("");
  };

  const phone = normalizePhone(o.customerPhone);
  const waLink = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(customerMessage(data))}` : null;
  const stockIssue = (slug: string, color: string, size: string) => data.stock.find((s) => s.slug === slug && s.color === color && s.size === size);
  const holdsStock = o.status === "confirmee" || o.status === "en_livraison" || o.status === "livree";
  const customerDirty = JSON.stringify(customer) !== JSON.stringify(toForm(data));
  const itemsDirty = JSON.stringify(items.map((i) => [i.slug, i.color, i.size, i.qty])) !== JSON.stringify(o.items.map((i) => [i.slug, i.color, i.size, i.qty]));
  const needsPhone = (o.status === "nouvelle" || o.status === "sans_suite") && !o.customerPhone && o.source !== "boutique";

  return (
    <>
      {toast.node}
      <Link href="/admin/commandes/" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Commandes
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-bold tracking-wide sm:text-3xl">{o.ref}</h1>
            <StatusBadge status={o.status} className="text-sm" />
            {holdsStock && (o.paid ? <span className="rounded-full bg-[#D5F2DF] px-2.5 py-0.5 text-xs font-semibold text-[#165A2F]">Payée</span> : <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold">Non payée</span>)}
          </div>
          <p className="mt-1 text-sm text-muted">
            {SOURCE_LABELS[o.source]} · reçue {timeAgo(o.createdAt)} ({formatDateTime(o.createdAt)}) · {STATUS_HINTS[o.status]}
          </p>
        </div>
        <p className="font-display text-3xl font-bold tabular-nums">{formatPrice(o.total)}</p>
      </div>

      {/* Actions principales */}
      <section className={`${panelClasses} mb-5`} aria-label="Étapes de la commande">
        <div className="flex flex-wrap gap-2">
          {NEXT_ACTIONS[o.status].map((a) => {
            const Icon = STATUS_ICON[a.to];
            const disabled = busy !== null || (a.to === "confirmee" && needsPhone);
            return (
              <button
                key={a.to}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (a.confirm && !window.confirm(a.confirm)) return;
                  void changeStatus(a.to);
                }}
                className={buttonClasses(a.primary ? "primary" : "secondary", "md")}
              >
                {Icon && <Icon className="size-4" aria-hidden="true" />}
                {busy === `status-${a.to}` ? "…" : a.label}
              </button>
            );
          })}
          {holdsStock && (
            <button type="button" onClick={togglePaid} disabled={busy !== null} className={buttonClasses(o.paid ? "ghost" : "secondary", "md")}>
              <CircleDollarSign className="size-4" aria-hidden="true" />
              {o.paid ? "Annuler le paiement" : "Marquer payée"}
            </button>
          )}
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "md", "sm:ml-auto")}>
              <WhatsAppIcon className="size-4" /> Écrire au client
            </a>
          )}
        </div>
        {needsPhone && <p className="mt-3 text-sm font-semibold text-accent-strong">Pour confirmer : renseigne le numéro du client (bloc « Client & livraison »), puis enregistre.</p>}
        {shortages && (
          <div className="mt-4 rounded-xl border border-accent/50 bg-[#FFF4E6] p-3 text-sm dark:bg-[#3A1D0E]">
            <p className="font-semibold">Stock insuffisant :</p>
            <ul className="my-2 list-disc pl-5">
              {shortages.map((s) => (
                <li key={`${s.slug}-${s.color}-${s.size}`}>
                  {s.name} {s.color} {formatSize(s.size)} : {s.available} en stock pour {s.requested} demandé(s)
                </li>
              ))}
            </ul>
            <p className="mb-2 text-muted">Modifie les articles (autre taille, quantité) ou confirme quand même si tu as la pièce sous la main.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => changeStatus("confirmee", true)} className={buttonClasses("secondary", "md")}>
                Confirmer quand même
              </button>
              <button type="button" onClick={() => setShortages(null)} className={buttonClasses("ghost", "md")}>
                Fermer
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className={panelClasses} aria-labelledby="order-items">
            <h2 id="order-items" className="mb-3 font-display text-lg font-bold">
              Articles
            </h2>
            {EDITABLE.has(o.status) && products.data ? (
              <>
                <OrderItemsEditor products={products.data.products} items={items} onChange={setItems} />
                {itemsDirty && (
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={saveItems} disabled={busy !== null || items.length === 0} className={buttonClasses("primary", "md")}>
                      Enregistrer les articles
                    </button>
                    <button type="button" onClick={() => setItems(o.items.map(({ slug, name, color, size, qty, unitPrice }) => ({ slug, name, color, size, qty, unitPrice })))} className={buttonClasses("ghost", "md")}>
                      Annuler
                    </button>
                  </div>
                )}
              </>
            ) : (
              <ul className="divide-y divide-line">
                {o.items.map((i) => {
                  const s = stockIssue(i.slug, i.color, i.size);
                  return (
                    <li key={i.id} className="flex items-center gap-3 py-2.5">
                      <div className="relative aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                        <ProductImage src={i.image ?? undefined} alt="" fill sizes="48px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug">{i.name}</p>
                        <p className="text-sm text-muted">
                          {i.color} · {formatSize(i.size)} · x{i.qty}
                        </p>
                        {!holdsStock && s?.issue && <p className="text-xs font-semibold text-accent-strong">{ISSUE_LABELS[s.issue as LineIssue]}</p>}
                      </div>
                      <p className="font-bold tabular-nums">{formatPrice(i.qty * i.unitPrice)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between">
                <dt>Articles</dt>
                <dd className="tabular-nums">{formatPrice(o.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Livraison {o.deliveryZone ? `(${o.deliveryZone})` : ""}</dt>
                <dd className="tabular-nums">{formatPrice(o.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between text-base font-bold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(o.total)}</dd>
              </div>
            </dl>
            {!EDITABLE.has(o.status) && <p className="mt-2 text-xs text-muted">Articles verrouillés : la commande est confirmée (stock réservé).</p>}
          </section>

          <section className={panelClasses} aria-labelledby="order-customer">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="order-customer" className="font-display text-lg font-bold">
                Client & livraison
              </h2>
              {data.customer && (
                <Link href={`/admin/client/?id=${data.customer.id}`} className="text-sm font-semibold underline underline-offset-4">
                  Fiche client · {data.customer.orders_count} commande(s)
                </Link>
              )}
            </div>
            <CustomerFields value={customer} onChange={setCustomer} idPrefix="order" />
            {customerDirty && (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={saveCustomer} disabled={busy !== null} className={buttonClasses("primary", "md")}>
                  {busy === "customer" ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button type="button" onClick={() => setCustomer(toForm(data))} className={buttonClasses("ghost", "md")}>
                  Annuler
                </button>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className={panelClasses} aria-labelledby="order-notes">
            <h2 id="order-notes" className="mb-2 font-display text-lg font-bold">
              Note interne
            </h2>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-labelledby="order-notes"
              placeholder="Ex. livrer après 18h, client veut un sac cadeau…"
              className={`${inputClasses} h-auto py-2`}
            />
            {notes !== (o.notes ?? "") && (
              <button type="button" onClick={saveNotes} disabled={busy !== null} className={buttonClasses("secondary", "md", "mt-2")}>
                Enregistrer la note
              </button>
            )}
          </section>

          <section className={panelClasses} aria-labelledby="order-history">
            <h2 id="order-history" className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
              <History className="size-5" aria-hidden="true" /> Historique
            </h2>
            <div className="mb-3 flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addNote();
                  }
                }}
                placeholder="Ajouter un suivi (appel, relance…)"
                aria-label="Ajouter un suivi"
                className={inputClasses}
              />
              <button type="button" onClick={addNote} disabled={!note.trim() || busy !== null} className={buttonClasses("secondary", "md", "px-3")} aria-label="Ajouter">
                <MessageSquarePlus className="size-4" />
              </button>
            </div>
            <ol className="space-y-3 border-l-2 border-line pl-4">
              {data.events.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-accent" aria-hidden="true" />
                  <p className="font-semibold">
                    {e.type === "statut" && e.to_status ? `→ ${STATUS_LABELS[e.to_status]}` : e.type === "creation" ? "Commande créée" : e.type === "paiement" ? "Paiement reçu" : e.type === "paiement_annule" ? "Paiement retiré" : e.type === "note" ? "Suivi" : e.type === "formulaire" ? "Formulaire du site" : "Modification"}
                  </p>
                  {e.note && <p className="text-muted">{e.note}</p>}
                  <p className="text-xs text-muted">
                    {formatDateTime(e.created_at)}
                    {e.user_name ? ` · ${e.user_name}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
