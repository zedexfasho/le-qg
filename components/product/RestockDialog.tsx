"use client";

import { AlertTriangle, BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { buttonClasses } from "@/components/ui/styles";
import { formatSize } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { validateRestockContact, type RestockContactFields, type RestockErrors } from "@/lib/restock";
import { readStorage } from "@/lib/storage";
import type { Size } from "@/lib/types";

const inputClasses =
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none aria-[invalid=true]:border-accent-strong";

/** Prénom et numéro déjà mémorisés lors d'une commande (si le client l'avait demandé) */
function savedContact(): RestockContactFields {
  try {
    const saved = JSON.parse(readStorage("qg-coordonnees") || "{}") as Partial<RestockContactFields>;
    return { name: saved.name ?? "", phone: saved.phone ?? "" };
  } catch {
    return { name: "", phone: "" };
  }
}

interface RestockDialogProps {
  open: boolean;
  onClose: () => void;
  slug: string;
  productName: string;
  color: string;
  /** Tailles épuisées proposées au client (vide = la couleur entière est épuisée) */
  soldOutSizes: Size[];
  initialSize?: Size;
}

export function RestockDialog({ open, onClose, ...props }: RestockDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="Me prévenir du retour" layout="sheet">
      {/* Monté seulement à l'ouverture : le formulaire repart de zéro à chaque fois */}
      {open && <RestockForm {...props} onClose={onClose} />}
    </Modal>
  );
}

function RestockForm({ slug, productName, color, soldOutSizes, initialSize, onClose }: Omit<RestockDialogProps, "open">) {
  const id = useId();
  const [fields, setFields] = useState<RestockContactFields>(savedContact);
  const [size, setSize] = useState<string>(initialSize ?? (soldOutSizes.length === 1 ? soldOutSizes[0] : ""));
  const [errors, setErrors] = useState<RestockErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);

  const what = `${productName} — ${color}${size ? ` — ${formatSize(size)}` : ""}`;

  if (done) {
    return (
      <div className="py-4 text-center" role="status">
        <CheckCircle2 className="mx-auto mb-3 size-12 text-accent-strong" strokeWidth={1.75} aria-hidden="true" />
        <p className="font-display text-2xl font-bold">C&apos;est noté !</p>
        <p className="mx-auto mt-2 max-w-xs text-muted">
          On t&apos;écrit sur WhatsApp au <span className="font-semibold text-ink">{formatPhone(validateRestockContact(fields).data?.phone ?? "")}</span> dès que{" "}
          <span className="font-semibold text-ink">{what}</span> revient.
        </p>
        <button type="button" onClick={onClose} className={buttonClasses("primary", "lg", "mt-6 w-full")}>
          Continuer mes achats
        </button>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const check = validateRestockContact(fields);
    if (!check.data) {
      setErrors(check.errors);
      document.getElementById(`${id}-${Object.keys(check.errors)[0]}`)?.focus();
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, color, size: size || null, ...fields, website: honeypot.current?.value ?? "" }),
      });
      if (res.ok) {
        setDone(true);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string; fields?: RestockErrors };
      if (data.fields) setErrors(data.fields);
      setFailure(data.error ?? "Impossible d'enregistrer ta demande. Réessaie.");
    } catch {
      setFailure("Pas de connexion internet. Vérifie ton réseau et réessaie.");
    } finally {
      setSending(false);
    }
  };

  const describedBy = (field: keyof RestockContactFields) => (errors[field] ? `${id}-${field}-error` : undefined);

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="flex items-start gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
        <BellRing className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden="true" />
        <span>
          Laisse ton numéro : on te prévient sur WhatsApp dès que <span className="font-semibold">{productName}</span> en{" "}
          <span className="font-semibold">{color}</span> revient. Pas de spam, promis.
        </span>
      </p>

      {soldOutSizes.length > 1 && (
        <div>
          <label htmlFor={`${id}-size`} className="mb-1.5 block font-semibold">
            Taille
          </label>
          <select id={`${id}-size`} value={size} onChange={(e) => setSize(e.target.value)} className={inputClasses}>
            <option value="">N&apos;importe laquelle</option>
            {soldOutSizes.map((s) => (
              <option key={s} value={s}>
                {s === "TU" ? "Taille unique" : s}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor={`${id}-phone`} className="mb-1.5 block font-semibold">
          Ton numéro WhatsApp
        </label>
        <input
          id={`${id}-phone`}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="77 123 45 67"
          value={fields.phone}
          onChange={(e) => {
            setFields({ ...fields, phone: e.target.value });
            setErrors((er) => ({ ...er, phone: undefined }));
          }}
          aria-invalid={!!errors.phone}
          aria-describedby={describedBy("phone")}
          className={inputClasses}
        />
        {errors.phone && (
          <p id={`${id}-phone-error`} className="mt-1 text-sm font-semibold text-accent-strong">
            {errors.phone}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-name`} className="mb-1.5 block font-semibold">
          Ton prénom <span className="font-normal text-muted">(facultatif)</span>
        </label>
        <input
          id={`${id}-name`}
          autoComplete="given-name"
          value={fields.name}
          maxLength={60}
          onChange={(e) => {
            setFields({ ...fields, name: e.target.value });
            setErrors((er) => ({ ...er, name: undefined }));
          }}
          aria-invalid={!!errors.name}
          aria-describedby={describedBy("name")}
          className={inputClasses}
        />
        {errors.name && (
          <p id={`${id}-name-error`} className="mt-1 text-sm font-semibold text-accent-strong">
            {errors.name}
          </p>
        )}
      </div>

      {/* Piège à robots : invisible pour les humains */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site web
          <input ref={honeypot} name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {failure && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-accent-strong/10 p-3 text-sm font-semibold text-accent-strong">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {failure}
        </p>
      )}

      <button type="submit" disabled={sending} className={buttonClasses("primary", "lg", "w-full")}>
        {sending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <BellRing className="size-5" aria-hidden="true" />}
        Me prévenir
      </button>
    </form>
  );
}
