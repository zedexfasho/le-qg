/**
 * ================================================================
 *  RÉGLAGES DE LA BOUTIQUE — le seul fichier à modifier au quotidien
 * ================================================================
 *  Tout ce qui est marqué « À REMPLIR » doit être complété avant
 *  la mise en ligne publique.
 */

/** Adresse publique du site. Sur Vercel, l'adresse du projet est détectée automatiquement. */
function resolveSiteUrl(): string {
  // `process` n'existe pas dans le Worker Cloudflare (API) : on se contente alors de la valeur par défaut
  const env: Record<string, string | undefined> = typeof process === "undefined" ? {} : process.env;
  const fromEnv = env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const site = {
  name: "Le QG",
  url: resolveSiteUrl(),
  tagline: "Streetwear à Dakar — commande en ligne ou sur WhatsApp",
  description:
    "Le QG, ton spot streetwear à Dakar : hoodies, ensembles, joggings, t-shirts, maillots et accessoires. Nouveaux drops chaque semaine, commande en ligne ou sur WhatsApp, livraison Dakar 24h.",

  /**
   * À REMPLIR — numéro WhatsApp de commande.
   * Format accepté : "+221 77 123 45 67", "771234567" ou "221771234567".
   * Tant qu'il est vide, WhatsApp s'ouvre et le client choisit lui-même le destinataire.
   */
  whatsapp: "" as string,

  /** À REMPLIR — identifiants sans le @ (laisser vide pour masquer le lien) */
  socials: {
    instagram: "" as string,
    snapchat: "" as string,
    tiktok: "" as string,
  },

  city: "Dakar",
  country: "SN",

  /** Bandeau défilant de l'accueil */
  marquee: ["Livraison Dakar 24h", "Wave / Orange Money / paiement à la livraison", "Nouveaux drops chaque semaine"],

  /** Moyens de paiement (repris dans le message WhatsApp et la page Infos) */
  payments: ["Wave", "Orange Money", "Paiement à la livraison"],
  /** Ligne « Paiement : … » du message WhatsApp */
  paymentLine: "Wave / Orange Money / à la livraison",

  /**
   * À REMPLIR — zones et tarifs de livraison (FCFA).
   * `price: null` affiche « Tarif à confirmer » (frais à 0 sur la commande, à régler dans le dashboard).
   */
  delivery: [
    { zone: "Dakar", detail: "Plateau, Médina, Mermoz, Ouakam, Almadies, Parcelles…", delay: "24h", price: null as number | null },
    { zone: "Banlieue", detail: "Pikine, Guédiawaye, Keur Massar, Rufisque…", delay: "24 à 48h", price: null as number | null },
    { zone: "Régions", detail: "Envoi par transporteur (Thiès, Mbour, Saint-Louis, Touba…)", delay: "2 à 4 jours", price: null as number | null },
  ],

  /** À REMPLIR — politique d'échange */
  exchangePolicy: [
    "Échange possible sous 48h après la livraison si la taille ne va pas.",
    "L'article doit être non porté, non lavé, avec son étiquette.",
    "Les frais de livraison de l'échange sont à la charge du client.",
  ],

  /**
   * À REMPLACER — texte de « Notre histoire » (un paragraphe par ligne du tableau).
   * Brouillon rédigé à partir du brief.
   */
  story: [
    "Le QG, c'est d'abord une terrasse. Celle où on se retrouvait entre potes après les cours, sur des chaises en plastique, le thé qui tourne et le soleil qui se couche sur la ville.",
    "C'était notre quartier général : on y parlait de tout, de foot, de musique… et beaucoup de sapes. Qui avait trouvé le meilleur hoodie, le maillot introuvable, la casquette parfaite.",
    "Aujourd'hui, Le QG devient une boutique. Même esprit : un spot où on se sent chez soi, des pièces choisies une par une, des drops réguliers et une commande aussi simple qu'un message à un pote.",
    "Dalal ak jamm au QG. Installe-toi, regarde, et si quelque chose te plaît, écris-nous.",
  ],
} as const;

export type Site = typeof site;
