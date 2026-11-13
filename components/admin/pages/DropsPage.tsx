"use client";

import Link from "next/link";
import { CalendarDays, Pencil, Plus } from "lucide-react";
import { ProductImage } from "@/components/product/ProductImage";
import { buttonClasses } from "@/components/ui/styles";
import { useApi } from "@/lib/admin/api";
import type { AdminDrop } from "@/lib/admin/types";
import { DEFAULT_DROP_COVER } from "@/lib/drops";
import { formatDate } from "@/lib/format";
import { CatalogTabs } from "../CatalogTabs";
import { PublishButton } from "../PublishButton";
import { EmptyState, ErrorBox, Loading, PageHeader, panelClasses } from "../ui";

/** Ce que voit le client pour ce drop */
function visibility(d: AdminDrop): { label: string; tone: string } {
  if (d.publishedProducts > 0) return { label: `En ligne · ${d.publishedProducts} pièce${d.publishedProducts > 1 ? "s" : ""}`, tone: "bg-[#DDEFD9] text-[#1F4D17] dark:bg-[#1F3A1A] dark:text-[#CDEBC6]" };
  if (d.products > 0) return { label: "Produits en brouillon : pas encore visible", tone: "bg-ink/8 text-muted" };
  return { label: "Aucun produit : pas encore visible", tone: "bg-ink/8 text-muted" };
}

export function DropsPage() {
  const { data, error, loading, reload } = useApi<{ drops: AdminDrop[] }>("/drops");

  return (
    <>
      <CatalogTabs />
      <PageHeader
        title="Drops"
        subtitle="Un drop apparaît sur le site dès qu'un produit publié lui est rattaché (champ « Drop » de la fiche produit), après « Publier le site »."
        actions={
          <>
            <PublishButton compact />
            <Link href="/admin/drop/" className={buttonClasses("secondary", "md")}>
              <Plus className="size-4" aria-hidden="true" /> Nouveau drop
            </Link>
          </>
        }
      />

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && data.drops.length === 0 && (
        <EmptyState title="Aucun drop pour l'instant">
          Crée ton premier arrivage (nom, date, photo), puis rattache-lui des produits.
        </EmptyState>
      )}
      {data && data.drops.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.drops.map((d) => {
            const v = visibility(d);
            return (
              <li key={d.id}>
                <Link href={`/admin/drop/?id=${d.id}`} className={`${panelClasses} flex gap-3 transition-colors hover:border-ink/30`}>
                  <div className="relative aspect-[3/2] w-28 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    <ProductImage src={d.cover ?? DEFAULT_DROP_COVER} alt="" fill sizes="112px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <CalendarDays className="size-3.5" aria-hidden="true" /> {formatDate(d.date)}
                    </p>
                    <p className="truncate font-display text-lg font-bold">{d.title}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${v.tone}`}>{v.label}</span>
                  </div>
                  <Pencil className="size-4 shrink-0 self-center text-muted" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
