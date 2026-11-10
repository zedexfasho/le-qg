import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerDetailPage } from "@/components/admin/pages/CustomerDetailPage";
import { Loading } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Client" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CustomerDetailPage />
    </Suspense>
  );
}
