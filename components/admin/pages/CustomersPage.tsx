"use client";

import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import { useApi } from "@/lib/admin/api";
import { timeAgo } from "@/lib/admin/format";
import type { Customer } from "@/lib/admin/types";
import { formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { EmptyState, ErrorBox, Loading, PageHeader, inputClasses } from "../ui";

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"valeur" | "recent">("valeur");
  const query = new URLSearchParams({ ...(q ? { q } : {}), tri: sort });
  const { data, error, loading, reload } = useApi<{ customers: Customer[] }>(`/customers?${query}`);

  return (
    <>
      <PageHeader title="Clients" subtitle="Chaque numéro WhatsApp renseigné sur une commande devient une fiche client. Le total ne compte que les commandes confirmées." />
      <form
        role="search"
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(search.trim());
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, téléphone ou quartier" aria-label="Rechercher un client" className={`${inputClasses} pl-9`} />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Trier" className={`${inputClasses} w-auto`}>
          <option value="valeur">Meilleurs clients</option>
          <option value="recent">Commande la plus récente</option>
        </select>
      </form>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data &&
        (data.customers.length ? (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {data.customers.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/client/?id=${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ink/[0.03]">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 font-display font-bold" aria-hidden="true">
                    {(c.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name || "Sans nom"}</p>
                    <p className="truncate text-sm text-muted">
                      {formatPhone(c.phone)}
                      {c.district ? ` · ${c.district}` : ""}
                      {c.last_order_at ? ` · dernière commande ${timeAgo(c.last_order_at)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums">{formatPrice(c.revenue ?? 0)}</p>
                    <p className="text-xs text-muted">{c.orders ?? 0} commande(s)</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={q ? `Aucun client pour « ${q} »` : "Pas encore de client"}>Les fiches se créent quand tu renseignes le numéro d&apos;un client sur une commande.</EmptyState>
        ))}
    </>
  );
}
