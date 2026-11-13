"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Ban, Check, Loader2, PackageCheck, Search, Truck } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { ProductImage } from "@/components/product/ProductImage";
import { buttonClasses, cardClasses } from "@/components/ui/styles";
import { formatPrice, formatSize } from "@/lib/format";
import { parseOrderRef, type OrderStatus } from "@/lib/orders";
import type { Size } from "@/lib/types";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

interface TrackedOrder {
  ref: string;
  status: OrderStatus;
  zone: string | null;
  deliveryFee: number | null;
  subtotal: number;
  total: number;
  paid: boolean;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items: { name: string; color: string; size: Size; qty: number; image: string | null }[];
}

type Lookup = { state: "idle" } | { state: "loading"; ref: string } | { state: "error"; ref: string; message: string } | { state: "found"; order: TrackedOrder };

const when = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("fr-SN", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Dakar" }).format(new Date(iso))
    : null;

/** Étapes affichées au client, dans l'ordre */
function steps(o: TrackedOrder) {
  const rank: Record<OrderStatus, number> = { nouvelle: 0, sans_suite: 0, annulee: 0, confirmee: 1, en_livraison: 2, livree: 3 };
  const reached = rank[o.status];
  return [
    { label: "Commande reçue", hint: "On va te contacter sur WhatsApp pour confirmer.", at: o.createdAt, done: true },
    { label: "Confirmée", hint: "Ta commande est validée et mise de côté.", at: o.confirmedAt, done: reached >= 1 },
    { label: "En livraison", hint: "Le livreur est en route, garde ton téléphone près de toi.", at: o.shippedAt, done: reached >= 2 },
    { label: "Livrée", hint: "Bonne mise ! Montre-nous ton fit sur Insta 🔥", at: o.deliveredAt, done: reached >= 3 },
  ];
}

const INVALID_REF = "Référence invalide : elle ressemble à QG-7K2M9QX (dans ton message de confirmation).";

async function fetchOrder(ref: string): Promise<Lookup> {
  try {
    const res = await fetch(`/api/orders/track?ref=${encodeURIComponent(ref)}`, { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as TrackedOrder & { error?: string };
    if (!res.ok) return { state: "error", ref, message: data.error ?? "Impossible de retrouver ta commande. Réessaie." };
    return { state: "found", order: data };
  } catch {
    return { state: "error", ref, message: "Pas de connexion internet. Vérifie ton réseau et réessaie." };
  }
}

export function OrderTracker() {
  const params = useSearchParams();
  const router = useRouter();
  const id = useId();
  const initial = params.get("ref") ?? "";
  const [input, setInput] = useState(initial);
  const [lookup, setLookup] = useState<Lookup>(() => {
    const ref = parseOrderRef(initial);
    return ref ? { state: "loading", ref } : initial ? { state: "error", ref: initial, message: INVALID_REF } : { state: "idle" };
  });

  // Lien reçu sur WhatsApp (/suivi/?ref=QG-…) : on cherche directement
  useEffect(() => {
    const ref = parseOrderRef(initial);
    if (ref) void fetchOrder(ref).then(setLookup);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois à l'arrivée sur la page
  }, []);

  const search = async (raw: string) => {
    const ref = parseOrderRef(raw);
    if (!ref) {
      setLookup({ state: "error", ref: raw, message: INVALID_REF });
      return;
    }
    setLookup({ state: "loading", ref });
    setLookup(await fetchOrder(ref));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const ref = parseOrderRef(input);
    if (ref) router.replace(`/suivi/?ref=${ref}`, { scroll: false });
    void search(input);
  };

  const order = lookup.state === "found" ? lookup.order : null;
  const cancelled = order && (order.status === "annulee" || order.status === "sans_suite");
  const shownRef = lookup.state === "found" ? lookup.order.ref : lookup.state === "idle" ? "" : lookup.ref;
  const question = buildWhatsAppUrl(`Salam Le QG 👋 Une question sur ma commande ${shownRef} :`);

  return (
    <div className="mx-auto max-w-xl">
      <form onSubmit={submit} className={`${cardClasses} p-5`} noValidate>
        <label htmlFor={`${id}-ref`} className="mb-1.5 block font-semibold">
          Référence de commande
        </label>
        <div className="flex gap-2">
          <input
            id={`${id}-ref`}
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="QG-7K2M9QX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={lookup.state === "error"}
            aria-describedby={`${id}-hint`}
            className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 font-semibold tracking-wide text-ink uppercase placeholder:font-normal placeholder:text-muted/70 focus:border-accent focus:outline-none"
          />
          <button type="submit" disabled={lookup.state === "loading"} className={buttonClasses("primary", "lg", "shrink-0 px-5")}>
            {lookup.state === "loading" ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Search className="size-5" aria-hidden="true" />}
            <span className="max-sm:sr-only">Suivre</span>
          </button>
        </div>
        <p id={`${id}-hint`} className="mt-2 text-sm text-muted">
          Tu la trouves dans le message de confirmation de ta commande.
        </p>
      </form>

      <div aria-live="polite" className="mt-6">
        {lookup.state === "error" && (
          <div role="alert" className="flex items-start gap-2 rounded-2xl bg-accent-strong/10 p-4 text-sm font-semibold text-accent-strong">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              {lookup.message}{" "}
              <a href={question} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                Écris-nous sur WhatsApp
              </a>
            </span>
          </div>
        )}

        {order && (
          <section aria-labelledby="order-title" className={`${cardClasses} p-5`}>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="order-title" className="font-display text-2xl font-bold">
                {order.ref}
              </h2>
              <p className="text-sm text-muted">Passée le {when(order.createdAt)}</p>
            </div>

            {cancelled ? (
              <p className="flex items-start gap-2 rounded-2xl bg-surface-2 p-4">
                <Ban className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
                <span>
                  <span className="block font-semibold">{order.status === "annulee" ? "Commande annulée" : "Commande sans suite"}</span>
                  <span className="text-sm text-muted">
                    {order.status === "annulee"
                      ? `Elle a été annulée${order.cancelledAt ? ` le ${when(order.cancelledAt)}` : ""}.`
                      : "On n'a pas réussi à te joindre pour la confirmer."}{" "}
                    Une erreur ? Écris-nous, on arrange ça.
                  </span>
                </span>
              </p>
            ) : (
              <ol className="relative space-y-5">
                {steps(order).map((s, i, all) => {
                  const current = s.done && !all[i + 1]?.done;
                  const Icon = i === 2 ? Truck : i === 3 ? PackageCheck : Check;
                  return (
                    <li key={s.label} className="relative flex gap-3" aria-current={current ? "step" : undefined}>
                      {i < all.length - 1 && (
                        <span aria-hidden="true" className={`absolute top-10 left-[19px] h-[calc(100%-1rem)] w-0.5 ${all[i + 1].done ? "bg-accent-strong" : "bg-line"}`} />
                      )}
                      <span
                        className={`relative grid size-10 shrink-0 place-items-center rounded-full border-2 ${
                          s.done ? "border-accent-strong bg-accent-strong text-on-accent" : "border-line bg-surface text-muted"
                        } ${current ? "ring-4 ring-accent-strong/20" : ""}`}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <div className="pt-1.5">
                        <p className={`font-semibold ${s.done ? "" : "text-muted"}`}>
                          {s.label}
                          <span className="sr-only">{s.done ? " (fait)" : " (à venir)"}</span>
                        </p>
                        {s.done && s.at && <p className="text-sm text-muted">{when(s.at)}</p>}
                        {current && <p className="mt-0.5 text-sm">{s.hint}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            <h3 className="mt-7 mb-3 font-display text-lg font-bold">Ta commande</h3>
            <ul className="space-y-3">
              {order.items.map((it) => (
                <li key={`${it.name}-${it.color}-${it.size}`} className="flex items-center gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    {it.image && <ProductImage src={it.image} alt="" fill sizes="56px" className="object-cover" />}
                  </div>
                  <p className="min-w-0 flex-1 text-sm">
                    <span className="block font-semibold">{it.name}</span>
                    <span className="text-muted">
                      {it.color} · {formatSize(it.size)} · x{it.qty}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt>Livraison{order.zone ? ` (${order.zone})` : ""}</dt>
                <dd>{order.deliveryFee === null ? "à confirmer" : formatPrice(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between gap-3 font-bold">
                <dt>Total</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
              <div className="flex justify-between gap-3 text-muted">
                <dt>Paiement</dt>
                <dd>{order.paid ? "Payé ✓" : "À régler à la livraison ou par Wave / Orange Money"}</dd>
              </div>
            </dl>
          </section>
        )}

        {(order || lookup.state === "error") && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a href={question} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "md", "flex-1")}>
              <WhatsAppIcon className="size-4" /> Une question ? Écris-nous
            </a>
            <Link href="/shop/" className={buttonClasses("secondary", "md", "flex-1")}>
              Continuer mes achats
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
