import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";

/** Habillage du site public (en-tête, pied de page, bouton WhatsApp) */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#contenu" className="sr-only z-50 rounded-full bg-brown px-4 py-2 text-cream focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Aller au contenu
      </a>
      <Header />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
