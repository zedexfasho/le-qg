"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generateOrderRef, type OrderItemInput } from "./orders";
import type { Product } from "./types";

/**
 * Enregistrement des commandes du site, sans rien changer pour le client :
 * le bouton « Commander sur WhatsApp » reste un simple lien. Au clic, on ajoute
 * une référence au message et on l'envoie à l'API en arrière-plan.
 * Si l'API ne répond pas, WhatsApp s'ouvre quand même : la vente n'est jamais bloquée.
 */
export function registerOrder(ref: string, items: readonly OrderItemInput[]): void {
  if (!items.length) return;
  try {
    void fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref, items }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // navigateur ancien : on ignore
  }
}

/**
 * Référence stable pour un écran donné : un deuxième clic renvoie la même
 * référence (pas de doublon dans le dashboard).
 */
export function useOrderRef(): () => string {
  const ref = useRef<string | null>(null);
  return () => (ref.current ??= generateOrderRef());
}

type StockMap = Record<string, Record<string, Product["variants"][number]["stock"]>>;
let livePromise: Promise<{ stock: StockMap; prices: Record<string, number> } | null> | null = null;

function fetchLive() {
  livePromise ??= fetch("/api/stock")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return livePromise;
}

/** Applique le stock et les prix en direct (base de données) à des produits du site statique */
export function withLiveData(products: readonly Product[], live: { stock: StockMap; prices: Record<string, number> } | null): Product[] {
  if (!live) return [...products];
  return products.map((p) => {
    const stock = live.stock[p.slug];
    const price = live.prices[p.slug];
    if (!stock && price === undefined) return p;
    return {
      ...p,
      ...(typeof price === "number" ? { price } : {}),
      variants: p.variants.map((v) => (stock?.[v.color] ? { ...v, stock: stock[v.color] } : v)),
    };
  });
}

/**
 * Le site est publié en fichiers statiques : entre deux publications, le stock affiché
 * peut avoir changé (commandes confirmées). Ce hook le corrige dès l'ouverture de la page.
 */
export function useLiveProducts(products: readonly Product[]): Product[] {
  const live = useLiveData();
  return useMemo(() => withLiveData(products, live), [products, live]);
}

export function useLiveProduct(product: Product): Product {
  const live = useLiveData();
  return useMemo(() => withLiveData([product], live)[0], [product, live]);
}

function useLiveData() {
  const [live, setLive] = useState<{ stock: StockMap; prices: Record<string, number> } | null>(null);
  useEffect(() => {
    let active = true;
    void fetchLive().then((data) => {
      if (active) setLive(data);
    });
    return () => {
      active = false;
    };
  }, []);
  return live;
}
