"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/styles";
import { ApiError, api, useApi } from "@/lib/admin/api";
import { formatDate, formatPrice } from "@/lib/format";
import { describePromo, todayInDakar, type Promo, type PromoErrors } from "@/lib/promo";
import { EmptyState, ErrorBox, Field, Loading, PageHeader, inputClasses, panelClasses, useToast } from "../ui";

type AdminPromo = Promo & { createdAt: string; uses: number; validated: number; revenue: number; discounts: number };

interface Form {
  code: string;
  kind: Promo["kind"];
  value: string;
  label: string;
  minSubtotal: string;
  maxUses: string;
  firstOrderOnly: boolean;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

const EMPTY: Form = { code: "", kind: "percent", value: "", label: "", minSubtotal: "", maxUses: "", firstOrderOnly: false, startsAt: "", endsAt: "", active: true };

const toForm = (p: Promo): Form => ({
  code: p.code,
  kind: p.kind,
  value: String(p.value),
  label: p.label ?? "",
  minSubtotal: p.minSubtotal ? String(p.minSubtotal) : "",
  maxUses: p.maxUses === null ? "" : String(p.maxUses),
  firstOrderOnly: p.firstOrderOnly,
  startsAt: p.startsAt ?? "",
  endsAt: p.endsAt ?? "",
  active: p.active,
});

/** État affiché : ce que voit le client s'il tape le code aujourd'hui */
function state(p: AdminPromo): { label: string; tone: string } {
  const today = todayInDakar();
  const green = "bg-[#DDEFD9] text-[#1F4D17] dark:bg-[#1F3A1A] dark:text-[#CDEBC6]";
  const grey = "bg-ink/8 text-muted";
  if (!p.active) return { label: "Désactivé", tone: grey };
  if (p.endsAt && today > p.endsAt) return { label: "Expiré", tone: grey };
  if (p.startsAt && today < p.startsAt) return { label: `À partir du ${formatDate(p.startsAt)}`, tone: grey };
  if (p.maxUses !== null && p.uses >= p.maxUses) return { label: "Épuisé", tone: grey };
  return { label: "Actif", tone: green };
}

function conditions(p: Promo): string {
  const parts: string[] = [];
  if (p.minSubtotal) parts.push(`dès ${formatPrice(p.minSubtotal)}`);
  if (p.firstOrderOnly) parts.push("1re commande");
  if (p.maxUses !== null) parts.push(`${p.maxUses} utilisation${p.maxUses > 1 ? "s" : ""} max`);
  if (p.endsAt) parts.push(`jusqu'au ${formatDate(p.endsAt)}`);
  parts.push("1 fois par client");
  return parts.join(" · ");
}

/** Montant sur deux lignes (« 28 800 » / « FCFA ») pour tenir dans les petites cases */
function Amount({ value }: { value: number }) {
  return (
    <>
      {formatPrice(value).replace(/\s*FCFA$/, "")}
      <span className="block text-xs font-normal text-muted">FCFA</span>
    </>
  );
}

export function PromosPage() {
  const { data, error, loading, reload } = useApi<{ promos: AdminPromo[] }>("/promos");
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<PromoErrors>({});
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<Form>) => {
    setForm((f) => (f ? { ...f, ...patch } : f));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as keyof PromoErrors];
      return next;
    });
  };

  const open = (p?: AdminPromo) => {
    setForm(p ? toForm(p) : EMPTY);
    setEditing(p?.code ?? null);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      const body = { ...form, value: form.value, minSubtotal: form.minSubtotal || 0, maxUses: form.maxUses || null, startsAt: form.startsAt || null, endsAt: form.endsAt || null };
      if (editing) await api(`/promos/${editing}`, { method: "PUT", body });
      else await api("/promos", { body });
      toast.ok(editing ? "Code modifié." : `Code ${form.code.toUpperCase()} créé.`);
      setForm(null);
      setEditing(null);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.data.fields) setErrors(err.data.fields as PromoErrors);
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (p: AdminPromo) => {
    try {
      await api(`/promos/${p.code}`, { method: "PUT", body: { active: !p.active } });
      toast.ok(p.active ? `${p.code} désactivé.` : `${p.code} réactivé.`);
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const remove = async (p: AdminPromo) => {
    if (!window.confirm(`Supprimer le code ${p.code} ?`)) return;
    try {
      await api(`/promos/${p.code}`, { method: "DELETE" });
      toast.ok("Code supprimé.");
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const err = (k: keyof PromoErrors) => errors[k] && <p className="mt-1 text-sm font-semibold text-accent-strong">{errors[k]}</p>;

  return (
    <>
      {toast.node}
      <Link href="/admin/reglages/" className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Réglages
      </Link>
      <PageHeader
        title="Codes promo"
        subtitle="Une remise que le client tape au moment de commander sur le site. Un code par influenceur te dit qui fait vraiment vendre."
        actions={
          !form && (
            <button type="button" onClick={() => open()} className={buttonClasses("primary", "md")}>
              <Plus className="size-4" aria-hidden="true" /> Nouveau code
            </button>
          )
        }
      />

      {form && (
        <form onSubmit={save} className={`${panelClasses} mb-6 space-y-4`} aria-label={editing ? `Modifier ${editing}` : "Nouveau code promo"} noValidate>
          <h2 className="font-display text-lg font-bold">{editing ? `Modifier ${editing}` : "Nouveau code"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" htmlFor="p-code" hint={editing ? "Le code ne change pas (il figure déjà dans des commandes)." : "Ce que le client tape, ex. AWA10, NOEL, BIENVENUE."}>
              <input
                id="p-code"
                value={form.code}
                disabled={!!editing}
                onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })}
                maxLength={20}
                autoCapitalize="characters"
                aria-invalid={!!errors.code}
                className={`${inputClasses} font-semibold tracking-wide uppercase`}
              />
              {err("code")}
            </Field>
            <Field label="Pour qui ? (interne)" htmlFor="p-label" hint="Jamais montré au client. Ex. « Influenceuse Awa », « Soirée drop ».">
              <input id="p-label" value={form.label} onChange={(e) => set({ label: e.target.value })} maxLength={60} className={inputClasses} />
              {err("label")}
            </Field>
            <fieldset>
              <legend className="mb-1 block text-sm font-semibold">Remise</legend>
              <div className="flex gap-2">
                <select value={form.kind} onChange={(e) => set({ kind: e.target.value as Form["kind"] })} aria-label="Type de remise" className={`${inputClasses} w-36`}>
                  <option value="percent">en %</option>
                  <option value="fixed">en FCFA</option>
                </select>
                <input
                  value={form.value}
                  onChange={(e) => set({ value: e.target.value.replace(/[^\d]/g, "") })}
                  inputMode="numeric"
                  aria-label={form.kind === "percent" ? "Pourcentage" : "Montant en FCFA"}
                  placeholder={form.kind === "percent" ? "10" : "2000"}
                  aria-invalid={!!errors.value}
                  className={inputClasses}
                />
              </div>
              {err("value")}
              {err("kind")}
            </fieldset>
            <Field label="Montant minimum d'articles (facultatif)" htmlFor="p-min">
              <input id="p-min" value={form.minSubtotal} onChange={(e) => set({ minSubtotal: e.target.value.replace(/[^\d]/g, "") })} inputMode="numeric" placeholder="0" className={inputClasses} />
              {err("minSubtotal")}
            </Field>
            <Field label="Valable du (facultatif)" htmlFor="p-start">
              <input id="p-start" type="date" value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} className={inputClasses} />
              {err("startsAt")}
            </Field>
            <Field label="Jusqu'au (facultatif)" htmlFor="p-end">
              <input id="p-end" type="date" value={form.endsAt} onChange={(e) => set({ endsAt: e.target.value })} className={inputClasses} />
              {err("endsAt")}
            </Field>
            <Field label="Nombre total d'utilisations (facultatif)" htmlFor="p-max" hint="Vide = illimité. Chaque client ne peut l'utiliser qu'une fois.">
              <input id="p-max" value={form.maxUses} onChange={(e) => set({ maxUses: e.target.value.replace(/[^\d]/g, "") })} inputMode="numeric" className={inputClasses} />
              {err("maxUses")}
            </Field>
            <div className="space-y-3 sm:pt-6">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.firstOrderOnly} onChange={(e) => set({ firstOrderOnly: e.target.checked })} className="size-5 accent-[var(--accent-strong)]" />
                Réservé à une première commande
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} className="size-5 accent-[var(--accent-strong)]" />
                Actif
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className={buttonClasses("primary", "md")}>
              {busy ? "Enregistrement…" : editing ? "Enregistrer" : "Créer le code"}
            </button>
            <button type="button" onClick={() => (setForm(null), setEditing(null))} className={buttonClasses("ghost", "md")}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && data.promos.length === 0 && !form && (
        <EmptyState title="Aucun code promo">Crée par exemple un code par influenceur (AWA10) ou un code de bienvenue pour la première commande.</EmptyState>
      )}
      {data && data.promos.length > 0 && (
        <ul className="grid gap-3 lg:grid-cols-2">
          {data.promos.map((p) => {
            const st = state(p);
            return (
              <li key={p.code} className={panelClasses}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <Tag className="size-4 text-accent-strong" aria-hidden="true" />
                      <span className="font-mono text-lg font-bold tracking-wide">{p.code}</span>
                      <span className="font-semibold">{describePromo(p)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.tone}`}>{st.label}</span>
                    </p>
                    {p.label && <p className="text-sm">{p.label}</p>}
                    <p className="text-xs text-muted">{conditions(p)}</p>
                  </div>
                  <div className="-mt-2 -mr-2 flex shrink-0">
                    <button type="button" onClick={() => open(p)} className="grid size-11 place-items-center rounded-full hover:bg-ink/5" aria-label={`Modifier ${p.code}`}>
                      <Pencil className="size-4" />
                    </button>
                    {p.uses === 0 && (
                      <button type="button" onClick={() => remove(p)} className="grid size-11 place-items-center rounded-full hover:bg-ink/5" aria-label={`Supprimer ${p.code}`}>
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl leading-tight bg-surface-2 p-3 text-center text-sm">
                  <div>
                    <dt className="text-xs text-muted">Commandes validées</dt>
                    <dd className="font-display text-xl font-bold tabular-nums">{p.validated}</dd>
                    {p.uses > p.validated && <dd className="text-xs text-muted">+{p.uses - p.validated} en attente</dd>}
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Ventes générées</dt>
                    <dd className="font-display text-xl font-bold tabular-nums">
                      <Amount value={p.revenue} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Remises offertes</dt>
                    <dd className="font-display text-xl font-bold tabular-nums">
                      <Amount value={p.discounts} />
                    </dd>
                  </div>
                </dl>
                <button type="button" onClick={() => toggle(p)} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">
                  {p.active ? "Désactiver" : "Réactiver"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
