"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { PayNowView } from "@/components/order/PayNow";
import { buttonClasses } from "@/components/ui/styles";
import { ApiError, api, useApi } from "@/lib/admin/api";
import { timeAgo } from "@/lib/admin/format";
import { formatPhone } from "@/lib/phone";
import { publicMobileMoney, waveLinkFor, type PaymentErrors, type PaymentSettings } from "@/lib/payment";
import { ErrorBox, Field, Loading, PageHeader, inputClasses, panelClasses, useToast } from "../ui";

interface Data {
  settings: PaymentSettings;
  updatedAt: string | null;
  updatedBy: string | null;
  telegram: boolean;
}

/** Les numéros s'affichent « 77 123 45 67 » dans le formulaire */
const toForm = (s: PaymentSettings): PaymentSettings => ({ ...s, wave: s.wave ? formatPhone(s.wave) : "", orangeMoney: s.orangeMoney ? formatPhone(s.orangeMoney) : "" });

function Toggle({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[var(--accent-strong)]" />
      {label}
    </label>
  );
}

export function PaymentSettingsPage() {
  const { data, error, loading, reload } = useApi<Data>("/settings/payment");
  const toast = useToast();
  // null = formulaire non modifié (on affiche les réglages enregistrés)
  const [edited, setEdited] = useState<PaymentSettings | null>(null);
  const [errors, setErrors] = useState<PaymentErrors & { password?: string }>({});
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (loading || !data) return <Loading />;

  const saved = toForm(data.settings);
  const form = edited ?? saved;
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = (patch: Partial<PaymentSettings>) => {
    setEdited({ ...form, ...patch });
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as keyof PaymentErrors];
      return next;
    });
  };
  const err = (k: keyof PaymentErrors | "password") => errors[k] && <p className="mt-1 text-sm font-semibold text-accent-strong">{errors[k]}</p>;
  const waveTest = waveLinkFor(form.waveLink, 100);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await api<Data & { changes: string[] }>("/settings/payment", { method: "PUT", body: { settings: form, password } });
      setEdited(null);
      setPassword("");
      setErrors({});
      toast.ok(res.changes.length ? "Enregistré. Le site affiche les nouveaux numéros d'ici une minute." : "Enregistré (rien n'a changé).");
      reload();
    } catch (e) {
      if (e instanceof ApiError && e.data.fields) setErrors(e.data.fields as PaymentErrors);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {toast.node}
      <Link href="/admin/reglages/" className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Réglages
      </Link>
      <PageHeader
        title="Paiement Wave / Orange Money"
        subtitle="Les numéros sur lesquels tes clients t'envoient l'argent. Ils s'affichent après la commande, sur la page de suivi et dans le message « commande confirmée ». Un changement ici est visible sur le site en une minute, sans republier."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <form onSubmit={save} className="space-y-5">
          <section className={panelClasses} aria-labelledby="pay-holder">
            <h2 id="pay-holder" className="mb-3 font-display text-lg font-bold">
              Compte
            </h2>
            <Field label="Nom affiché au client" htmlFor="pay-holder-input" hint="Le nom que le client voit dans Wave / Orange Money au moment de payer, pour être sûr d'envoyer au bon compte. Ex. « Le QG » ou ton prénom et nom.">
              <input id="pay-holder-input" value={form.holder} onChange={(e) => set({ holder: e.target.value })} maxLength={60} className={inputClasses} />
            </Field>
            {err("holder")}
          </section>

          <section className={panelClasses} aria-labelledby="pay-wave">
            <h2 id="pay-wave" className="sr-only">
              Wave
            </h2>
            <Toggle id="pay-wave-on" checked={form.waveEnabled} onChange={(v) => set({ waveEnabled: v })} label="Proposer Wave" />
            <div className={`mt-3 space-y-4 ${form.waveEnabled ? "" : "opacity-60"}`}>
              <div>
                <Field label="Numéro Wave" htmlFor="pay-wave-number">
                  <input
                    id="pay-wave-number"
                    type="tel"
                    inputMode="tel"
                    value={form.wave}
                    onChange={(e) => set({ wave: e.target.value })}
                    placeholder="77 123 45 67"
                    className={inputClasses}
                  />
                </Field>
                {err("wave")}
              </div>
              <div>
                <Field
                  label="Lien de paiement Wave Business (facultatif)"
                  htmlFor="pay-wave-link"
                  hint="Si tu as un compte Wave Business : copie ton lien de paiement (il commence par https://pay.wave.com/). Le client n'aura plus qu'à valider, le montant est rempli tout seul."
                >
                  <input
                    id="pay-wave-link"
                    type="url"
                    inputMode="url"
                    value={form.waveLink}
                    onChange={(e) => set({ waveLink: e.target.value.trim() })}
                    placeholder="https://pay.wave.com/m/…"
                    autoCapitalize="off"
                    spellCheck={false}
                    className={inputClasses}
                  />
                </Field>
                {err("waveLink")}
                {waveTest && (
                  <a href={waveTest} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline underline-offset-4">
                    <ExternalLink className="size-4" aria-hidden="true" /> Tester le lien (100 FCFA, sans payer)
                  </a>
                )}
              </div>
            </div>
          </section>

          <section className={panelClasses} aria-labelledby="pay-om">
            <h2 id="pay-om" className="sr-only">
              Orange Money
            </h2>
            <Toggle id="pay-om-on" checked={form.orangeMoneyEnabled} onChange={(v) => set({ orangeMoneyEnabled: v })} label="Proposer Orange Money" />
            <div className={`mt-3 ${form.orangeMoneyEnabled ? "" : "opacity-60"}`}>
              <Field label="Numéro Orange Money" htmlFor="pay-om-number">
                <input
                  id="pay-om-number"
                  type="tel"
                  inputMode="tel"
                  value={form.orangeMoney}
                  onChange={(e) => set({ orangeMoney: e.target.value })}
                  placeholder="77 123 45 67"
                  className={inputClasses}
                />
              </Field>
              {err("orangeMoney")}
            </div>
          </section>
          <p className="text-sm text-muted">Un moyen désactivé n&apos;est plus proposé dans le formulaire de commande. Le paiement à la livraison reste toujours possible.</p>

          <section className={panelClasses} aria-labelledby="pay-confirm">
            <h2 id="pay-confirm" className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
              <ShieldCheck className="size-5 text-accent-strong" aria-hidden="true" /> Confirmer
            </h2>
            <p className="mb-3 text-sm text-muted">Ces numéros reçoivent l&apos;argent des clients : ton mot de passe est redemandé à chaque changement.</p>
            <Field label="Ton mot de passe" htmlFor="pay-password">
              <input
                id="pay-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((e) => ({ ...e, password: undefined }));
                }}
                className={inputClasses}
              />
            </Field>
            {err("password")}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="submit" disabled={busy || !dirty || !password} className={buttonClasses("primary", "md")}>
                {busy ? "Enregistrement…" : "Enregistrer"}
              </button>
              {dirty && (
                <button
                  type="button"
                  onClick={() => {
                    setEdited(null);
                    setErrors({});
                  }}
                  className={buttonClasses("ghost", "md")}
                >
                  Annuler les changements
                </button>
              )}
            </div>
          </section>
        </form>

        <aside className="space-y-4" aria-label="Aperçu et historique">
          <div>
            <h2 className="mb-2 font-display text-lg font-bold">Ce que voit le client</h2>
            {publicMobileMoney(form).wave || publicMobileMoney(form).waveLink || publicMobileMoney(form).orangeMoney ? (
              <PayNowView orderRef="QG-EXEMPLE" amount={15000} preferred="wave" config={publicMobileMoney(form)} />
            ) : (
              <p className={`${panelClasses} text-sm text-muted`}>Aucun numéro actif : le client ne voit pas de bloc de paiement, il paie à la livraison (ou tu lui envoies le numéro sur WhatsApp).</p>
            )}
          </div>
          <div className={`${panelClasses} text-sm`}>
            {data.updatedAt ? (
              <p>
                Dernière modification par <span className="font-semibold">{data.updatedBy ?? "?"}</span>, {timeAgo(data.updatedAt)}.
              </p>
            ) : (
              <p className="text-muted">Jamais configuré.</p>
            )}
            {data.telegram ? (
              <p className="mt-2 text-muted">Chaque changement t&apos;est signalé sur Telegram.</p>
            ) : (
              <p className="mt-2 flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden="true" />
                <span>Branche les alertes Telegram (README) pour être prévenu si quelqu&apos;un de l&apos;équipe change ces numéros.</span>
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
