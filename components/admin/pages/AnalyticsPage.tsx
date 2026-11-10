"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useState } from "react";
import { useApi } from "@/lib/admin/api";
import { formatPercent } from "@/lib/admin/format";
import { delta, type Analytics, type PeriodKey } from "@/lib/analytics";
import { formatPrice, formatSize } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { STATUS_LABELS } from "@/lib/orders";
import { RankList, RevenueChart } from "../charts";
import { ErrorBox, Loading, PageHeader, StatusBadge, panelClasses } from "../ui";

const PERIOD_LABELS: Record<PeriodKey, string> = { "7j": "7 jours", "30j": "30 jours", "90j": "3 mois", "12m": "12 mois" };

function Delta({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  const d = delta(current, previous);
  if (d === null) return <span className="text-muted">pas de comparaison</span>;
  const up = d > 0.005;
  const down = d < -0.005;
  const good = invert ? down : up;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${up || down ? (good ? "text-[#1C7A3E] dark:text-[#7EE0A1]" : "text-[#A3271A] dark:text-[#FFA697]") : "text-muted"}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {up ? "+" : ""}
      {formatPercent(d)} <span className="font-normal text-muted">vs période précédente</span>
    </span>
  );
}

function Kpi({ label, value, children }: { label: string; value: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className={panelClasses}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
      <div className="mt-1 text-xs">{children}</div>
    </div>
  );
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodKey>("30j");
  const { data, error, loading, reload } = useApi<Analytics>(`/analytics?periode=${period}`);

  return (
    <>
      <PageHeader title="Analyses" subtitle="Ventes = commandes confirmées, en livraison ou livrées (hors frais de livraison)." />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Période">
        {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={period === key}
            onClick={() => setPeriod(key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${period === key ? "border-accent-strong bg-accent-strong text-on-accent" : "border-line bg-surface hover:bg-ink/5"}`}
          >
            {PERIOD_LABELS[key]}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <div className={`space-y-5 ${loading ? "opacity-60 transition-opacity" : ""}`}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Ventes" value={formatPrice(data.kpis.revenue)}>
              <Delta current={data.kpis.revenue} previous={data.previous.revenue} />
            </Kpi>
            <Kpi label="Commandes validées" value={data.kpis.orders}>
              <Delta current={data.kpis.orders} previous={data.previous.orders} />
            </Kpi>
            <Kpi label="Panier moyen" value={formatPrice(data.kpis.avgBasket)}>
              <Delta current={data.kpis.avgBasket} previous={data.previous.avgBasket} />
            </Kpi>
            <Kpi label="Pièces vendues" value={data.kpis.items}>
              <Delta current={data.kpis.items} previous={data.previous.items} />
            </Kpi>
            <Kpi label="Commandes du site confirmées" value={formatPercent(data.kpis.conversion)}>
              <span className="text-muted">
                {data.kpis.siteValidated} sur {data.kpis.siteReceived} envoyées depuis le site
              </span>
            </Kpi>
            <Kpi label="Nouveaux clients" value={data.kpis.newCustomers}>
              <span className="text-muted">+ {data.kpis.returningCustomers} client(s) fidèle(s) revenu(s)</span>
            </Kpi>
            <Kpi label="Déjà encaissé" value={formatPrice(data.kpis.paidRevenue)}>
              <span className="text-muted">livraison comprise</span>
            </Kpi>
            <Kpi label="Annulations" value={data.kpis.cancelled}>
              <Delta current={data.kpis.cancelled} previous={data.previous.cancelled} invert />
            </Kpi>
          </div>

          <div className={panelClasses}>
            <RevenueChart series={data.series} title={`Ventes ${data.period.granularity === "day" ? "par jour" : data.period.granularity === "week" ? "par semaine" : "par mois"}`} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className={panelClasses}>
              <RankList title="Produits les plus vendus" rows={data.topProducts} />
            </div>
            <div className={panelClasses}>
              <RankList title="Par catégorie" rows={data.byCategory} />
            </div>
            <div className={panelClasses}>
              <RankList title="Tailles les plus demandées" rows={data.bySize.map((r) => ({ ...r, label: formatSize(r.key as never) }))} metric="qty" empty="Pas encore de ventes." />
              <p className="mt-3 text-xs text-muted">Utile pour tes prochains achats : commande plus de ces tailles.</p>
            </div>
            <div className={panelClasses}>
              <RankList title="Couleurs" rows={data.byColor} metric="qty" />
            </div>
            <div className={panelClasses}>
              <RankList title="Zones de livraison" rows={data.byZone} metric="orders" />
            </div>
            <div className={panelClasses}>
              <RankList title="D'où viennent les commandes" rows={data.bySource} metric="orders" />
            </div>
            <div className={panelClasses}>
              <RankList title="Moyens de paiement" rows={data.byPayment} metric="orders" />
            </div>
            <div className={panelClasses}>
              <h3 className="mb-3 font-display text-base font-bold">Meilleurs clients</h3>
              {data.topCustomers.length ? (
                <ol className="space-y-2 text-sm">
                  {data.topCustomers.map((c, i) => (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <Link href={`/admin/client/?id=${c.id}`} className="min-w-0 truncate hover:underline">
                        <span className="mr-1 font-semibold">{i + 1}.</span> {c.name} <span className="text-muted">· {formatPhone(c.phone)}</span>
                      </Link>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatPrice(c.revenue)} <span className="font-normal text-muted">· {c.orders} cmd</span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted">Pas encore de client sur cette période.</p>
              )}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className={panelClasses}>
              <h3 className="mb-3 font-display text-base font-bold">Où en sont les commandes</h3>
              <ul className="space-y-2 text-sm">
                {data.pipeline.map((p) => (
                  <li key={p.status} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/commandes/?statut=${p.status}`} className="hover:underline">
                      <StatusBadge status={p.status} />
                    </Link>
                    <span className="tabular-nums">
                      <span className="font-semibold">{p.count}</span> <span className="text-muted">· {formatPrice(p.amount)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">
                « {STATUS_LABELS.nouvelle} », « {STATUS_LABELS.confirmee} » et « {STATUS_LABELS.en_livraison} » : toutes dates. Autres statuts : sur la période.
              </p>
            </div>
            <div className={panelClasses}>
              <h3 className="mb-3 font-display text-base font-bold">Stock</h3>
              <dl className="mb-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">Pièces en stock</dt>
                  <dd className="font-display text-xl font-bold tabular-nums">{data.stock.units}</dd>
                </div>
                <div>
                  <dt className="text-muted">Valeur (prix de vente)</dt>
                  <dd className="font-display text-xl font-bold tabular-nums">{formatPrice(data.stock.value)}</dd>
                </div>
              </dl>
              {data.stock.low.length > 0 && (
                <>
                  <p className="mb-1 text-sm font-semibold">Dernière pièce ({data.stock.low.length})</p>
                  <ul className="mb-3 max-h-40 space-y-0.5 overflow-auto text-sm">
                    {data.stock.low.map((s) => (
                      <li key={`${s.slug}-${s.color}-${s.size}`}>
                        {s.name} · {s.color} · {s.size}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <Link href="/admin/produits/?filtre=rupture" className="text-sm font-semibold underline underline-offset-4">
                {data.stock.outOfStock.length} taille(s) en rupture → gérer le stock
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
