import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { containerClasses } from "@/components/ui/styles";
import { getProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({ title: "Mon panier", path: "/panier/" }),
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const products = await getProducts();
  return (
    <div className={`${containerClasses} pt-8`}>
      <SectionTitle as="h1">Mon panier</SectionTitle>
      <CartView products={products} />
    </div>
  );
}
