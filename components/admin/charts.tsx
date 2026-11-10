"use client";

import { useId, useState } from "react";
import { formatPrice } from "@/lib/format";
import { formatCompact } from "@/lib/admin/format";
import type { Breakdown, SeriesPoint } from "@/lib/analytics";

/*
 * Graphiques du dashboard — une seule série, une seule teinte (orange de la marque,
 * vérifiée en clair et en sombre). Barres fines arrondies côté valeur, grille discrète,
 * infobulle au survol/au toucher, et un tableau équivalent pour l'accessibilité.
 */

const CHART = "#e76117";

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Chiffre d'affaires dans le temps (barres verticales) */
export function RevenueChart({ series, title }: { series: SeriesPoint[]; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const id = useId();
  const max = niceMax(Math.max(...series.map((p) => p.revenue), 0));
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const H = 180;
  const n = series.length;
  // Libellés de l'axe : au plus ~7, pour ne jamais se chevaucher
  const every = Math.max(1, Math.ceil(n / 7));
  const point = active !== null ? series[active] : null;

  return (
    <figure aria-labelledby={`${id}-t`}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <figcaption id={`${id}-t`} className="font-display text-lg font-bold">
          {title}
        </figcaption>
        <button type="button" onClick={() => setShowTable((v) => !v)} className="text-sm font-semibold underline underline-offset-4">
          {showTable ? "Voir le graphique" : "Voir le tableau"}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-72 overflow-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left">
              <tr>
                <th className="px-3 py-2">Période</th>
                <th className="px-3 py-2 text-right">Ventes</th>
                <th className="px-3 py-2 text-right">Commandes</th>
              </tr>
            </thead>
            <tbody>
              {series.map((p) => (
                <tr key={p.key} className="border-t border-line">
                  <td className="px-3 py-1.5">{p.label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatPrice(p.revenue)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{p.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          {/* Infobulle */}
          <div className="pointer-events-none mb-1 h-10 text-sm" aria-live="polite">
            {point ? (
              <p>
                <span className="font-semibold">{point.label}</span> · {formatPrice(point.revenue)} · {point.orders} commande{point.orders > 1 ? "s" : ""}
              </p>
            ) : (
              <p className="text-muted">Survole ou touche une barre pour le détail.</p>
            )}
          </div>
          <div className="flex gap-2">
            {/* Axe des montants */}
            <div className="relative w-10 shrink-0 text-right text-[11px] text-muted tabular-nums" style={{ height: H }} aria-hidden="true">
              {ticks.map((t) => (
                <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: H - (t / max) * H }}>
                  {formatCompact(t)}
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="relative" style={{ height: H }} onMouseLeave={() => setActive(null)}>
                {ticks.map((t) => (
                  <div key={t} className="absolute inset-x-0 border-t border-line/70" style={{ top: H - (t / max) * H }} aria-hidden="true" />
                ))}
                <div className="absolute inset-0 flex items-end" style={{ gap: n > 40 ? 1 : 2 }}>
                  {series.map((p, i) => {
                    const h = p.revenue > 0 ? Math.max(2, (p.revenue / max) * H) : 0;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        className="group relative flex h-full flex-1 items-end justify-center outline-none"
                        onMouseEnter={() => setActive(i)}
                        onFocus={() => setActive(i)}
                        onClick={() => setActive(i)}
                        aria-label={`${p.label} : ${formatPrice(p.revenue)}, ${p.orders} commande(s)`}
                      >
                        <span
                          className="block w-full max-w-6 rounded-t-[4px] transition-opacity group-focus-visible:ring-2 group-focus-visible:ring-ink"
                          style={{ height: h, background: CHART, opacity: active === null || active === i ? 1 : 0.45 }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-1 flex text-[11px] text-muted" aria-hidden="true">
                {series.map((p, i) => (
                  <span key={p.key} className="flex-1 truncate text-center">
                    {i % every === 0 ? p.label : ""}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </figure>
  );
}

/** Classement horizontal (produits, tailles, zones…) avec valeurs écrites */
export function RankList({ title, rows, metric = "revenue", empty = "Pas encore de données.", limit = 8 }: { title: string; rows: Breakdown[]; metric?: "revenue" | "qty" | "orders"; empty?: string; limit?: number }) {
  const shown = rows.slice(0, limit);
  const max = Math.max(...shown.map((r) => r[metric]), 1);
  const format = (r: Breakdown) => (metric === "revenue" ? formatPrice(r.revenue) : metric === "qty" ? `${r.qty} pièce${r.qty > 1 ? "s" : ""}` : `${r.orders} cmd`);
  const secondary = (r: Breakdown) => (metric === "revenue" ? `${r.qty} pièce${r.qty > 1 ? "s" : ""}` : formatPrice(r.revenue));

  return (
    <section aria-label={title}>
      <h3 className="mb-3 font-display text-base font-bold">{title}</h3>
      {shown.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((r) => (
            <li key={r.key} title={`${r.label} : ${formatPrice(r.revenue)} · ${r.qty} pièce(s) · ${r.orders} commande(s)`}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">{r.label}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {format(r)} <span className="font-normal text-muted">· {secondary(r)}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-ink/[0.06]" aria-hidden="true">
                <div className="h-2 rounded-r-[4px] rounded-l-full" style={{ width: `${Math.max(2, (r[metric] / max) * 100)}%`, background: CHART }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
