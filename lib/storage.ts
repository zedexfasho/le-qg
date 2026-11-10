/**
 * Accès sécurisé au localStorage.
 * En navigation privée, sur certains navigateurs ou si le stockage est plein,
 * localStorage lève une erreur : on bascule alors sur une mémoire temporaire.
 */
const memory = new Map<string, string>();

export function readStorage(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

export function writeStorage(key: string, value: string): void {
  memory.set(key, value);
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible : la valeur reste en mémoire pour cette visite.
  }
}
