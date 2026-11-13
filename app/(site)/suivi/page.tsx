import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderTracker } from "@/components/order/OrderTracker";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { containerClasses } from "@/components/ui/styles";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Suivre ma commande",
    description: "Entre ta référence de commande (QG-…) pour voir où elle en est : confirmée, en livraison, livrée.",
    path: "/suivi/",
  }),
  robots: { index: false, follow: true },
};

export default function TrackingPage() {
  return (
    <div className={`${containerClasses} pt-8 pb-16`}>
      <SectionTitle as="h1">Suivre ma commande</SectionTitle>
      <Suspense>
        <OrderTracker />
      </Suspense>
    </div>
  );
}
