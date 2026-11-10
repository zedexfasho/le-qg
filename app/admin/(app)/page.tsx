import type { Metadata } from "next";
import { HomePage } from "@/components/admin/pages/HomePage";

export const metadata: Metadata = { title: "Accueil" };

export default function AdminHome() {
  return <HomePage />;
}
