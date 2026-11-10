import type { Metadata } from "next";
import { site } from "@/data/site";

export const DEFAULT_OG = { url: "/og/og-default.jpg", width: 1200, height: 630, alt: "Le QG — streetwear à Dakar" };

interface PageMeta {
  title?: string;
  description?: string;
  /** Chemin de la page, avec slash final (ex. "/shop/") */
  path: string;
  image?: { url: string; width: number; height: number; alt: string };
}

/** Metadata + Open Graph d'une page (aperçu propre quand le lien est partagé sur WhatsApp) */
export function pageMetadata({ title, description = site.description, path, image = DEFAULT_OG }: PageMeta): Metadata {
  const fullTitle = title ? `${title} | ${site.name}` : `${site.name} — ${site.tagline}`;
  return {
    title: title ?? { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "fr_SN",
      siteName: site.name,
      url: path,
      title: fullTitle,
      description,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image.url] },
  };
}
