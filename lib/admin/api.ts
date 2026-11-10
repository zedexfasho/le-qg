"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

/** Erreur renvoyée par l'API, avec les détails éventuels (ex. ruptures de stock) */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const LOGIN_PATH = "/admin/connexion/";

function goToLogin() {
  if (typeof window === "undefined" || window.location.pathname.startsWith(LOGIN_PATH)) return;
  const back = window.location.pathname + window.location.search;
  // Hors composant React : navigation complète (la session a expiré)
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${LOGIN_PATH}?retour=${encodeURIComponent(back)}`);
}

/** Appel à l'API du dashboard (/api/admin/...) */
export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, {
      method: options.method ?? (options.body || options.form ? "POST" : "GET"),
      credentials: "same-origin",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.form ?? (options.body ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new ApiError(0, "Pas de connexion internet. Réessaie dans un instant.");
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401 && path !== "/login") {
    goToLogin();
    throw new ApiError(401, "Connexion requise.");
  }
  if (!res.ok) throw new ApiError(res.status, typeof data.error === "string" ? data.error : `Erreur ${res.status}`, data);
  return data as T;
}

/**
 * Chargement de données avec état (chargement / erreur / recharger).
 * Les données précédentes restent affichées pendant un nouveau chargement (filtres, pages).
 */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  const [version, setVersion] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const key = `${path}#${version}`;

  useEffect(() => {
    if (!path) return;
    let active = true;
    api<T>(path)
      .then(
        (data) => active && setState({ data, error: null }),
        (err: Error) => active && setState((s) => ({ data: s.data, error: err.message })),
      )
      .finally(() => active && setDone(`${path}#${version}`));
    return () => {
      active = false;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData: Dispatch<SetStateAction<T | null>> = useCallback(
    (update) => setState((s) => ({ ...s, data: typeof update === "function" ? (update as (prev: T | null) => T | null)(s.data) : update })),
    [],
  );
  return { data: state.data, error: state.error, loading: !!path && done !== key, reload, setData };
}
