import type { Metadata } from "next";
import { Suspense } from "react";
import { DropEditPage } from "@/components/admin/pages/DropEditPage";
import { Loading } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Drop" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <DropEditPage />
    </Suspense>
  );
}
