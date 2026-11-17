"use client";

import { AlertTriangle, Banknote, CheckCircle2, MapPin, Phone, RefreshCw, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { buttonClasses } from "@/components/ui/styles";
import { api, useApi } from "@/lib/admin/api";
import { formatPrice, formatSize } from "@/lib/format";
import type { OrderStatus, PaymentMethod } from "@/lib/orders";
import { formatPhone, normalizePhone } from "@/lib/phone";
import type { Size } from "@/lib/types";
import { useAdminUser } from "../AdminShell";
import { EmptyState, ErrorBox, Loading, PageHeader, inputClasses, panelClasses, useToast } from "../ui";

interface Delivery {
  id: number;
  ref: string;
  status: OrderStatus;
  customerName: string | null;
  customerPhone: string | null;
  district: string | null;
  zone: string | null;
  total: number;
  paymentMethod: PaymentMethod | null;
  paymentLabel: string | null;
  paid: boolean;
  notes: string | null;
  deliveredAt: string | null;
  items: { name: string; color: string; size: Size; qty: number }[];
}

interface Data {
  deliveries: Delivery[];
  cashToday: { amount: number; n: number };
}

function mapsUrl(d: Delivery): string | null {
  if (!d.district) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${d.district}, ${d.zone === "Régions" ? "" : "Dakar, "}Sénégal`)}`;
}

function DeliveryCard({ d, onDone }: { d: Delivery; onDone: (message: string) => void }) {
  const toast = useToast();
  const [step, setStep] = useState<"idle" | "livrer" | "souci">("idle");
  const [cash, setCash] = useState(!d.paid && (d.paymentMethod === "especes" || d.paymentMethod === null));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const phone = normalizePhone(d.customerPhone);
  const map = mapsUrl(d);
  const done = d.status === "livree";

  const act = async (action: "depart" | "livree" | "souci") => {
    setBusy(true);
    try {
      await api(`/deliveries/${d.id}`, { body: { action, cash: action === "livree" ? cash : undefined, note: action === "souci" ? note : undefined } });
      setStep("idle");
      setNote("");
      onDone(action === "depart" ? `${d.ref} : bonne route 🛵` : action === "livree" ? `${d.ref} livrée${cash && !d.paid ? `, ${formatPrice(d.total)} encaissés` : ""} ✅` : "Souci signalé à la boutique.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`${panelClasses} ${done ? "opacity-70" : ""}`}>
      {toast.node}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-bold">{d.customerName ?? "Client"}</p>
          <p className="font-mono text-xs text-muted">{d.ref}</p>
        </div>
        <div className="text-right">
          {d.paid ? (
            <p className="rounded-full bg-[#DDEFD9] px-2.5 py-0.5 text-sm font-semibold text-[#1F4D17] dark:bg-[#1F3A1A] dark:text-[#CDEBC6]">Déjà payée ✓</p>
          ) : (
            <>
              <p className="text-xs text-muted">{done ? "Paiement à vérifier" : "À encaisser"}</p>
              <p className="font-display text-2xl font-bold tabular-nums">{formatPrice(d.total)}</p>
              {d.paymentLabel && <p className="text-xs text-muted">Prévu : {d.paymentLabel}</p>}
            </>
          )}
        </div>
      </div>

      {d.district && (
        <p className="mt-3 flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden="true" />
          <span>
            {d.district}
            {d.zone ? <span className="text-muted"> · {d.zone}</span> : null}
          </span>
        </p>
      )}
      {d.notes && <p className="mt-2 rounded-xl bg-surface-2 p-2 text-sm whitespace-pre-line">{d.notes}</p>}

      <ul className="mt-3 space-y-0.5 text-sm">
        {d.items.map((i) => (
          <li key={`${i.name}-${i.color}-${i.size}`}>
            • {i.name} — {i.color} — {formatSize(i.size)} — x{i.qty}
          </li>
        ))}
      </ul>

      {!done && (
        <div className="mt-4 flex flex-wrap gap-2">
          {phone && (
            <>
              <a href={`tel:+${phone}`} className={buttonClasses("secondary", "md")}>
                <Phone className="size-4" aria-hidden="true" /> {formatPhone(phone)}
              </a>
              <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "md")} aria-label={`WhatsApp ${d.customerName ?? "client"}`}>
                <WhatsAppIcon className="size-4" />
              </a>
            </>
          )}
          {map && (
            <a href={map} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "md")}>
              <MapPin className="size-4" aria-hidden="true" /> Carte
            </a>
          )}
        </div>
      )}

      {!done && step === "idle" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {d.status === "confirmee" ? (
            <button type="button" disabled={busy} onClick={() => act("depart")} className={buttonClasses("primary", "lg", "flex-1")}>
              <Truck className="size-5" aria-hidden="true" /> Je pars livrer
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => setStep("livrer")} className={buttonClasses("primary", "lg", "flex-1")}>
              <CheckCircle2 className="size-5" aria-hidden="true" /> Livrée
            </button>
          )}
          <button type="button" onClick={() => setStep("souci")} className={buttonClasses("ghost", "lg")}>
            <AlertTriangle className="size-5" aria-hidden="true" /> Souci
          </button>
        </div>
      )}

      {step === "livrer" && (
        <div className="mt-3 space-y-3 rounded-xl border border-line p-3">
          {!d.paid && (
            <label className="flex items-start gap-3 font-semibold">
              <input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} className="mt-0.5 size-6 accent-[var(--accent-strong)]" />
              <span>
                J&apos;ai encaissé {formatPrice(d.total)} en espèces
                <span className="block text-sm font-normal text-muted">Laisse décoché si le client a payé par Wave / Orange Money : la boutique vérifiera.</span>
              </span>
            </label>
          )}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => act("livree")} className={buttonClasses("primary", "lg", "flex-1")}>
              {busy ? "…" : "Confirmer la livraison"}
            </button>
            <button type="button" onClick={() => setStep("idle")} className={buttonClasses("ghost", "lg")}>
              Retour
            </button>
          </div>
        </div>
      )}

      {step === "souci" && (
        <form
          className="mt-3 space-y-2 rounded-xl border border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act("souci");
          }}
        >
          <label htmlFor={`souci-${d.id}`} className="block font-semibold">
            Que se passe-t-il ?
          </label>
          <textarea
            id={`souci-${d.id}`}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Ex. client injoignable, adresse introuvable, à repasser demain"
            className={`${inputClasses} h-auto py-2`}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !note.trim()} className={buttonClasses("primary", "md", "flex-1")}>
              Prévenir la boutique
            </button>
            <button type="button" onClick={() => setStep("idle")} className={buttonClasses("ghost", "md")}>
              Retour
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

