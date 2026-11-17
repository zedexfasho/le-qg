"use client";

import { Bell, KeyRound, Rocket, Tag, Truck, UserPlus, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/styles";
import { api, useApi } from "@/lib/admin/api";
import { timeAgo } from "@/lib/admin/format";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/team";
import { useAdminUser } from "../AdminShell";
import { ChangePasswordForm } from "../ChangePasswordForm";
import { PublishButton } from "../PublishButton";
import { ErrorBox, Field, Loading, PageHeader, inputClasses, panelClasses, useToast } from "../ui";

interface Member {
  id: number;
  email: string;
  name: string;
  role: Role;
  active: number;
  must_change_password: number;
  last_login_at: string | null;
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Users; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
      <Icon className="size-5" aria-hidden="true" /> {children}
    </h2>
  );
}

export function SettingsPage() {
  const me = useAdminUser();
  const team = useApi<{ users: Member[] }>("/users");
  const status = useApi<{ telegram: boolean }>("/publish");
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [busy, setBusy] = useState(false);
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ temporaryPassword: string }>("/users", { body: { email, name, role } });
      setTemp({ email, password: res.temporaryPassword });
      setEmail("");
      setName("");
      setRole("admin");
      void team.reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const update = async (member: Member, body: { active?: boolean; resetPassword?: boolean; role?: Role }) => {
    if (body.active === false && !window.confirm(`Retirer l'accès de ${member.name} ?`)) return;
    if (body.resetPassword && !window.confirm(`Créer un nouveau mot de passe provisoire pour ${member.name} ?`)) return;
    try {
      const res = await api<{ temporaryPassword?: string }>(`/users/${member.id}`, { method: "PATCH", body });
      if (res.temporaryPassword) setTemp({ email: member.email, password: res.temporaryPassword });
      else if (body.role) toast.ok(`${member.name} : ${ROLE_LABELS[body.role]}.`);
      else toast.ok(body.active ? "Accès réactivé." : "Accès retiré.");
      void team.reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const testAlert = async () => {
    try {
      await api("/notify/test", { method: "POST" });
      toast.ok("Message de test envoyé sur Telegram.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <>
      {toast.node}
      <PageHeader title="Réglages" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className={`${panelClasses} lg:col-span-2`} aria-labelledby="team-title">
          <h2 id="team-title" className="sr-only">
            Équipe
          </h2>
          <SectionTitle icon={Users}>Équipe</SectionTitle>
          {team.error && <ErrorBox message={team.error} onRetry={team.reload} />}
          {!team.data && !team.error && <Loading />}
          {team.data && (
            <ul className="mb-4 divide-y divide-line rounded-xl border border-line">
              {team.data.users.map((m) => (
                <li key={m.id} className={`flex flex-wrap items-center gap-3 px-3 py-2.5 ${m.active ? "" : "opacity-60"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {m.name} {m.id === me?.id && <span className="text-sm font-normal text-muted">(toi)</span>}
                      {m.role === "livreur" && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 align-middle text-xs font-semibold">
                          <Truck className="size-3" aria-hidden="true" /> Livreur
                        </span>
                      )}
                      {!m.active && <span className="ml-2 text-xs font-semibold">Accès retiré</span>}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {m.email} · {m.last_login_at ? `vu ${timeAgo(m.last_login_at)}` : "jamais connecté"}
                      {m.must_change_password ? " · mot de passe provisoire" : ""}
                    </p>
                  </div>
                  {m.id !== me?.id && (
                    <div className="flex flex-wrap gap-2">
                      {m.active ? (
                        <>
                          <select
                            aria-label={`Rôle de ${m.name}`}
                            value={m.role}
                            onChange={(e) => update(m, { role: e.target.value as Role })}
                            className={`${inputClasses} w-auto`}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r === "admin" ? "Admin" : "Livreur"}
                              </option>
                            ))}
                          </select>
                          <button type="button" onClick={() => update(m, { resetPassword: true })} className={buttonClasses("ghost", "md")}>
                            Nouveau mot de passe
                          </button>
                          <button type="button" onClick={() => update(m, { active: false })} className={buttonClasses("secondary", "md")}>
                            Retirer l&apos;accès
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => update(m, { active: true })} className={buttonClasses("secondary", "md")}>
                          Réactiver
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {temp && (
            <div className="mb-4 rounded-xl border border-accent/50 bg-[#FFF4E6] p-4 text-sm dark:bg-[#3A1D0E]" role="status">
              <p className="font-semibold">Mot de passe provisoire pour {temp.email} :</p>
              <p className="my-2 font-mono text-xl font-bold tracking-wider select-all">{temp.password}</p>
              <p className="text-muted">
                Envoie-le à la personne (en privé). Elle choisira son propre mot de passe à la première connexion sur <span className="font-semibold">/admin/connexion/</span>. Il ne sera plus affiché ensuite.
              </p>
              <button type="button" onClick={() => setTemp(null)} className="mt-2 font-semibold underline">
                C&apos;est noté
              </button>
            </div>
          )}

          <form onSubmit={invite} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <Field label="Prénom" htmlFor="inv-name">
              <input id="inv-name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Email" htmlFor="inv-email">
              <input id="inv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Accès" htmlFor="inv-role">
              <select id="inv-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClasses}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </Field>
            <button type="submit" disabled={busy} className={buttonClasses("primary", "md")}>
              <UserPlus className="size-4" aria-hidden="true" /> Donner l&apos;accès
            </button>
          </form>
          <p className="mt-3 text-sm text-muted">
            Un livreur ne voit que la page <span className="font-semibold">Livraisons</span> : les commandes confirmées, l&apos;adresse, le téléphone et la somme à encaisser.
          </p>
        </section>

        <section className={panelClasses} aria-labelledby="paiement-title">
          <h2 id="paiement-title" className="sr-only">
            Paiement
          </h2>
          <SectionTitle icon={Wallet}>Paiement Wave / Orange Money</SectionTitle>
          <p className="mb-3 text-sm text-muted">Les numéros qui reçoivent l&apos;argent des clients. À changer ici si tu changes de numéro : le site se met à jour tout seul.</p>
          <Link href="/admin/paiement/" className={buttonClasses("primary", "md")}>
            <Wallet className="size-4" aria-hidden="true" /> Régler les numéros
          </Link>
        </section>

        <section className={panelClasses} aria-labelledby="promo-title">
          <h2 id="promo-title" className="sr-only">
            Codes promo
          </h2>
          <SectionTitle icon={Tag}>Codes promo</SectionTitle>
          <p className="mb-3 text-sm text-muted">Crée des codes pour tes influenceurs ou tes clients fidèles et vois combien de ventes chacun rapporte.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/promos/" className={buttonClasses("primary", "md")}>
              <Tag className="size-4" aria-hidden="true" /> Gérer les codes promo
            </Link>
            <Link href="/admin/livraisons/" className={buttonClasses("secondary", "md")}>
              <Truck className="size-4" aria-hidden="true" /> Voir la page livreur
            </Link>
          </div>
        </section>

        <section className={panelClasses} aria-labelledby="pw-title">
          <h2 id="pw-title" className="sr-only">
            Mon mot de passe
          </h2>
          <SectionTitle icon={KeyRound}>Mon mot de passe</SectionTitle>
          <ChangePasswordForm onDone={() => toast.ok("Mot de passe changé.")} />
        </section>

        <div className="space-y-5">
          <section className={panelClasses} aria-labelledby="alert-title">
            <h2 id="alert-title" className="sr-only">
              Alertes
            </h2>
            <SectionTitle icon={Bell}>Alertes nouvelles commandes</SectionTitle>
            {status.data?.telegram ? (
              <>
                <p className="mb-3 text-sm">✅ Telegram est branché : chaque commande du site t&apos;envoie un message.</p>
                <button type="button" onClick={testAlert} className={buttonClasses("secondary", "md")}>
                  Envoyer un message de test
                </button>
              </>
            ) : (
              <p className="text-sm text-muted">
                Pas encore branché. Les alertes arrivent sur Telegram (gratuit, instantané). La marche à suivre (5 minutes) est dans le README, section « Alerte Telegram à chaque nouvelle commande ».
              </p>
            )}
          </section>

          <section className={panelClasses} aria-labelledby="pub-title">
            <h2 id="pub-title" className="sr-only">
              Publication
            </h2>
            <SectionTitle icon={Rocket}>Publication du site</SectionTitle>
            <p className="mb-3 text-sm text-muted">Met en ligne les nouveaux produits, photos et textes. Le stock et les prix, eux, sont toujours à jour sans publier.</p>
            <PublishButton />
          </section>
        </div>
      </div>
    </>
  );
}
