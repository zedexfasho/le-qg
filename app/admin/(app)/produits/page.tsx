import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsPage } from "@/components/admin/pages/ProductsPage";
import { Loading } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Produits" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ProductsPage />
    </Suspense>
  );
}
