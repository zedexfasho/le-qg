"use client";

import Link from "next/link";
import { AlertTriangle, BellRing, Plus } from "lucide-react";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/styles";
import { formatPrice } from "@/lib/format";
import { useApi } from "@/lib/admin/api";
import type { Order } from "@/lib/admin/types";
import type { OrderStatus } from "@/lib/orders";
import { useAdminUser, usePendingOrders } from "../AdminShell";
import { OrderList } from "../OrderList";
import { EmptyState, ErrorBox, Loading, PageHeader, Stat, panelClasses } from "../ui";

interface Summary {
  counts: Partial<Record<OrderStatus, { count: number; amount: number }>>;
  unpaid: { n: number; amount: number };
  today: { received: number; revenue: number };
  week: { received: number; revenue: number; validated: number };
  recent: Order[];
  stock: { outOfStock: number; low: number; products: number };
  restock: { pending: number; ready: number };
}

const greeting = () => {
  const h = new Date().getUTCHours();
  return h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
};

export function HomePage() {
  const user = useAdminUser();
  const { data, error, loading, reload } = useApi<Summary>("/summary");
  // Nouvelle commande reçue (pastille du menu) : la liste se met à jour toute seule
  const { signal } = usePendingOrders();
  const [seenSignal, setSeenSignal] = useState(signal);
  if (signal !== seenSignal) {
    setSeenSignal(signal);
    if (seenSignal) reload();
  }

  const todo = (status: OrderStatus, label: string, hint: string) => {
    const c = data?.counts[status];
    return (
      <Link href={`/admin/commandes/?statut=${status}`} className={`${panelClasses} block transition-shadow hover:shadow-warm`}>
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 font-display text-3xl font-bold tabular-nums">{c?.count ?? 0}</p>
        <p className="mt-1 text-xs text-muted">{c ? formatPrice(c.amount) : hint}</p>
      </Link>
    );
  };

  return (
    <>
      <PageHeader
        title={`${greeting()} ${user?.name ?? ""} 👋`}
        subtitle="Voici ce qui se passe au QG."
        actions={
          <Link href="/admin/commandes/nouvelle/" className={buttonClasses("primary", "md")}>
            <Plus className="size-4" aria-hidden="true" /> Saisir une commande
          </Link>
        }
      />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <div className="space-y-6">
          {data.restock.ready > 0 && (
            <Link
              href="/admin/demandes/"
              className="flex items-start gap-3 rounded-2xl bg-[#DDEFD9] p-4 text-[#1F4D17] transition-shadow hover:shadow-warm dark:bg-[#1F3A1A] dark:text-[#CDEBC6]"
            >
              <BellRing className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span>
                <span className="block font-semibold">
                  {data.restock.ready} client{data.restock.ready > 1 ? "s attendent" : " attend"} une pièce revenue en stock
                </span>
                <span className="text-sm">Préviens-{data.restock.ready > 1 ? "les" : "le"} sur WhatsApp en un clic →</span>
              </span>
            </Link>
          )}
          <section aria-labelledby="todo-title">
            <h2 id="todo-title" className="mb-3 font-display text-lg font-bold">
              À traiter
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {todo("nouvelle", "Nouvelles à confirmer", "En attente du client sur WhatsApp")}
              {todo("confirmee", "Confirmées à préparer", "Stock déjà réservé")}
              {todo("en_livraison", "En livraison", "Chez le livreur")}
              <Link href="/admin/commandes/?statut=non_paye" className={`${panelClasses} block transition-shadow hover:shadow-warm`}>
                <p className="text-sm text-muted">Paiements à encaisser</p>
                <p className="mt-1 font-display text-3xl font-bold tabular-nums">{data.unpaid.n}</p>
                <p className="mt-1 text-xs text-muted">{formatPrice(data.unpaid.amount)}</p>
              </Link>
            </div>
          </section>

          <section aria-labelledby="perf-title">
            <h2 id="perf-title" className="mb-3 font-display text-lg font-bold">
              Ventes
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Ventes aujourd'hui" value={formatPrice(data.today.revenue)} hint={`${data.today.received} commande(s) reçue(s)`} tone="accent" />
              <Stat label="Ventes 7 derniers jours" value={formatPrice(data.week.revenue)} hint={`${data.week.validated} commande(s) validée(s)`} />
              <Stat label="Commandes reçues (7 j)" value={data.week.received} hint="Toutes origines confondues" />
              <Link href="/admin/produits/?filtre=rupture" className="block">
                <Stat
                  label="Stock à surveiller"
                  value={data.stock.outOfStock}
                  hint={
                    <span className="inline-flex items-center gap-1">
                      {data.stock.outOfStock > 0 && <AlertTriangle className="size-3.5" aria-hidden="true" />}
                      tailles en rupture · {data.stock.low} presque épuisée(s)
                    </span>
                  }
                />
              </Link>
            </div>
            <p className="mt-2 text-right text-sm">
              <Link href="/admin/analyses/" className="font-semibold underline underline-offset-4">
                Toutes les analyses →
              </Link>
            </p>
          </section>

          <section aria-labelledby="recent-title">
            <div className="mb-3 flex items-end justify-between gap-2">
              <h2 id="recent-title" className="font-display text-lg font-bold">
                Commandes en cours
              </h2>
              <Link href="/admin/commandes/" className="text-sm font-semibold underline underline-offset-4">
                Tout voir
              </Link>
            </div>
            {data.recent.length ? (
              <OrderList orders={data.recent} />
            ) : (
              <EmptyState title="Aucune commande en cours">Les commandes envoyées depuis le site arrivent ici automatiquement.</EmptyState>
            )}
          </section>
        </div>
      )}
    </>
  );
}
