import { site } from "@/data/site";
import { normalizePhone } from "@/lib/phone";

/** Données structurées de la boutique (schema.org ClothingStore) pour Google, sur l'accueil */
export function StoreJsonLd() {
  const phone = normalizePhone(site.whatsapp);
  const { instagram, snapchat, tiktok } = site.socials;
  const sameAs = [
    instagram && `https://www.instagram.com/${instagram}/`,
    snapchat && `https://www.snapchat.com/add/${snapchat}`,
    tiktok && `https://www.tiktok.com/@${tiktok}`,
  ].filter(Boolean);

  const data = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: site.name,
    url: `${site.url}/`,
    description: site.description,
    logo: `${site.url}/brand/logo-badge.png`,
    image: `${site.url}/og/og-default.jpg`,
    address: { "@type": "PostalAddress", addressLocality: site.city, addressCountry: site.country },
    areaServed: site.delivery.map((d) => d.zone),
    currenciesAccepted: "XOF",
    paymentAccepted: site.payments.join(", "),
    ...(phone ? { telephone: `+${phone}` } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };

  return (
    <script
      type="application/ld+json"
      // Échappe "<" pour qu'aucun texte ne puisse fermer la balise script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
