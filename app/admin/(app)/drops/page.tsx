import type { Metadata } from "next";
import { Suspense } from "react";
import { DropsPage } from "@/components/admin/pages/DropsPage";
import { Loading } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Drops" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <DropsPage />
    </Suspense>
  );
}