export function DeliveriesPage() {
  const user = useAdminUser();
  const { data, error, loading, reload } = useApi<Data>("/deliveries");
  const toast = useToast();

  // Rafraîchi toutes les minutes (nouvelles commandes confirmées par la boutique)
  useEffect(() => {
    const timer = setInterval(() => document.visibilityState === "visible" && reload(), 60_000);
    return () => clearInterval(timer);
  }, [reload]);

  const groups: { title: string; status: OrderStatus; empty: string }[] = [
    { title: "En route", status: "en_livraison", empty: "" },
    { title: "À livrer", status: "confirmee", empty: "Rien à livrer pour l'instant." },
    { title: "Livrées aujourd'hui", status: "livree", empty: "" },
  ];

  return (
    <>
      {toast.node}
      <PageHeader
        title={`Livraisons${user?.role === "livreur" ? ` · ${user.name}` : ""}`}
        subtitle="Les commandes confirmées par la boutique, avec l'adresse et la somme à encaisser."
        actions={
          <button type="button" onClick={reload} className={buttonClasses("secondary", "md")}>
            <RefreshCw className="size-4" aria-hidden="true" /> Actualiser
          </button>
        }
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <div className="space-y-6">
          {data.cashToday.n > 0 && (
            <p className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3 font-semibold">
              <Banknote className="size-5 text-accent-strong" aria-hidden="true" />
              Encaissé aujourd&apos;hui : {formatPrice(data.cashToday.amount)} ({data.cashToday.n} livraison{data.cashToday.n > 1 ? "s" : ""})
            </p>
          )}
          {data.deliveries.length === 0 && <EmptyState title="Aucune livraison prévue">Les commandes apparaissent ici dès que la boutique les confirme.</EmptyState>}
          {groups.map((g) => {
            const list = data.deliveries.filter((d) => d.status === g.status);
            if (!list.length && !(g.empty && data.deliveries.length)) return null;
            return (
              <section key={g.status} aria-labelledby={`g-${g.status}`}>
                <h2 id={`g-${g.status}`} className="mb-3 font-display text-lg font-bold">
                  {g.title} <span className="text-muted">({list.length})</span>
                </h2>
                {list.length ? (
                  <ul className="grid gap-3 lg:grid-cols-2">
                    {list.map((d) => (
                      <DeliveryCard
                        key={d.id}
                        d={d}
                        onDone={(message) => {
                          toast.ok(message);
                          reload();
                        }}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">{g.empty}</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
