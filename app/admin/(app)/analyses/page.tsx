import type { Metadata } from "next";
import { AnalyticsPage } from "@/components/admin/pages/AnalyticsPage";

export const metadata: Metadata = { title: "Analyses" };

export default function Page() {
  return <AnalyticsPage />;
}
