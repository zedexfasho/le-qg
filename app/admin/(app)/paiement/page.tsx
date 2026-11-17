import type { Metadata } from "next";
import { PaymentSettingsPage } from "@/components/admin/pages/PaymentSettingsPage";

export const metadata: Metadata = { title: "Paiement" };

export default function Page() {
  return <PaymentSettingsPage />;
}
