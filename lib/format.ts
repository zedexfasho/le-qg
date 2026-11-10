const NBSP = " ";

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * Formate un montant FCFA : 25000 → "25 000 FCFA".
 * Les espaces sont insécables (U+00A0) pour qu'un prix ne soit jamais coupé
 * en fin de ligne, ni sur le site ni dans WhatsApp.
 */
export function formatPrice(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const digits = numberFormat.format(safe).replace(/[\s  ]/g, NBSP);
  return `${digits}${NBSP}FCFA`;
}

/** Libellé lisible d'une taille ("TU" → "Taille unique") */
export function formatSize(size: string): string {
  return size === "TU" ? "Taille unique" : `Taille ${size}`;
}

/** Date ISO → "8 novembre 2026" */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Dakar" }).format(date);
}

/** Minuscules sans accents, pour la recherche */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** "Gris chiné" → "gris-chine" */
export function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
