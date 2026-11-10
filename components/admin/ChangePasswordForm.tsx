"use client";

import { useState } from "react";
import { buttonClasses } from "@/components/ui/styles";
import { api } from "@/lib/admin/api";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { ErrorBox, Field, inputClasses } from "./ui";

export function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (next !== confirm) return setError("Les deux nouveaux mots de passe ne correspondent pas.");
    setBusy(true);
    setError(null);
    try {
      await api("/me/password", { body: { current, next } });
      setCurrent("");
      setNext("");
      setConfirm("");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Mot de passe actuel" htmlFor="pw-current">
        <input id="pw-current" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="Nouveau mot de passe" htmlFor="pw-next" hint={`${MIN_PASSWORD_LENGTH} caractères minimum. Une petite phrase est plus facile à retenir.`}>
        <input id="pw-next" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} value={next} onChange={(e) => setNext(e.target.value)} className={inputClasses} />
      </Field>
      <Field label="Confirme le nouveau mot de passe" htmlFor="pw-confirm">
        <input id="pw-confirm" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClasses} />
      </Field>
      {error && <ErrorBox message={error} />}
      <button type="submit" disabled={busy} className={buttonClasses("primary", "md", "w-full")}>
        {busy ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </button>
    </form>
  );
}
