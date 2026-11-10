import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { LightString } from "@/components/brand/Decor";
import { SocialLinks } from "@/components/layout/SocialLinks";
import { containerClasses } from "@/components/ui/styles";
import { categories } from "@/data/categories";
import { site } from "@/data/site";
import { buildWhatsAppUrl, contactMessage } from "@/lib/whatsapp";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 bg-brown text-cream dark:bg-[#140904]">
      <LightString className="h-10 w-full text-cream/40" bulbs={7} />
      <div className={`${containerClasses} grid gap-10 pt-6 pb-28 md:grid-cols-[auto_1fr_1fr_1fr] md:pb-12`}>
        <div className="flex flex-col items-center gap-3 md:items-start">
          <Logo variant="badge" width={132} />
          <p className="font-display text-lg font-bold">Dalal ak jamm au QG</p>
        </div>

        <nav aria-label="Catégories">
          <h2 className="mb-3 font-display text-lg font-bold">Le catalogue</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-cream/85 md:grid-cols-1">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/shop/${c.id}/`} className="hover:text-sunset hover:underline">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Informations">
          <h2 className="mb-3 font-display text-lg font-bold">Le QG</h2>
          <ul className="space-y-2 text-sm text-cream/85">
            <li><Link href="/drops/" className="hover:text-sunset hover:underline">Les drops</Link></li>
            <li><Link href="/notre-histoire/" className="hover:text-sunset hover:underline">Notre histoire</Link></li>
            <li><Link href="/infos/" className="hover:text-sunset hover:underline">Livraison & échanges</Link></li>
            <li><Link href="/infos/#paiement" className="hover:text-sunset hover:underline">Paiement</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="mb-3 font-display text-lg font-bold">On reste en contact</h2>
          <p className="mb-4 text-sm text-cream/85">Une question sur une taille, un drop ? Écris-nous, on répond vite.</p>
          <a
            href={buildWhatsAppUrl(contactMessage())}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 inline-flex h-11 items-center gap-2 rounded-full bg-whatsapp px-5 text-sm font-semibold text-[#10230F]"
          >
            Écrire sur WhatsApp
          </a>
          <SocialLinks className="text-cream" />
        </div>
      </div>
      <div className="border-t border-cream/15 py-5 text-center text-xs text-cream/70">
        © {year} {site.name} — {site.city}. Tous droits réservés.
      </div>
    </footer>
  );
}
