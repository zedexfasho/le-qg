"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { buttonClasses } from "@/components/ui/styles";
import { formatPrice, formatSize } from "@/lib/format";
import { sizesOf, stockOf } from "@/lib/product";
import type { AdminProduct, OrderItem } from "@/lib/admin/types";
import type { Size } from "@/lib/types";
import { Field, inputClasses } from "./ui";

/** Ligne en cours d'édition (le prix vient toujours du catalogue côté serveur) */
export type EditableItem = Pick<OrderItem, "slug" | "name" | "color" | "size" | "qty" | "unitPrice">;

export function OrderItemsEditor({ products, items, onChange }: { products: AdminProduct[]; items: EditableItem[]; onChange: (items: EditableItem[]) => void }) {
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState<Size | "">("");
  const [qty, setQty] = useState(1);

  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);
  const product = bySlug.get(slug);
  const variant = product?.variants.find((v) => v.color === color);

  const stockFor = (item: Pick<EditableItem, "slug" | "color" | "size">) => {
    const v = bySlug.get(item.slug)?.variants.find((x) => x.color === item.color);
    return v ? stockOf(v, item.size) : 0;
  };

  const add = () => {
    if (!product || !variant || !size) return;
    const existing = items.find((i) => i.slug === slug && i.color === color && i.size === size);
    if (existing) onChange(items.map((i) => (i === existing ? { ...i, qty: i.qty + qty } : i)));
    else onChange([...items, { slug, name: product.name, color, size, qty, unitPrice: product.price }]);
    setSize("");
    setQty(1);
  };

  const setLineQty = (index: number, value: number) => {
    if (value <= 0) onChange(items.filter((_, i) => i !== index));
    else onChange(items.map((item, i) => (i === index ? { ...item, qty: Math.min(50, value) } : item)));
  };

  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {items.map((item, index) => {
            const stock = stockFor(item);
            return (
              <li key={`${item.slug}-${item.color}-${item.size}`} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{item.name}</p>
                  <p className="text-sm text-muted">
                    {item.color} · {formatSize(item.size)} · {formatPrice(item.unitPrice)}
                  </p>
                  {stock < item.qty && (
                    <p className="text-xs font-semibold text-accent-strong">
                      {stock === 0 ? "En rupture" : `Seulement ${stock} en stock`}
                    </p>
                  )}
                </div>
                <div className="inline-flex items-center rounded-full border border-line" role="group" aria-label={`Quantité de ${item.name}`}>
                  <button type="button" className="grid size-9 place-items-center" onClick={() => setLineQty(index, item.qty - 1)} aria-label="Diminuer">
                    <Minus className="size-4" />
                  </button>
                  <output className="w-7 text-center text-sm font-semibold">{item.qty}</output>
                  <button type="button" className="grid size-9 place-items-center" onClick={() => setLineQty(index, item.qty + 1)} aria-label="Augmenter">
                    <Plus className="size-4" />
                  </button>
                </div>
                <p className="w-24 text-right font-bold tabular-nums">{formatPrice(item.qty * item.unitPrice)}</p>
                <button type="button" onClick={() => setLineQty(index, 0)} className="grid size-9 place-items-center rounded-full hover:bg-ink/5" aria-label={`Retirer ${item.name}`}>
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
          <li className="flex justify-between px-3 py-2.5 font-bold">
            <span>Total articles</span>
            <span className="tabular-nums">{formatPrice(total)}</span>
          </li>
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm text-muted">Aucun article pour l&apos;instant.</p>
      )}

      <fieldset className="rounded-xl bg-surface-2/50 p-3">
        <legend className="sr-only">Ajouter un article</legend>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto_auto] sm:items-end">
          <Field label="Produit" htmlFor="pick-product">
            <select
              id="pick-product"
              value={slug}
              onChange={(e) => {
                const p = bySlug.get(e.target.value);
                setSlug(e.target.value);
                setColor(p?.variants[0]?.color ?? "");
                setSize("");
              }}
              className={inputClasses}
            >
              <option value="">Choisir…</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} — {formatPrice(p.price)}
                  {p.published ? "" : " (brouillon)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Couleur" htmlFor="pick-color">
            <select id="pick-color" value={color} onChange={(e) => (setColor(e.target.value), setSize(""))} disabled={!product} className={inputClasses}>
              {product?.variants.map((v) => (
                <option key={v.color} value={v.color}>
                  {v.color}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Taille" htmlFor="pick-size">
            <select id="pick-size" value={size} onChange={(e) => setSize(e.target.value as Size)} disabled={!variant} className={inputClasses}>
              <option value="">Choisir…</option>
              {variant &&
                sizesOf(variant).map((s) => (
                  <option key={s} value={s}>
                    {s} ({stockOf(variant, s)} en stock)
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Qté" htmlFor="pick-qty">
            <input id="pick-qty" type="number" min={1} max={50} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className={`${inputClasses} sm:w-20`} />
          </Field>
          <button type="button" onClick={add} disabled={!size} className={buttonClasses("secondary", "md")}>
            <Plus className="size-4" aria-hidden="true" /> Ajouter
          </button>
        </div>
      </fieldset>
    </div>
  );
}
