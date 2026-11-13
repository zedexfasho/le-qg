"use client";

import Link from "next/link";
import { BellRing, Check, Minus, Plus, Send, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { CheckoutDialog } from "@/components/checkout/CheckoutForm";
import { Gallery } from "@/components/product/Gallery";
import { Price } from "@/components/product/Price";
import { RestockDialog } from "@/components/product/RestockDialog";
import { SizeGuide } from "@/components/product/SizeGuide";
import { buttonClasses } from "@/components/ui/styles";
import { cart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { defaultVariantIndex, isVariantInStock, sizesOf, stockOf } from "@/lib/product";
import type { Product, Size, Variant } from "@/lib/types";
import { registerOrder, useLiveProduct, useOrderRef } from "@/lib/order-capture";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

/** Taille présélectionnée : seulement s'il n'y a qu'un choix possible (ex. taille unique) */
function autoSize(variant: Variant): Size | undefined {
  const available = sizesOf(variant).filter((s) => stockOf(variant, s) > 0);
  return available.length === 1 ? available[0] : undefined;
}

export function ProductDetail({ product: staticProduct }: { product: Product }) {
  // Stock et prix en direct (le site statique peut avoir quelques minutes de retard)
  const product = useLiveProduct(staticProduct);
  const getRef = useOrderRef();
  const [variantIndex, setVariantIndex] = useState(() => defaultVariantIndex(product));
  const variant = product.variants[variantIndex];
  const [size, setSize] = useState<Size | undefined>(() => (variant ? autoSize(variant) : undefined));
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [added, setAdded] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);

  // La barre d'achat mobile remplace le bouton WhatsApp flottant
  useEffect(() => {
    document.body.dataset.buybar = "on";
    return () => {
      delete document.body.dataset.buybar;
    };
  }, []);

  if (!variant) return null;

  const sizes = sizesOf(variant);
  const stock = stockOf(variant, size);
  const variantAvailable = isVariantInStock(variant);
  const maxQty = Math.max(1, stock);
  const soldOutSizes = sizes.filter((s) => stockOf(variant, s) === 0);

  const selectVariant = (index: number) => {
    const next = product.variants[index];
    setVariantIndex(index);
    setAdded(false);
    const keep = size && stockOf(next, size) > 0 ? size : autoSize(next);
    setSize(keep);
    setQty((q) => Math.min(q, Math.max(1, stockOf(next, keep))));
  };

  const selectSize = (value: Size) => {
    setSize(value);
    setSizeError(false);
    setAdded(false);
    setQty((q) => Math.min(q, Math.max(1, stockOf(variant, value))));
  };

  const orderUrl = size
    ? buildWhatsAppUrl(
        buildWhatsAppMessage([{ name: product.name, color: variant.color, size, qty, unitPrice: product.price }]),
      )
    : undefined;

  const requireSize = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!size) {
      event.preventDefault();
      setSizeError(true);
      document.getElementById("size-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // Référence ajoutée au message + commande enregistrée pour le dashboard
    const ref = getRef();
    event.currentTarget.href = buildWhatsAppUrl(
      buildWhatsAppMessage([{ name: product.name, color: variant.color, size, qty, unitPrice: product.price }], { reference: ref }),
    );
    registerOrder(ref, [{ slug: product.slug, color: variant.color, size, qty }]);
  };

  // « Commander sur le site » : il faut d'abord une taille
  const openCheckout = () => {
    if (!size) {
      setSizeError(true);
      document.getElementById("size-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setCheckoutOpen(true);
  };

  const addToCart = () => {
    if (!size) {
      setSizeError(true);
      return;
    }
    cart.add({ slug: product.slug, color: variant.color, size, qty }, stock);
    setAdded(true);
  };

  const whatsappButton = (extra: string, compact = false) =>
    variantAvailable ? (
      <a
        href={orderUrl ?? "#size-picker"}
        onClick={requireSize}
        target={orderUrl ? "_blank" : undefined}
        rel="noopener noreferrer"
        className={compact ? `grid size-13 place-items-center rounded-full bg-whatsapp text-[#10230F] shadow-warm ${extra}` : buttonClasses("whatsapp", "lg", extra)}
        aria-label={compact ? "Commander sur WhatsApp" : undefined}
      >
        <WhatsAppIcon className="size-5" />
        {!compact && "Commander sur WhatsApp"}
      </a>
    ) : (
      <button type="button" onClick={() => setRestockOpen(true)} className={buttonClasses("secondary", "lg", extra)}>
        <BellRing className="size-5" aria-hidden="true" />
        {compact ? "Me prévenir" : "Me prévenir du retour"}
      </button>
    );

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      <Gallery key={variant.color} images={variant.images} alt={`${product.name} ${variant.color}`} priority />

      <div>
        {product.brandLabel && <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">{product.brandLabel}</p>}
        <h1 className="font-display text-3xl leading-tight font-bold sm:text-4xl">{product.name}</h1>
        <div className="mt-3">
          <Price price={product.price} oldPrice={product.oldPrice} size="lg" />
        </div>
        <p className="mt-2 text-sm">
          <span className="font-semibold">État :</span> {product.condition}
        </p>

        {/* Couleurs */}
        <fieldset className="mt-6">
          <legend className="mb-2 text-sm">
            <span className="font-semibold">Couleur :</span> {variant.color}
            {!variantAvailable && <span className="ml-2 font-semibold text-accent-strong">— épuisée</span>}
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {product.variants.map((v, i) => {
              const available = isVariantInStock(v);
              const selected = i === variantIndex;
              return (
                <label
                  key={v.color}
                  title={v.color}
                  className={`relative grid size-11 cursor-pointer place-items-center rounded-full border-2 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${selected ? "border-ink" : "border-transparent hover:border-ink/40"}`}
                >
                  <input
                    type="radio"
                    name="color"
                    value={v.color}
                    checked={selected}
                    onChange={() => selectVariant(i)}
                    className="sr-only"
                  />
                  <span className="size-8 rounded-full border border-ink/20" style={{ backgroundColor: v.colorHex }} />
                  {!available && (
                    <span aria-hidden="true" className="absolute h-0.5 w-9 rotate-45 rounded bg-ink/70" />
                  )}
                  <span className="sr-only">
                    {v.color}
                    {!available ? " (épuisé)" : ""}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Tailles */}
        <fieldset id="size-picker" className="mt-6 scroll-mt-28">
          <div className="mb-2 flex items-center justify-between gap-4">
            <legend className="text-sm">
              <span className="font-semibold">Taille :</span> {size ? (size === "TU" ? "Taille unique" : size) : "choisis ta taille"}
            </legend>
            {!sizes.every((s) => s === "TU") && <SizeGuide productName={product.name} />}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const sizeStock = stockOf(variant, s);
              const disabled = sizeStock === 0;
              const selected = s === size;
              return (
                <label
                  key={s}
                  className={`relative inline-flex h-12 min-w-14 items-center justify-center rounded-xl border-2 px-3 text-sm font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                    disabled
                      ? "cursor-not-allowed border-line text-muted/60 line-through"
                      : selected
                        ? "cursor-pointer border-ink bg-ink text-bg"
                        : "cursor-pointer border-line bg-surface hover:border-ink/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="size"
                    value={s}
                    checked={selected}
                    disabled={disabled}
                    onChange={() => selectSize(s)}
                    className="sr-only"
                  />
                  {s === "TU" ? "Taille unique" : s}
                  {disabled && <span className="sr-only"> (épuisé)</span>}
                </label>
              );
            })}
          </div>
          {variantAvailable && soldOutSizes.length > 0 && (
            <button
              type="button"
              onClick={() => setRestockOpen(true)}
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
            >
              <BellRing className="size-4" aria-hidden="true" />
              Ta taille est épuisée ? Préviens-moi quand elle revient
            </button>
          )}
          <p className="mt-2 min-h-5 text-sm" aria-live="polite">
            {sizeError && !size ? (
              <span className="font-semibold text-accent-strong">Choisis ta taille d&apos;abord 👆</span>
            ) : size && stock > 0 && stock <= 2 ? (
              <span className="font-semibold text-accent-strong">Plus que {stock} en stock !</span>
            ) : null}
          </p>
        </fieldset>

        {/* Quantité */}
        {variantAvailable && (
          <div className="mt-4 flex items-center gap-4">
            <span id="qty-label" className="text-sm font-semibold">Quantité</span>
            <div className="inline-flex items-center rounded-full border border-line bg-surface" role="group" aria-labelledby="qty-label">
              <button
                type="button"
                className="grid size-11 place-items-center rounded-full disabled:opacity-40"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Diminuer la quantité"
              >
                <Minus className="size-4" />
              </button>
              <output className="w-8 text-center font-semibold" aria-live="polite">{qty}</output>
              <button
                type="button"
                className="grid size-11 place-items-center rounded-full disabled:opacity-40"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={!size || qty >= maxQty}
                aria-label="Augmenter la quantité"
              >
                <Plus className="size-4" />
              </button>
            </div>
            {qty > 1 && <span className="text-sm text-muted">Total : {formatPrice(product.price * qty)}</span>}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex max-w-md flex-col gap-3">
          {variantAvailable && (
            <button type="button" onClick={openCheckout} className={buttonClasses("primary", "lg", "w-full whitespace-nowrap")}>
              <Send className="size-5" aria-hidden="true" />
              Commander sur le site
            </button>
          )}
          {whatsappButton("w-full whitespace-nowrap")}
          {variantAvailable && (
            <button type="button" onClick={addToCart} className={buttonClasses("secondary", "lg", "w-full whitespace-nowrap")}>
              {added ? <Check className="size-5" aria-hidden="true" /> : <ShoppingBag className="size-5" aria-hidden="true" />}
              {added ? "Ajouté au panier" : "Ajouter au panier"}
            </button>
          )}
        </div>
        <p className="mt-2 min-h-5 text-sm" aria-live="polite">
          {added && (
            <Link href="/panier/" className="font-semibold underline underline-offset-4">
              Voir mon panier →
            </Link>
          )}
        </p>

        {!variantAvailable && (
          <p className="mt-2 text-sm text-muted">
            Cette couleur est épuisée pour le moment. Laisse ton numéro, on te prévient sur WhatsApp dès qu&apos;elle revient au QG.
          </p>
        )}

        <div className="mt-8 border-t border-line pt-6">
          <h2 className="mb-2 font-display text-lg font-bold">Description</h2>
          <p className="leading-relaxed whitespace-pre-line text-muted">{product.description}</p>
        </div>
      </div>

      {/* Barre d'achat collante (mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted">
              {variant.color}
              {size ? ` · ${size === "TU" ? "Taille unique" : size}` : ""}
            </p>
            <p className="font-bold">{formatPrice(product.price * qty)}</p>
          </div>
          {variantAvailable && (
            <button type="button" onClick={openCheckout} className={buttonClasses("primary", "lg", "shrink-0 px-5")}>
              Commander
            </button>
          )}
          {whatsappButton("shrink-0", true)}
        </div>
      </div>

      <RestockDialog
        open={restockOpen}
        onClose={() => setRestockOpen(false)}
        slug={product.slug}
        productName={product.name}
        color={variant.color}
        soldOutSizes={variantAvailable ? soldOutSizes : sizes.length > 1 ? sizes : []}
      />

      {size && (
        <CheckoutDialog
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          items={[{ slug: product.slug, color: variant.color, size, qty }]}
          lines={[{ name: product.name, color: variant.color, size, qty, unitPrice: product.price }]}
          getRef={getRef}
        />
      )}
    </div>
  );
}
