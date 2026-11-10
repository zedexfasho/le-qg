import type { Metadata } from "next";
import { SettingsPage } from "@/components/admin/pages/SettingsPage";

export const metadata: Metadata = { title: "Réglages" };

export default function Page() {
  return <SettingsPage />;
}
