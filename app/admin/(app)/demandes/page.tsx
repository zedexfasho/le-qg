import type { Metadata } from "next";
import { Suspense } from "react";
import { RestockPage } from "@/components/admin/pages/RestockPage";
import { Loading } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Demandes de retour" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <RestockPage />
    </Suspense>
  );
}
