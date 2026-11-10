"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/styles";
import { api } from "@/lib/admin/api";
import { ErrorBox, Field, inputClasses } from "./ui";

/** Retour uniquement vers une page du dashboard (pas de redirection vers un autre site) */
function safeReturn(value: string | null): string {
  return value && /^\/admin\/[\w\-/?=&%.]*$/.test(value) && !value.startsWith("//") ? value : "/admin/";
}

export function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/login", { body: { email, password } });
      window.location.assign(safeReturn(params.get("retour")));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email" htmlFor="login-email">
        <input id="login-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="Mot de passe" htmlFor="login-password">
        <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClasses} />
      </Field>
      {error && <ErrorBox message={error} />}
      <button type="submit" disabled={busy} className={buttonClasses("primary", "lg", "w-full")}>
        {busy ? "Connexion…" : "Se connecter"}
      </button>
      <p className="text-center text-xs text-muted">Mot de passe oublié ? Demande à un membre de l&apos;équipe de le réinitialiser (Réglages → Équipe).</p>
    </form>
  );
}
