import type { Metadata } from "next";
import { DeliveriesPage } from "@/components/admin/pages/DeliveriesPage";

export const metadata: Metadata = { title: "Livraisons" };

export default function Page() {
  return <DeliveriesPage />;
}
