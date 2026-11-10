"use client";

import { useSyncExternalStore } from "react";
import { addLine, cartCount, parseCart, removeLine, setLineQty } from "./cart";
import { readStorage, writeStorage } from "./storage";
import type { CartItem } from "./types";

/**
 * Panier partagé par toutes les pages, stocké dans le navigateur.
 * Basé sur useSyncExternalStore : pas de Provider à placer dans l'arbre.
 */
const KEY = "leqg-panier-v1";
const EMPTY: CartItem[] = [];

let items: CartItem[] | null = null;
const listeners = new Set<() => void>();

function load(): CartItem[] {
  if (items === null) items = parseCart(readStorage(KEY));
  return items;
}

function commit(next: CartItem[]): void {
  items = next;
  writeStorage(KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Synchronise les onglets ouverts en même temps
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      items = parseCart(event.newValue);
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const cart = {
  add(item: CartItem, maxQty: number) {
    commit(addLine(load(), item, maxQty));
  },
  setQty(item: CartItem, qty: number, maxQty: number) {
    commit(setLineQty(load(), item, qty, maxQty));
  },
  remove(item: CartItem) {
    commit(removeLine(load(), item));
  },
  clear() {
    commit([]);
  },
};

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

export function useCartCount(): number {
  return cartCount(useCart());
}

const noopSubscribe = () => () => {};

/** `false` pendant le rendu serveur et l'hydratation, `true` ensuite */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
