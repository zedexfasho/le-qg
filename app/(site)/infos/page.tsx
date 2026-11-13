import type { Metadata } from "next";
import { MapPin, RefreshCcw, Truck, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { SocialLinks } from "@/components/layout/SocialLinks";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { buttonClasses, cardClasses, containerClasses } from "@/components/ui/styles";
import { site } from "@/data/site";
import { formatPrice } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { buildWhatsAppUrl, contactMessage } from "@/lib/whatsapp";

export const metadata: Metadata = pageMetadata({
  title: "Livraison, échanges et paiement",
  description: "Livraison à Dakar en 24h, banlieue et régions. Paiement Wave, Orange Money ou à la livraison. Échanges et contact du QG.",
  path: "/infos/",
});

function Block({ id, icon, title, children }: { id: string; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`${cardClasses} scroll-mt-24 p-6`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-accent-strong">{icon}</span>
        <h2 id={`${id}-title`} className="font-display text-2xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function InfosPage() {
  return (
    <div className={`${containerClasses} pt-8`}>
      <SectionTitle as="h1" kicker="Infos pratiques">Comment ça marche au QG</SectionTitle>

      <div className="grid gap-5 md:grid-cols-2">
        <Block id="livraison" icon={<Truck className="size-6" aria-hidden="true" />} title="Livraison">
          <ul className="divide-y divide-line">
            {site.delivery.map((zone) => (
              <li key={zone.zone} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold">{zone.zone} <span className="font-normal text-muted">· {zone.delay}</span></p>
                  <p className="text-sm text-muted">{zone.detail}</p>
                </div>
                <p className="shrink-0 text-right font-bold">
                  {zone.price === null ? <span className="text-sm font-semibold text-muted">Tarif à<br />confirmer</span> : formatPrice(zone.price)}
                </p>
              </li>
            ))}
          </ul>
        </Block>

        <Block id="paiement" icon={<Wallet className="size-6" aria-hidden="true" />} title="Paiement">
          <ul className="space-y-2">
            {site.payments.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-accent" aria-hidden="true" /> {p}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">Rien à payer sur le site : tu choisis ton moyen de paiement en commandant, et on te contacte pour confirmer avant la livraison.</p>
        </Block>

        <Block id="echanges" icon={<RefreshCcw className="size-6" aria-hidden="true" />} title="Échanges">
          <ul className="list-disc space-y-2 pl-5">
            {site.exchangePolicy.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </Block>

        <Block id="contact" icon={<MapPin className="size-6" aria-hidden="true" />} title="Contact">
          <p className="mb-4">Basés à {site.city}. Une question sur une taille, un stock, une livraison ? Écris-nous.</p>
          <a href={buildWhatsAppUrl(contactMessage())} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "lg")}>
            <WhatsAppIcon className="size-5" /> Écrire sur WhatsApp
          </a>
          <SocialLinks className="mt-5 text-ink" />
        </Block>
      </div>
    </div>
  );
}
