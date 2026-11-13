"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { ProductImage } from "@/components/product/ProductImage";
import { buttonClasses } from "@/components/ui/styles";
import { categories } from "@/data/categories";
import { ApiError, api, useApi } from "@/lib/admin/api";
import { uploadPhoto } from "@/lib/admin/image";
import { slugify } from "@/lib/format";
import { SIZES, type Category, type Drop, type Product, type Size, type Variant } from "@/lib/types";
import { ErrorBox, Field, Loading, inputClasses, panelClasses, useToast } from "../ui";

const CONDITIONS = ["Neuf avec étiquette", "Neuf sans étiquette", "Très bon état", "Bon état"];

/** Formulaire : les nombres restent des textes tant qu'on tape */
interface VariantForm {
  key: string;
  color: string;
  colorHex: string;
  images: string[];
  stock: Partial<Record<Size, string>>;
}
interface ProductForm {
  name: string;
  slug: string;
  category: Category;
  condition: string;
  price: string;
  oldPrice: string;
  brandLabel: string;
  description: string;
  dropId: string;
  isNew: boolean;
  published: boolean;
  createdAt?: string;
  variants: VariantForm[];
}

let keySeed = 0;
const newKey = () => `v${++keySeed}`;

const emptyVariant = (): VariantForm => ({ key: newKey(), color: "", colorHex: "#1C1A19", images: [], stock: { S: "", M: "", L: "", XL: "" } });

const emptyForm = (): ProductForm => ({
  name: "",
  slug: "",
  category: "hoodies",
  condition: CONDITIONS[0],
  price: "",
  oldPrice: "",
  brandLabel: "",
  description: "",
  dropId: "",
  isNew: true,
  published: true,
  variants: [emptyVariant()],
});

function toForm(p: Product, published: boolean): ProductForm {
  return {
    name: p.name,
    slug: p.slug,
    category: p.category,
    condition: p.condition,
    price: p.price ? String(p.price) : "",
    oldPrice: p.oldPrice ? String(p.oldPrice) : "",
    brandLabel: p.brandLabel ?? "",
    description: p.description,
    dropId: p.dropId ?? "",
    isNew: !!p.isNew,
    published,
    createdAt: p.createdAt,
    variants: p.variants.map((v) => ({
      key: newKey(),
      color: v.color,
      colorHex: v.colorHex,
      images: [...v.images],
      stock: Object.fromEntries(Object.entries(v.stock).map(([s, n]) => [s, String(n)])),
    })),
  };
}

function toProduct(f: ProductForm): Product {
  return {
    slug: f.slug || slugify(f.name),
    name: f.name.trim(),
    ...(f.brandLabel.trim() ? { brandLabel: f.brandLabel.trim() } : {}),
    condition: f.condition.trim(),
    category: f.category,
    price: Number(f.price),
    ...(f.oldPrice ? { oldPrice: Number(f.oldPrice) } : {}),
    description: f.description.trim(),
    variants: f.variants.map(
      (v): Variant => ({
        color: v.color.trim(),
        colorHex: v.colorHex,
        images: v.images,
        // Case vide = taille qui n'existe pas pour cette couleur
        stock: Object.fromEntries(Object.entries(v.stock).filter(([, n]) => n !== "" && n !== undefined).map(([s, n]) => [s, Number(n)])),
      }),
    ),
    ...(f.isNew ? { isNew: true } : {}),
    ...(f.dropId ? { dropId: f.dropId } : {}),
    createdAt: f.createdAt ?? new Date().toISOString(),
  };
}

