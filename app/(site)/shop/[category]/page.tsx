import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ShopView } from "@/components/shop/ShopView";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { containerClasses } from "@/components/ui/styles";
import { categories, getCategoryInfo } from "@/data/categories";
import { getProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category } = await params;
  const info = getCategoryInfo(category);
  if (!info) return {};
  return pageMetadata({
    title: info.label,
    description: `${info.label} au QG, Dakar. ${info.blurb} Commande sur WhatsApp, livraison 24h à Dakar.`,
    path: `/shop/${info.id}/`,
  });
}

export default async function CategoryPage({ params }: PageProps<"/shop/[category]">) {
  const { category } = await params;
  const info = getCategoryInfo(category);
  if (!info) notFound();
  const products = await getProducts();
  const initial = products.filter((p) => p.category === info.id);

  return (
    <div className={`${containerClasses} pt-8`}>
      <SectionTitle as="h1" kicker="Le catalogue">{info.label}</SectionTitle>
      <Suspense fallback={<ProductGrid products={initial} priorityCount={2} headingLevel={2} />}>
        <ShopView products={products} category={info.id} />
      </Suspense>
    </div>
  );
}
