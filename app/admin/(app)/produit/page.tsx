import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductEditPage } from "@/components/admin/pages/ProductEditPage";
import { Loading } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Produit" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ProductEditPage />
    </Suspense>
  );
}
