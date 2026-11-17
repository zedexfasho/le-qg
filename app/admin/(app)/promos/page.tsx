import type { Metadata } from "next";
import { PromosPage } from "@/components/admin/pages/PromosPage";

export const metadata: Metadata = { title: "Codes promo" };

export default function Page() {
  return <PromosPage />;
}