function PhotoPicker({ images, onChange, onError }: { images: string[]; onChange: (images: string[]) => void; onError: (message: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].slice(0, 8 - images.length);
    setUploading(list.length);
    const added: string[] = [];
    for (const file of list) {
      try {
        added.push(await uploadPhoto(file));
      } catch (err) {
        onError(`${file.name} : ${(err as Error).message}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    onChange([...images, ...added]);
    if (input.current) input.current.value = "";
  };

  const move = (index: number, delta: number) => {
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(Math.max(0, Math.min(next.length, index + delta)), 0, item);
    onChange(next);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div key={src} className="group relative aspect-[4/5] w-24 overflow-hidden rounded-xl bg-surface-2">
            <ProductImage src={src} alt={`Photo ${i + 1}`} fill sizes="96px" className="object-cover" />
            {i === 0 && <span className="absolute top-1 left-1 rounded-full bg-brown/80 px-1.5 text-[10px] font-semibold text-cream">Principale</span>}
            <div className="absolute inset-x-1 bottom-1 flex justify-between">
              <button type="button" onClick={() => move(i, i === 0 ? 1 : -1)} className="grid size-7 place-items-center rounded-full bg-surface/90" aria-label={i === 0 ? "Déplacer à droite" : "Mettre avant"}>
                <ArrowLeftRight className="size-3.5" />
              </button>
              <button type="button" onClick={() => onChange(images.filter((x) => x !== src))} className="grid size-7 place-items-center rounded-full bg-surface/90" aria-label={`Retirer la photo ${i + 1}`}>
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <div key={`up-${i}`} className="grid aspect-[4/5] w-24 place-items-center rounded-xl bg-surface-2" role="status" aria-label="Envoi en cours">
            <Loader2 className="size-5 animate-spin text-muted" />
          </div>
        ))}
        {images.length + uploading < 8 && (
          <button type="button" onClick={() => input.current?.click()} className="grid aspect-[4/5] w-24 place-items-center rounded-xl border-2 border-dashed border-line text-xs font-semibold text-muted hover:border-accent">
            <span className="flex flex-col items-center gap-1">
              <ImagePlus className="size-5" aria-hidden="true" /> Ajouter
            </span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
    </div>
  );
}

export function ProductEditPage() {
  const params = useSearchParams();
  const router = useRouter();
  const slug = params.get("slug");
  const isNew = !slug;
  const { data, error, loading, reload } = useApi<{ product: Product; published: boolean; updatedAt: string }>(slug ? `/products/${slug}` : null);
  const dropList = useApi<{ drops: Drop[] }>("/drops");
  const drops = dropList.data?.drops ?? [];
  const [form, setForm] = useState<ProductForm | null>(isNew ? emptyForm() : null);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const [synced, setSynced] = useState<typeof data>(null);
  if (data && data !== synced) {
    setSynced(data);
    setForm(toForm(data.product, data.published));
    setUpdatedAt(data.updatedAt);
  }

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if ((loading && !data) || !form) return <Loading />;

  const set = (patch: Partial<ProductForm>) => setForm({ ...form, ...patch });
  const setVariant = (key: string, patch: Partial<VariantForm>) => set({ variants: form.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      const product = toProduct(form);
      if (isNew) {
        const res = await api<{ product: Product }>("/products", { body: { product, published: form.published } });
        router.replace(`/admin/produit/?slug=${res.product.slug}`);
        toast.ok("Produit créé. Pense à « Publier le site » pour qu'il apparaisse.");
      } else {
        const res = await api<{ updatedAt: string }>(`/products/${slug}`, { method: "PUT", body: { product, published: form.published, expectedUpdatedAt: updatedAt } });
        setUpdatedAt(res.updatedAt);
        toast.ok("Produit enregistré.");
      }
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.data.errors)) setErrors(err.data.errors as string[]);
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!slug || !window.confirm(`Supprimer définitivement « ${form.name} » ? Les anciennes commandes gardent leur historique. Pour le cacher temporairement, passe-le plutôt en brouillon.`)) return;
    try {
      await api(`/products/${slug}`, { method: "DELETE" });
      router.replace("/admin/produits/");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <>
      {toast.node}
      <Link href="/admin/produits/" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Produits
      </Link>
      <h1 className="mb-5 font-display text-2xl font-bold sm:text-3xl">{isNew ? "Nouveau produit" : form.name || "Produit"}</h1>

      <form onSubmit={save} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className={`${panelClasses} grid gap-3 sm:grid-cols-2`} aria-labelledby="p-general">
            <h2 id="p-general" className="font-display text-lg font-bold sm:col-span-2">
              Infos
            </h2>
            <div className="sm:col-span-2">
              <Field label="Nom" htmlFor="p-name" hint={isNew ? `Lien : /product/${slugify(form.name) || "…"}/` : `Lien : /product/${form.slug}/ (ne change pas)`}>
                <input id="p-name" required maxLength={120} value={form.name} onChange={(e) => set({ name: e.target.value })} className={inputClasses} />
              </Field>
            </div>
            <Field label="Catégorie" htmlFor="p-cat">
              <select id="p-cat" value={form.category} onChange={(e) => set({ category: e.target.value as Category })} className={inputClasses}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="État" htmlFor="p-cond">
              <input id="p-cond" list="p-cond-list" required value={form.condition} onChange={(e) => set({ condition: e.target.value })} className={inputClasses} />
              <datalist id="p-cond-list">
                {CONDITIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Prix (FCFA)" htmlFor="p-price">
              <input id="p-price" required type="number" inputMode="numeric" min={1} value={form.price} onChange={(e) => set({ price: e.target.value })} className={inputClasses} />
            </Field>
            <Field label="Ancien prix barré (promo)" htmlFor="p-old" hint="Laisser vide s'il n'y a pas de promo.">
              <input id="p-old" type="number" inputMode="numeric" min={0} value={form.oldPrice} onChange={(e) => set({ oldPrice: e.target.value })} className={inputClasses} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description" htmlFor="p-desc">
                <textarea id="p-desc" rows={4} maxLength={3000} value={form.description} onChange={(e) => set({ description: e.target.value })} className={`${inputClasses} h-auto py-2`} />
              </Field>
            </div>
            <Field label="Marque (facultatif)" htmlFor="p-brand" hint="Mention factuelle uniquement.">
              <input id="p-brand" value={form.brandLabel} onChange={(e) => set({ brandLabel: e.target.value })} className={inputClasses} />
            </Field>
            <Field
              label="Drop"
              htmlFor="p-drop"
              hint={
                <>
                  Les drops se créent dans{" "}
                  <Link href="/admin/drops/" className="underline">
                    Produits → Drops
                  </Link>
                  .
                </>
              }
            >
              <select id="p-drop" value={form.dropId} onChange={(e) => set({ dropId: e.target.value })} className={inputClasses}>
                <option value="">Aucun</option>
                {/* Drop rattaché mais supprimé ou pas encore chargé : on garde la valeur */}
                {form.dropId && !drops.some((d) => d.id === form.dropId) && <option value={form.dropId}>{form.dropId}</option>}
                {drops.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          {form.variants.map((v, index) => (
            <section key={v.key} className={`${panelClasses} space-y-3`} aria-label={`Couleur ${index + 1}`}>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-40 flex-1">
                  <Field label={`Couleur ${index + 1}`} htmlFor={`${v.key}-color`}>
                    <input id={`${v.key}-color`} required placeholder="Noir, Gris chiné…" value={v.color} onChange={(e) => setVariant(v.key, { color: e.target.value })} className={inputClasses} />
                  </Field>
                </div>
                <Field label="Pastille" htmlFor={`${v.key}-hex`}>
                  <input id={`${v.key}-hex`} type="color" value={v.colorHex} onChange={(e) => setVariant(v.key, { colorHex: e.target.value.toUpperCase() })} className="h-11 w-16 cursor-pointer rounded-xl border border-line bg-surface p-1" />
                </Field>
                {form.variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => window.confirm(`Retirer la couleur « ${v.color || index + 1} » ?`) && set({ variants: form.variants.filter((x) => x.key !== v.key) })}
                    className={buttonClasses("ghost", "md", "px-3")}
                    aria-label={`Retirer la couleur ${v.color || index + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <div>
                <p className="mb-1.5 text-sm font-semibold">Photos (la première est la principale)</p>
                <PhotoPicker images={v.images} onChange={(images) => setVariant(v.key, { images })} onError={toast.error} />
              </div>
              <div>
                <p className="mb-1.5 text-sm font-semibold">Stock par taille</p>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map((size) => (
                    <label key={size} className="flex flex-col items-center gap-1 text-xs font-semibold">
                      {size}
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        placeholder="—"
                        value={v.stock[size] ?? ""}
                        onChange={(e) => setVariant(v.key, { stock: { ...v.stock, [size]: e.target.value } })}
                        className="h-10 w-14 rounded-lg border border-line bg-surface px-1 text-center text-base tabular-nums"
                        aria-label={`Stock ${v.color} ${size}`}
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted">Case vide = taille qui n&apos;existe pas. 0 = taille épuisée (affichée barrée).</p>
              </div>
            </section>
          ))}
          <button type="button" onClick={() => set({ variants: [...form.variants, emptyVariant()] })} className={buttonClasses("secondary", "md")}>
            <Plus className="size-4" aria-hidden="true" /> Ajouter une couleur
          </button>
        </div>

        <aside className={`${panelClasses} h-fit space-y-4 lg:sticky lg:top-6`}>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} className="mt-0.5 size-5 accent-[var(--accent-strong)]" />
            <span>
              <span className="font-semibold">En ligne</span>
              <span className="block text-muted">Décoché = brouillon, invisible sur le site.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={form.isNew} onChange={(e) => set({ isNew: e.target.checked })} className="mt-0.5 size-5 accent-[var(--accent-strong)]" />
            <span>
              <span className="font-semibold">Badge « Nouveau »</span>
            </span>
          </label>
          {errors.length > 0 && (
            <ul className="list-disc space-y-1 rounded-xl bg-[#FCEDEA] p-3 pl-7 text-sm text-[#7A1C12] dark:bg-[#3A140F] dark:text-[#FFD3CC]" role="alert">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <button type="submit" disabled={busy} className={buttonClasses("primary", "lg", "w-full")}>
            {busy ? "Enregistrement…" : isNew ? "Créer le produit" : "Enregistrer"}
          </button>
          <p className="text-xs text-muted">Après l&apos;enregistrement, clique sur « Publier le site » (page Produits) pour mettre en ligne les nouveautés, photos et textes.</p>
          {!isNew && (
            <button type="button" onClick={remove} className="flex items-center gap-1.5 text-sm font-semibold text-[#8A1F14] hover:underline dark:text-[#FFB4A8]">
              <Trash2 className="size-4" aria-hidden="true" /> Supprimer le produit
            </button>
          )}
        </aside>
      </form>
    </>
  );
}
