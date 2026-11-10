import type { Metadata } from "next";
import { NewOrderPage } from "@/components/admin/pages/NewOrderPage";

export const metadata: Metadata = { title: "Saisir une commande" };

export default function Page() {
  return <NewOrderPage />;
}
