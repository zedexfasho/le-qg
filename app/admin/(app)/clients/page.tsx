import type { Metadata } from "next";
import { CustomersPage } from "@/components/admin/pages/CustomersPage";

export const metadata: Metadata = { title: "Clients" };

export default function Page() {
  return <CustomersPage />;
}
