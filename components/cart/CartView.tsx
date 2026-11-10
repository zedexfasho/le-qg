"use client";

import Link from "next/link";
import { AlertTriangle, Minus, Plus, Trash2 } from "lucide-react";
import { HangerIcon } from "@/components/brand/Decor";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { ProductImage } from "@/components/product/ProductImage";
import { buttonClasses, cardClasses } from "@/components/ui/styles";
import { cartTotal, resolveCart, toOrderLines } from "@/lib/cart";
import { cart, useCart, useHydrated } from "@/lib/cart-store";
import { formatPrice, formatSize } from "@/lib/format";
import type { Product } from "@/lib/types";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export function CartView({ products }: { products: Product[] }) {
  const items = useCart();
  const hydrated = useHydrated();

  // Pendant le chargement, on réserve exactement la place du panier vide (pas de saut de mise en page)
  if (!hydrated || items.length === 0) {
    return (
      <div
        className={`flex min-h-80 flex-col items-center justify-center rounded-3xl bg-surface-2 px-6 py-12 text-center ${hydrated ? "" : "animate-pulse"}`}
        aria-busy={!hydrated}
      >
        <div className={hydrated ? "contents" : "invisible contents"}>
          <HangerIcon className="mb-4 size-16 text-muted" strokeWidth={1.5} />
          <p className="font-display text-2xl font-bold">Ton panier est vide… passe faire un tour au QG</p>
          <Link href="/shop/" className={buttonClasses("primary", "lg", "mt-6")} tabIndex={hydrated ? undefined : -1}>
            Passe au QG
          </Link>
        </div>
      </div>
    );
  }

  const lines = resolveCart(items, products);
  const orderLines = toOrderLines(lines);
  const total = cartTotal(orderLines);
  const hasIssues = lines.some((l) => l.status !== "ok");
  const whatsappUrl = orderLines.length ? buildWhatsAppUrl(buildWhatsAppMessage(orderLines)) : undefined;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <ul className="space-y-3">
        {lines.map(({ item, product, image, stock, qty, status }) => (
          <li key={`${item.slug}-${item.color}-${item.size}`} className={`${cardClasses} flex gap-3 p-3 sm:gap-4 ${status === "unavailable" ? "opacity-70" : ""}`}>
            <Link href={product ? `/product/${product.slug}/` : "/shop/"} className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:w-28">
              <ProductImage src={image} alt={product?.name ?? "Article retiré"} fill sizes="112px" className="object-cover" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold leading-snug">{product?.name ?? "Article retiré du catalogue"}</p>
                  <p className="text-sm text-muted">
                    {item.color} · {formatSize(item.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => cart.remove(item)}
                  className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-ink/5"
                  aria-label={`Retirer ${product?.name ?? "l'article"} du panier`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {status === "unavailable" && (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-accent-strong">
                  <AlertTriangle className="size-4" aria-hidden="true" /> Plus disponible — non inclus dans la commande
                </p>
              )}
              {status === "reduced" && (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-accent-strong">
                  <AlertTriangle className="size-4" aria-hidden="true" /> Plus que {stock} en stock — quantité ajustée
                </p>
              )}

              {product && status !== "unavailable" && (
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <div className="inline-flex items-center rounded-full border border-line" role="group" aria-label="Quantité">
                    <button
                      type="button"
                      className="grid size-9 place-items-center rounded-full disabled:opacity-40"
                      onClick={() => cart.setQty(item, qty - 1, stock)}
                      aria-label="Diminuer la quantité"
                    >
                      <Minus className="size-4" />
                    </button>
                    <output className="w-7 text-center text-sm font-semibold">{qty}</output>
                    <button
                      type="button"
                      className="grid size-9 place-items-center rounded-full disabled:opacity-40"
                      onClick={() => cart.setQty(item, qty + 1, stock)}
                      disabled={qty >= stock}
                      aria-label="Augmenter la quantité"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <p className="font-bold">{formatPrice(product.price * qty)}</p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <aside className={`${cardClasses} h-fit p-5 lg:sticky lg:top-24`} aria-label="Récapitulatif">
        <h2 className="mb-4 font-display text-xl font-bold">Récap</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Articles</dt>
            <dd>{orderLines.reduce((n, l) => n + l.qty, 0)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Livraison</dt>
            <dd className="text-right text-muted">
              Selon ta zone (<Link href="/infos/#livraison" className="underline">tarifs</Link>)
            </dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-lg font-bold">
            <dt>Total articles</dt>
            <dd>{formatPrice(total)}</dd>
          </div>
        </dl>

        {whatsappUrl ? (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "lg", "mt-5 w-full")}>
            <WhatsAppIcon className="size-5" />
            Commander sur WhatsApp
          </a>
        ) : (
          <p className="mt-5 text-sm font-semibold text-accent-strong">Aucun article de ton panier n&apos;est disponible pour le moment.</p>
        )}
        <p className="mt-3 text-xs text-muted">
          Un seul message récapitule toute ta commande. Tu confirmes ton nom, ton quartier et ton moyen de paiement directement sur WhatsApp.
        </p>
        {hasIssues && (
          <p className="mt-3 text-xs text-muted">Les articles épuisés ne sont pas inclus dans le message.</p>
        )}
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Vider le panier ?")) cart.clear();
          }}
          className="mt-4 text-sm font-semibold underline underline-offset-4"
        >
          Vider le panier
        </button>
      </aside>
    </div>
  );
}
