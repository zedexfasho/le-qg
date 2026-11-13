"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { ProductImage } from "@/components/product/ProductImage";
import { buttonClasses } from "@/components/ui/styles";
import { ApiError, api, useApi } from "@/lib/admin/api";
import { uploadPhoto } from "@/lib/admin/image";
import { DEFAULT_DROP_COVER, dropDateInput, validateDrop, type DropErrors, type DropFields } from "@/lib/drops";
import type { Drop } from "@/lib/types";
import { CatalogTabs } from "../CatalogTabs";
import { ErrorBox, Field, Loading, PageHeader, inputClasses, panelClasses, useToast } from "../ui";

interface Detail {
  drop: Drop;
  products: number;
  publishedProducts: number;
}

const today = () => new Date().toISOString().slice(0, 10);
const toFields = (d: Drop): DropFields => ({ title: d.title, date: dropDateInput(d.date), description: d.description ?? "", cover: d.cover ?? "" });

export function DropEditPage() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<Detail>(id ? `/drops/${id}` : null);
  const [form, setForm] = useState<DropFields | null>(id ? null : { title: "", date: today(), description: "", cover: "" });
  const [errors, setErrors] = useState<DropErrors>({});
  const [busy, setBusy] = useState<"save" | "delete" | "photo" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [synced, setSynced] = useState<Detail | null>(null);
  if (data && data !== synced) {
    setSynced(data);
    setForm(toFields(data.drop));
  }

  if (id && error) return <ErrorBox message={error} onRetry={reload} />;
  if (!form || (id && loading && !data)) return <Loading />;

  const set = (patch: Partial<DropFields>) => {
    setForm({ ...form, ...patch });
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch)) delete next[key as keyof DropFields];
      return next;
    });
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy("photo");
    try {
      set({ cover: await uploadPhoto(file) });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const check = validateDrop(form);
    if (!check.data) {
      setErrors(check.errors);
      return;
    }
    setBusy("save");
    try {
      if (id) {
        await api(`/drops/${id}`, { method: "PUT", body: form });
        toast.ok("Drop enregistré. Clique sur « Publier le site » pour mettre le site à jour.");
        reload();
      } else {
        const { drop } = await api<{ drop: Drop }>("/drops", { body: form });
        router.replace(`/admin/drop/?id=${drop.id}`);
        toast.ok("Drop créé. Rattache-lui des produits (champ « Drop » de la fiche produit).");
      }
    } catch (err) {
      if (err instanceof ApiError && err.data.fields) setErrors(err.data.fields as DropErrors);
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!id || !data) return;
    const warning = data.products > 0 ? `\n\nSes ${data.products} produit(s) restent en vente, simplement sans drop.` : "";
    if (!window.confirm(`Supprimer le drop « ${data.drop.title} » ?${warning}`)) return;
    setBusy("delete");
    try {
      await api(`/drops/${id}`, { method: "DELETE" });
      router.replace("/admin/drops/");
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(null);
    }
  };

  const describedBy = (field: keyof DropFields) => (errors[field] ? `drop-${field}-error` : undefined);
  const fieldError = (field: keyof DropFields) =>
    errors[field] && (
      <p id={`drop-${field}-error`} className="mt-1 text-sm font-semibold text-accent-strong">
        {errors[field]}
      </p>
    );

  return (
    <>
      <CatalogTabs />
      <Link href="/admin/drops/" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <ArrowLeft className="size-4" aria-hidden="true" /> Tous les drops
      </Link>
      <PageHeader
        title={id ? (data?.drop.title ?? "Drop") : "Nouveau drop"}
        subtitle={
          id && data
            ? data.publishedProducts > 0
              ? `${data.publishedProducts} produit(s) publié(s) : visible sur le site après « Publier le site ».`
              : "Pas encore visible : rattache-lui au moins un produit publié."
            : "Un arrivage : un nom, une date et une belle photo."
        }
        actions={
          id && data && data.publishedProducts > 0 ? (
            <a href={`/drops/${id}/`} target="_blank" rel="noopener" className={buttonClasses("ghost", "md")}>
              Voir sur le site <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          ) : undefined
        }
      />

      <form onSubmit={save} noValidate className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <section className={`${panelClasses} space-y-4`}>
          <Field label="Nom du drop" htmlFor="drop-title">
            <input
              id="drop-title"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Ex. Drop de décembre"
              maxLength={80}
              aria-invalid={!!errors.title}
              aria-describedby={describedBy("title")}
              className={inputClasses}
            />
            {fieldError("title")}
          </Field>
          <Field label="Date de l'arrivage" htmlFor="drop-date">
            <input
              id="drop-date"
              type="date"
              value={form.date}
              onChange={(e) => set({ date: e.target.value })}
              aria-invalid={!!errors.date}
              aria-describedby={describedBy("date")}
              className={inputClasses}
            />
            {fieldError("date")}
          </Field>
          <Field label="Description (facultatif)" htmlFor="drop-description" hint={`${form.description.length}/300`}>
            <textarea
              id="drop-description"
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={3}
              maxLength={300}
              placeholder="Ex. Hoodies épais et ensembles coton pour les soirées fraîches."
              aria-invalid={!!errors.description}
              aria-describedby={describedBy("description")}
              className={`${inputClasses} h-auto py-2`}
            />
            {fieldError("description")}
          </Field>
        </section>

        <section className={`${panelClasses} space-y-3`}>
          <p className="text-sm font-semibold">Photo de couverture</p>
          <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-surface-2">
            <ProductImage src={form.cover || DEFAULT_DROP_COVER} alt="" fill sizes="320px" className="object-cover" />
            {busy === "photo" && (
              <div className="absolute inset-0 grid place-items-center bg-bg/60">
                <Loader2 className="size-6 animate-spin" aria-label="Envoi de la photo…" />
              </div>
            )}
          </div>
          {!form.cover && <p className="text-xs text-muted">Sans photo, cette illustration est utilisée.</p>}
          <div className="flex flex-wrap gap-2">
            <input ref={fileInput} type="file" accept="image/*" className="sr-only" id="drop-cover" onChange={(e) => pickPhoto(e.target.files?.[0])} />
            <label htmlFor="drop-cover" className={buttonClasses("secondary", "md", "cursor-pointer")}>
              <ImagePlus className="size-4" aria-hidden="true" /> {form.cover ? "Changer" : "Ajouter une photo"}
            </label>
            {form.cover && (
              <button type="button" onClick={() => set({ cover: "" })} className={buttonClasses("ghost", "md")}>
                <X className="size-4" aria-hidden="true" /> Retirer
              </button>
            )}
          </div>
          {fieldError("cover")}
          <p className="text-xs text-muted">Format paysage conseillé (3:2). La photo est allégée automatiquement.</p>
        </section>

        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button type="submit" disabled={!!busy} className={buttonClasses("primary", "lg")}>
            {busy === "save" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {id ? "Enregistrer" : "Créer le drop"}
          </button>
          {id && (
            <button type="button" onClick={remove} disabled={!!busy} className={buttonClasses("ghost", "lg", "text-accent-strong")}>
              <Trash2 className="size-4" aria-hidden="true" /> Supprimer
            </button>
          )}
        </div>
      </form>
      {toast.node}
    </>
  );
}
