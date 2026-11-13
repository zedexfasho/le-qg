"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/styles";
import { useApi } from "@/lib/admin/api";
import type { Order } from "@/lib/admin/types";
import { ORDER_SOURCES, SOURCE_LABELS } from "@/lib/orders";
import { usePendingOrders } from "../AdminShell";
import { OrderList } from "../OrderList";
import { EmptyState, ErrorBox, Loading, PageHeader, inputClasses } from "../ui";

const TABS = [
  { key: "a_traiter", label: "À traiter" },
  { key: "nouvelle", label: "Nouvelles" },
  { key: "confirmee", label: "Confirmées" },
  { key: "en_livraison", label: "En livraison" },
  { key: "livree", label: "Livrées" },
  { key: "non_paye", label: "Non payées" },
  { key: "sans_suite", label: "Sans suite" },
  { key: "annulee", label: "Annulées" },
  { key: "toutes", label: "Toutes" },
];

export function OrdersPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = params.get("q") ?? "";
  const status = params.get("statut") ?? (q ? "toutes" : "a_traiter");
  const source = params.get("source") ?? "";
  const client = params.get("client") ?? "";
  const page = Number(params.get("page") ?? 1) || 1;
  const [search, setSearch] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    setSyncedQ(q);
    setSearch(q);
  }

  const query = new URLSearchParams();
  if (status !== "toutes") query.set("status", status);
  if (q) query.set("q", q);
  if (source) query.set("source", source);
  if (client) query.set("client", client);
  if (page > 1) query.set("page", String(page));
  const { data, error, loading, reload } = useApi<{ orders: Order[]; total: number; page: number; pageSize: number }>(`/orders?${query}`);
  // Nouvelle commande reçue (pastille du menu) : la liste se met à jour toute seule
  const { signal } = usePendingOrders();
  const [seenSignal, setSeenSignal] = useState(signal);
  if (signal !== seenSignal) {
    setSeenSignal(signal);
    if (seenSignal) reload();
  }

  const navigate = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in changes)) next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader
        title="Commandes"
        subtitle={data ? `${data.total} commande${data.total > 1 ? "s" : ""}` : " "}
        actions={
          <Link href="/admin/commandes/nouvelle/" className={buttonClasses("primary", "md")}>
            <Plus className="size-4" aria-hidden="true" /> Saisir une commande
          </Link>
        }
      />

      <form
        role="search"
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ q: search.trim() || null, statut: search.trim() ? "toutes" : null });
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Référence (QG-…), téléphone ou nom"
            aria-label="Rechercher une commande"
            className={`${inputClasses} pl-9`}
          />
        </div>
        <select value={source} onChange={(e) => navigate({ source: e.target.value || null })} aria-label="Origine" className={`${inputClasses} w-auto`}>
          <option value="">Toutes origines</option>
          {ORDER_SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
      </form>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Filtrer par statut">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={status === t.key}
            onClick={() => navigate({ statut: t.key === "a_traiter" ? null : t.key })}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${status === t.key ? "border-accent-strong bg-accent-strong text-on-accent" : "border-line bg-surface hover:bg-ink/5"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {client && (
        <p className="mb-3 text-sm">
          Commandes d&apos;un client précis ·{" "}
          <button type="button" className="font-semibold underline" onClick={() => navigate({ client: null })}>
            Voir toutes les commandes
          </button>
        </p>
      )}

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data &&
        (data.orders.length ? (
          <div className={loading ? "opacity-60 transition-opacity" : ""}>
            <OrderList orders={data.orders} />
            {pages > 1 && (
              <nav className="mt-4 flex items-center justify-center gap-3 text-sm" aria-label="Pages">
                <button type="button" disabled={page <= 1} onClick={() => navigate({ page: String(page - 1) })} className={buttonClasses("secondary", "md")}>
                  Précédent
                </button>
                <span>
                  Page {page} / {pages}
                </span>
                <button type="button" disabled={page >= pages} onClick={() => navigate({ page: String(page + 1) })} className={buttonClasses("secondary", "md")}>
                  Suivant
                </button>
              </nav>
            )}
          </div>
        ) : (
          <EmptyState title={q ? `Aucune commande pour « ${q} »` : "Aucune commande ici"}>
            {status === "a_traiter" ? "Tout est traité. Les nouvelles commandes du site apparaîtront ici." : "Essaie un autre filtre."}
          </EmptyState>
        ))}
    </>
  );
}
