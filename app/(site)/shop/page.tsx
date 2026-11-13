import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopView } from "@/components/shop/ShopView";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { containerClasses } from "@/components/ui/styles";
import { getProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Catalogue",
  description: "Tout le catalogue du QG : hoodies, ensembles, joggings, t-shirts, maillots, chemises et accessoires. Commande en ligne ou sur WhatsApp, livraison 24h à Dakar.",
  path: "/shop/",
});

export default async function ShopPage() {
  const products = await getProducts();
  return (
    <div className={`${containerClasses} pt-8`}>
      <SectionTitle as="h1" kicker="Le catalogue">Passe au QG</SectionTitle>
      {/* Les filtres lisent l'URL côté navigateur : la grille complète sert de rendu initial */}
      <Suspense fallback={<ProductGrid products={products} priorityCount={2} headingLevel={2} />}>
        <ShopView products={products} />
      </Suspense>
    </div>
  );
}
