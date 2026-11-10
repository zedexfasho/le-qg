import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersPage } from "@/components/admin/pages/OrdersPage";
import { Loading } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Commandes" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <OrdersPage />
    </Suspense>
  );
}
