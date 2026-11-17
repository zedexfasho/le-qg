/**
 * Photos « portées » de la vitrine (accueil › Le QG en vrai, et page Notre histoire).
 * Fichiers dans public/lookbook/ : nom.webp (1050 × 1400) + nom-sm.webp (600 × 800).
 * Pour changer une photo : remplace les deux fichiers (même nom) ou ajoute une ligne ici.
 */
export interface LookbookPhoto {
  src: string;
  /** Description pour les malvoyants et Google */
  alt: string;
  /** Rayon du catalogue où l'on trouve la tenue */
  category?: string;
}

export const lookbook: LookbookPhoto[] = [
  { src: "/lookbook/duo-bleu-noir.webp", alt: "Deux gars du QG au bord du fleuve, ensemble bleu ciel et ensemble noir", category: "ensembles" },
  { src: "/lookbook/coucher-de-soleil.webp", alt: "Sweat graphique noir et bob beige au coucher du soleil", category: "hoodies" },
  { src: "/lookbook/ensemble-taupe.webp", alt: "Ensemble zippé taupe sur un chemin de brousse", category: "ensembles" },
  { src: "/lookbook/enfants-riches-deprimes.webp", alt: "Deux potes en manches longues, l'un en raglan blanc, l'autre en noir à fleurs de cerisier", category: "hoodies" },
  { src: "/lookbook/duo-blanc.webp", alt: "Deux ensembles zippés blanc et gris clair devant une case", category: "ensembles" },
  { src: "/lookbook/bleu-nuit.webp", alt: "Hoodie bleu de nuit, téléphone en main, au bord de l'eau", category: "ensembles" },
];

/** Photos de la page Notre histoire */
export const storyPhotos: LookbookPhoto[] = [
  { src: "/lookbook/duo-plage.webp", alt: "Deux gars du QG sur la plage, entre les bancs" },
  { src: "/lookbook/longsleeve-lac.webp", alt: "Manches longues à fleurs de cerisier, au bord du lac" },
  { src: "/lookbook/coucher-de-soleil.webp", alt: "Bob beige et sweat noir au coucher du soleil" },
];
