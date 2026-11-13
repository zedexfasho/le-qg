import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HangerIcon, LightString } from "@/components/brand/Decor";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductImage } from "@/components/product/ProductImage";
import { buttonClasses, containerClasses } from "@/components/ui/styles";
import { getDrop, getDropProducts, getDrops } from "@/lib/catalog";
import { DEFAULT_DROP_COVER } from "@/lib/drops";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = (await getDrops()).map((d) => ({ id: d.id }));
  // L'export statique exige au moins une page : sans drop visible, une page « introuvable »
  return ids.length ? ids : [{ id: "aucun-drop" }];
}

export async function generateMetadata({ params }: PageProps<"/drops/[id]">): Promise<Metadata> {
  const { id } = await params;
  const drop = await getDrop(id);
  if (!drop) return {};
  return pageMetadata({
    title: drop.title,
    description: drop.description ?? `${drop.title} : le nouvel arrivage du QG, à Dakar.`,
    path: `/drops/${drop.id}/`,
  });
}

export default async function DropPage({ params }: PageProps<"/drops/[id]">) {
  const { id } = await params;
  const drop = await getDrop(id);
  if (!drop) notFound();
  const products = await getDropProducts(drop.id);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-sunset to-orange text-brown">
        <LightString className="absolute inset-x-0 top-0 h-14 w-full text-brown/70" bulbs={6} />
        <div className={`${containerClasses} grid items-center gap-6 pt-16 pb-10 md:grid-cols-2 md:pt-20`}>
          <div>
            <p className="text-sm font-bold tracking-wide uppercase">Drop du {formatDate(drop.date)}</p>
            <h1 className="mt-1 font-display text-4xl font-bold sm:text-5xl">{drop.title}</h1>
            {drop.description && <p className="mt-3 max-w-md text-lg font-medium">{drop.description}</p>}
          </div>
          <div className="relative aspect-[3/2] overflow-hidden rounded-3xl shadow-warm-lg">
            <ProductImage src={drop.cover ?? DEFAULT_DROP_COVER} alt={drop.title} fill preload sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      <div className={`${containerClasses} pt-10`}>
        {products.length > 0 ? (
          <ProductGrid products={products} headingLevel={2} />
        ) : (
          <div className="flex flex-col items-center rounded-3xl bg-surface-2 px-6 py-14 text-center">
            <HangerIcon className="mb-4 size-14 text-muted" strokeWidth={1.5} />
            <p className="font-display text-2xl font-bold">Les pièces de ce drop arrivent bientôt</p>
            <p className="mt-2 max-w-sm text-muted">En attendant, le reste du QG t&apos;attend.</p>
            <Link href="/shop/" className={buttonClasses("primary", "md", "mt-6")}>Passe au QG</Link>
          </div>
        )}
        <p className="mt-10 text-center">
          <Link href="/drops/" className="font-semibold underline underline-offset-4">← Tous les drops</Link>
        </p>
      </div>
    </>
  );
}
