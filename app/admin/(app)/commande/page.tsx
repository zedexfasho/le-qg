import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderDetailPage } from "@/components/admin/pages/OrderDetailPage";
import { Loading } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Commande" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <OrderDetailPage />
    </Suspense>
  );
}
