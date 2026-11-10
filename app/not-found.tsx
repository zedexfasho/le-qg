import type { Metadata } from "next";
import Link from "next/link";
import { LightString } from "@/components/brand/Decor";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { buttonClasses, containerClasses } from "@/components/ui/styles";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="contenu" className={`${containerClasses} flex flex-1 flex-col items-center py-16 text-center`}>
        <LightString className="mb-6 h-14 w-72 text-ink/60" bulbs={4} />
        <p className="font-display text-7xl font-bold text-accent-strong">404</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">T&apos;es perdu ? Le QG c&apos;est par ici</h1>
        <p className="mt-3 max-w-md text-muted">Cette page n&apos;existe pas (ou plus). Le modèle a peut-être été vendu.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={buttonClasses("primary", "lg")}>
            Retour au QG
          </Link>
          <Link href="/shop/" className={buttonClasses("secondary", "lg")}>
            Voir le catalogue
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
