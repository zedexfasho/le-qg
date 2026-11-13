import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductJsonLd } from "@/components/product/ProductJsonLd";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { containerClasses } from "@/components/ui/styles";
import { getCategoryInfo } from "@/data/categories";
import { getProduct, getProducts, getSimilarProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { DEFAULT_OG, pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = (await getProducts()).map((p) => ({ slug: p.slug }));
  // L'export statique exige au moins une page : catalogue vide → page « introuvable »
  return slugs.length ? slugs : [{ slug: "aucun-produit" }];
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  const og = `/products/${product.slug}/og.jpg`;
  const hasOg = existsSync(path.join(process.cwd(), "public", og));
  // Produits ajoutés depuis le dashboard : première photo (déjà en ligne sur /media)
  const firstImage = product.variants[0]?.images[0];
  const mediaImage = firstImage?.startsWith("/media/") ? { url: firstImage, alt: product.name } : null;
  const colors = product.variants.map((v) => v.color).join(", ");
  return pageMetadata({
    title: product.name,
    description: `${product.name} — ${formatPrice(product.price)}. ${product.condition}. Coloris : ${colors}. Commande en ligne ou sur WhatsApp au QG, Dakar.`,
    path: `/product/${product.slug}/`,
    image: hasOg ? { url: og, width: 1200, height: 630, alt: product.name } : (mediaImage ?? DEFAULT_OG),
  });
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const similar = await getSimilarProducts(product, 4);
  const category = getCategoryInfo(product.category);

  return (
    <div className={`${containerClasses} pt-4 sm:pt-8`}>
      <ProductJsonLd product={product} />
      <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:underline">Accueil</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/shop/" className="hover:underline">Catalogue</Link></li>
          {category && (
            <>
              <li aria-hidden="true">/</li>
              <li><Link href={`/shop/${category.id}/`} className="hover:underline">{category.label}</Link></li>
            </>
          )}
        </ol>
      </nav>

      <ProductDetail product={product} />

      {similar.length > 0 && (
        <section aria-labelledby="similar-title" className="mt-16 sm:mt-20">
          <SectionTitle>
            <span id="similar-title">Ça va bien avec</span>
          </SectionTitle>
          <ProductGrid products={similar} />
        </section>
      )}
    </div>
  );
}
