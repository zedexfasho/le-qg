"use client";

import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders";

/* Petits composants partagés par les pages du dashboard */

export const inputClasses =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink placeholder:text-muted/70 focus:border-accent-strong focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60 sm:text-sm";
export const labelClasses = "mb-1 block text-sm font-semibold";
export const panelClasses = "rounded-2xl border border-line bg-surface p-4 sm:p-5";

const STATUS_STYLES: Record<OrderStatus, string> = {
  nouvelle: "bg-[#FDE0AF] text-[#5A2E17] dark:bg-[#5A2E17] dark:text-[#FDE0AF]",
  confirmee: "bg-[#DCE8FB] text-[#173B7A] dark:bg-[#1C3157] dark:text-[#CFE0FF]",
  en_livraison: "bg-[#EADCFB] text-[#4B2380] dark:bg-[#3A2257] dark:text-[#E6D5FF]",
  livree: "bg-[#D5F2DF] text-[#165A2F] dark:bg-[#17402A] dark:text-[#C8F0D6]",
  annulee: "bg-[#F9D9D6] text-[#8A1F14] dark:bg-[#4E1A14] dark:text-[#FFD3CC]",
  sans_suite: "bg-[#ECE6E1] text-[#5A4A40] dark:bg-[#3A302A] dark:text-[#E3D9D1]",
};

export function StatusBadge({ status, className = "" }: { status: OrderStatus; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[status]} ${className}`}>{STATUS_LABELS[status]}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Loading({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted" role="status">
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E8A39A] bg-[#FCEDEA] p-4 text-sm text-[#7A1C12] dark:border-[#7A2A20] dark:bg-[#3A140F] dark:text-[#FFD3CC]" role="alert">
      <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-4">
          Réessayer
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClasses}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Message temporaire (succès / erreur) en bas de l'écran */
export function useToast() {
  const [toast, setToast] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.kind === "ok" ? 3000 : 6000);
    return () => clearTimeout(t);
  }, [toast]);
  const node = toast ? (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className={`fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-start gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-warm-lg lg:bottom-6 ${
        toast.kind === "ok" ? "bg-brown text-cream dark:bg-cream dark:text-brown" : "bg-[#8A1F14] text-white"
      }`}
    >
      {toast.kind === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <span className="flex-1">{toast.text}</span>
      <button type="button" onClick={() => setToast(null)} aria-label="Fermer">
        <X className="size-4" />
      </button>
    </div>
  ) : null;
  return {
    node,
    ok: (text: string) => setToast({ kind: "ok", text }),
    error: (text: string) => setToast({ kind: "error", text }),
  };
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "accent" }) {
  return (
    <div className={`${panelClasses} ${tone === "accent" ? "border-accent/50 bg-[#FFF4E6] dark:bg-[#3A1D0E]" : ""}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
