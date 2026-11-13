"use client";

import Link from "next/link";
import { BellRing, Check, ExternalLink, Undo2, X } from "lucide-react";
import { useState } from "react";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { buttonClasses } from "@/components/ui/styles";
import { api, useApi } from "@/lib/admin/api";
import { formatDate, formatSize } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { restockReadyMessage, type RestockStatus } from "@/lib/restock";
import type { Size } from "@/lib/types";
import { CatalogTabs } from "../CatalogTabs";
import { EmptyState, ErrorBox, Loading, PageHeader, panelClasses, useToast } from "../ui";

interface RestockRequest {
  id: number;
  slug: string;
  productName: string;
  color: string;
  size: Size | null;
  phone: string;
  name: string | null;
  status: RestockStatus;
  createdAt: string;
  notifiedAt: string | null;
  /** Stock actuel de la pièce demandée */
  stock: number;
}

interface Group {
  key: string;
  slug: string;
  productName: string;
  color: string;
  requests: RestockRequest[];
}

/** Regroupe les demandes en attente par modèle + couleur, celles « de retour » en premier */
function groupPending(requests: RestockRequest[]): Group[] {
  const groups = new Map<string, Group>();
  for (const r of requests) {
    const key = `${r.slug}|${r.color}`;
    const g = groups.get(key) ?? { key, slug: r.slug, productName: r.productName, color: r.color, requests: [] };
    g.requests.push(r);
    groups.set(key, g);
  }
  for (const g of groups.values()) g.requests.sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));
  const ready = (g: Group) => g.requests.some((r) => r.stock > 0);
  return [...groups.values()].sort((a, b) => Number(ready(b)) - Number(ready(a)) || b.requests.length - a.requests.length);
}

const STATUS_TEXT: Record<RestockStatus, string> = { en_attente: "En attente", prevenu: "Prévenu", annulee: "Annulée" };

export function RestockPage() {
  const { data, error, loading, reload } = useApi<{ requests: RestockRequest[] }>("/restock");
  const toast = useToast();
  const [busy, setBusy] = useState<number | null>(null);

  const pending = data?.requests.filter((r) => r.status === "en_attente") ?? [];
  const done = data?.requests.filter((r) => r.status !== "en_attente") ?? [];
  const groups = groupPending(pending);
  const readyCount = pending.filter((r) => r.stock > 0).length;

  const setStatus = async (r: RestockRequest, status: RestockStatus, message?: string) => {
    setBusy(r.id);
    try {
      await api(`/restock/${r.id}`, { method: "PATCH", body: { status } });
      if (message) toast.ok(message);
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const notify = (r: RestockRequest) => {
    // Le lien WhatsApp s'ouvre tout de suite (sinon le navigateur bloque la fenêtre)
    const text = restockReadyMessage({ name: r.name, productName: r.productName, color: r.color, size: r.size, slug: r.slug });
    window.open(`https://wa.me/${r.phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    void setStatus(r, "prevenu", `${r.name ?? formatPhone(r.phone)} marqué comme prévenu.`);
  };

  return (
    <>
      <CatalogTabs counts={{ "Demandes de retour": pending.length }} />
      <PageHeader
        title="Demandes de retour"
        subtitle="Les clients qui ont cliqué « Me prévenir du retour » sur une pièce épuisée. Quand tu remets du stock, préviens-les en un clic sur WhatsApp."
      />
      {toast.node}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}

      {data && pending.length === 0 && (
        <EmptyState title="Aucune demande en attente">
          Quand une couleur ou une taille est épuisée, le client peut laisser son numéro sur la fiche produit. Ses demandes arrivent ici.
        </EmptyState>
      )}

      {data && pending.length > 0 && (
        <div className="space-y-4">
          {readyCount > 0 && (
            <p className="flex items-start gap-2 rounded-2xl bg-[#DDEFD9] p-3 text-sm font-semibold text-[#1F4D17] dark:bg-[#1F3A1A] dark:text-[#CDEBC6]">
              <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {readyCount} client{readyCount > 1 ? "s attendent" : " attend"} une pièce qui est de nouveau en stock : préviens-{readyCount > 1 ? "les" : "le"} !
            </p>
          )}
          {groups.map((g) => (
            <section key={g.key} className={panelClasses} aria-labelledby={`g-${g.key}`}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 id={`g-${g.key}`} className="font-display text-lg font-bold">
                    {g.productName}
                  </h2>
                  <p className="text-sm text-muted">
                    {g.color} · {g.requests.length} demande{g.requests.length > 1 ? "s" : ""}
                  </p>
                </div>
                <Link href={`/admin/produit/?slug=${g.slug}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline underline-offset-4">
                  Gérer le stock <ExternalLink className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
              <ul className="divide-y divide-line">
                {g.requests.map((r) => {
                  const back = r.stock > 0;
                  return (
                    <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                      <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                        <p className="font-semibold">
                          {r.name ?? "Client"} · <span className="tabular-nums">{formatPhone(r.phone)}</span>
                        </p>
                        <p className="text-xs text-muted">
                          {r.size ? formatSize(r.size) : "N'importe quelle taille"} · demandé le {formatDate(r.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          back ? "bg-[#DDEFD9] text-[#1F4D17] dark:bg-[#1F3A1A] dark:text-[#CDEBC6]" : "bg-ink/8 text-muted"
                        }`}
                      >
                        {back ? `De retour · ${r.stock} en stock` : "Toujours épuisé"}
                      </span>
                      <div className="ml-auto flex gap-2">
                        <button
                          type="button"
                          disabled={busy === r.id}
                          onClick={() => notify(r)}
                          className={buttonClasses(back ? "whatsapp" : "secondary", "md")}
                        >
                          <WhatsAppIcon className="size-4" /> Prévenir
                        </button>
                        <button
                          type="button"
                          disabled={busy === r.id}
                          onClick={() => setStatus(r, "annulee", "Demande annulée.")}
                          className="grid size-11 place-items-center rounded-full border border-line hover:bg-ink/5 disabled:opacity-50"
                          aria-label={`Annuler la demande de ${r.name ?? formatPhone(r.phone)}`}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <section className="mt-8" aria-labelledby="done-title">
          <h2 id="done-title" className="mb-3 font-display text-lg font-bold">
            Traitées (30 derniers jours)
          </h2>
          <ul className={`${panelClasses} divide-y divide-line py-1 sm:py-1`}>
            {done.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm">
                <span className="inline-flex items-center gap-1 font-semibold">
                  {r.status === "prevenu" ? <Check className="size-4 text-[#2E7D32]" aria-hidden="true" /> : <X className="size-4 text-muted" aria-hidden="true" />}
                  {STATUS_TEXT[r.status]}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted">
                  {r.name ?? formatPhone(r.phone)} · {r.productName} {r.color}
                  {r.size ? ` (${formatSize(r.size)})` : ""}
                  {r.notifiedAt ? ` · le ${formatDate(r.notifiedAt)}` : ""}
                </span>
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => setStatus(r, "en_attente", "Demande remise en attente.")}
                  className="inline-flex min-h-11 items-center gap-1 font-semibold underline underline-offset-4 disabled:opacity-50"
                >
                  <Undo2 className="size-3.5" aria-hidden="true" /> Remettre en attente
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
