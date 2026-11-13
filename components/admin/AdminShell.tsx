"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ExternalLink, Home, LogOut, Package, Settings, ShoppingBag, Users } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { api, LOGIN_PATH } from "@/lib/admin/api";
import type { AdminUser } from "@/lib/admin/types";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { Loading } from "./ui";

const UserContext = createContext<AdminUser | null>(null);
export const useAdminUser = () => useContext(UserContext);

interface PendingOrders {
  /** Commandes au statut « Nouvelle » */
  count: number;
  /** Change à chaque nouvelle commande : les pages s'en servent pour se rafraîchir */
  signal: string;
}
const PendingContext = createContext<PendingOrders>({ count: 0, signal: "" });
/** Commandes à confirmer, rafraîchi toutes les 45 s tant que le dashboard est affiché */
export const usePendingOrders = () => useContext(PendingContext);

function usePendingPoll(enabled: boolean): PendingOrders {
  const [state, setState] = useState<PendingOrders>({ count: 0, signal: "" });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      api<{ nouvelles: number; latest: string | null }>("/orders/pending").then(
        (r) => {
          if (!active) return;
          const signal = `${r.nouvelles}|${r.latest ?? ""}`;
          setState((s) => (s.signal === signal ? s : { count: r.nouvelles, signal }));
        },
        () => undefined,
      );
    };
    check();
    const timer = setInterval(check, 45_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [enabled]);
  return state;
}

/** Pastille « n commandes à confirmer » */
function CountBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={`grid min-w-5 place-items-center rounded-full bg-orange-deep px-1.5 text-[11px] leading-5 font-bold text-cream ${className}`}>
      {count > 99 ? "99+" : count}
      <span className="sr-only"> à confirmer</span>
    </span>
  );
}

const NAV = [
  { href: "/admin/", label: "Accueil", icon: Home, match: (p: string) => p === "/admin/" },
  { href: "/admin/commandes/", label: "Commandes", icon: ShoppingBag, match: (p: string) => p.startsWith("/admin/commande") },
  { href: "/admin/clients/", label: "Clients", icon: Users, match: (p: string) => p.startsWith("/admin/client") },
  { href: "/admin/produits/", label: "Produits", icon: Package, match: (p: string) => p.startsWith("/admin/produit") },
  { href: "/admin/analyses/", label: "Analyses", icon: BarChart3, match: (p: string) => p.startsWith("/admin/analyses") },
  { href: "/admin/reglages/", label: "Réglages", icon: Settings, match: (p: string) => p.startsWith("/admin/reglages") },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/admin/";
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const pending = usePendingPoll(!!user && !user.mustChangePassword);

  // Onglet du navigateur : « (3) Commandes | Dashboard Le QG »
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\) /, "");
    document.title = pending.count > 0 ? `(${pending.count > 99 ? "99+" : pending.count}) ${base}` : base;
  }, [pending.count, pathname]);

  useEffect(() => {
    api<{ user: AdminUser }>("/me")
      .then(({ user }) => setUser(user))
      .catch(() => undefined)
      .finally(() => setChecking(false));
  }, []);

  const logout = async () => {
    await api("/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign(LOGIN_PATH);
  };

  if (checking || !user) return <Loading label={checking ? "Chargement du dashboard…" : "Redirection vers la connexion…"} />;

  if (user.mustChangePassword) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <Logo variant="wordmark" width={130} className="mx-auto mb-6 block w-fit" />
        <h1 className="font-display text-2xl font-bold">Bienvenue {user.name} 👋</h1>
        <p className="mt-2 mb-6 text-sm text-muted">Pour commencer, choisis ton propre mot de passe (le mot de passe provisoire ne marchera plus).</p>
        <ChangePasswordForm onDone={() => setUser({ ...user, mustChangePassword: false })} />
      </div>
    );
  }

  return (
    <UserContext.Provider value={user}>
      <PendingContext.Provider value={pending}>
      <div className="flex min-h-dvh flex-1">
        {/* Navigation ordinateur */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
          <Link href="/admin/" className="mb-6 px-3" aria-label="Le QG — accueil du dashboard">
            <Logo variant="wordmark" width={104} className="block" />
          </Link>
          <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon, match }) => {
              const active = match(pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-accent-strong text-on-accent" : "hover:bg-ink/5"}`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {label}
                  {href === "/admin/commandes/" && <CountBadge count={pending.count} className="ml-auto" />}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-line pt-3 text-sm">
            <p className="truncate px-3 font-semibold">{user.name}</p>
            <p className="truncate px-3 text-xs text-muted">{user.email}</p>
            <a href="/" target="_blank" rel="noopener" className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-ink/5">
              <ExternalLink className="size-4" aria-hidden="true" /> Voir le site
            </a>
            <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-ink/5">
              <LogOut className="size-4" aria-hidden="true" /> Se déconnecter
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* En-tête mobile */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-2 backdrop-blur lg:hidden">
            <Link href="/admin/" aria-label="Le QG — accueil du dashboard">
              <Logo variant="wordmark" width={84} className="block" />
            </Link>
            <button type="button" onClick={logout} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold hover:bg-ink/5">
              <LogOut className="size-4" aria-hidden="true" /> Sortir
            </button>
          </header>

          <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:pb-10">
            {children}
          </main>
        </div>

        {/* Navigation mobile (pouce) */}
        <nav aria-label="Dashboard" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
          {NAV.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? "text-accent-strong" : "text-muted"}`}
              >
                <span className="relative">
                  <Icon className="size-5" aria-hidden="true" />
                  {href === "/admin/commandes/" && <CountBadge count={pending.count} className="absolute -top-1.5 left-3" />}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      </PendingContext.Provider>
    </UserContext.Provider>
  );
}
