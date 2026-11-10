"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { SOURCE_LABELS } from "@/lib/orders";
import { timeAgo } from "@/lib/admin/format";
import type { Order } from "@/lib/admin/types";
import { StatusBadge } from "./ui";

/** Liste de commandes : cartes sur mobile, lignes compactes sur ordinateur */
export function OrderList({ orders }: { orders: Order[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/admin/commande/?id=${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ink/[0.03] focus-visible:bg-ink/[0.05]">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-sm font-bold tracking-wide">{o.ref}</span>
                <StatusBadge status={o.status} />
                {!o.paid && (o.status === "confirmee" || o.status === "en_livraison" || o.status === "livree") && (
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold">Non payée</span>
                )}
              </div>
              <p className="mt-1 truncate text-sm text-muted">
                {o.customerName || (o.customerPhone ? formatPhone(o.customerPhone) : "Client à identifier")}
                {o.district ? ` · ${o.district}` : ""} · {SOURCE_LABELS[o.source]} · {timeAgo(o.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold tabular-nums whitespace-nowrap">{formatPrice(o.total)}</p>
              {o.itemCount !== undefined && (
                <p className="text-xs text-muted">
                  {o.itemCount} article{o.itemCount > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
