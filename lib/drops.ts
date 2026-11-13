/**
 * Drops (arrivages) gérés depuis le dashboard : règles du formulaire,
 * partagées par la page d'édition et par l'API (contrôle final).
 */

/** Illustration utilisée quand un drop n'a pas (encore) de photo de couverture */
export const DEFAULT_DROP_COVER = "/drops/default.webp";

/** Photo de couverture : envoyée depuis le dashboard (/media) ou fournie avec le site (/drops) */
export const DROP_COVER_RE = /^\/media\/[a-f0-9]{20}\.(webp|jpg|png)$|^\/drops\/[a-z0-9-]+\.webp$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Le jour existe vraiment (JavaScript transforme le 31 février en 3 mars) */
function isRealDay(date: string): boolean {
  const d = new Date(`${date}T10:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export interface DropFields {
  title: string;
  /** AAAA-MM-JJ (champ date du formulaire) */
  date: string;
  description: string;
  cover: string;
}

export interface DropData {
  title: string;
  /** Date ISO complète, enregistrée à 10h UTC pour éviter les décalages de fuseau */
  date: string;
  description: string | null;
  cover: string | null;
}

export type DropErrors = Partial<Record<keyof DropFields, string>>;

const text = (value: unknown) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");

/** Date ISO → valeur du champ date (AAAA-MM-JJ) */
export function dropDateInput(iso: string): string {
  return iso.slice(0, 10);
}

export function validateDrop(input: Partial<Record<keyof DropFields, unknown>>): { data: DropData | null; errors: DropErrors } {
  const errors: DropErrors = {};
  const title = text(input.title);
  const date = text(input.date);
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const cover = text(input.cover);

  if (title.length < 2) errors.title = "Donne un nom au drop.";
  else if (title.length > 80) errors.title = "Nom trop long (80 caractères maximum).";
  if (!DATE_RE.test(date) || !isRealDay(date)) errors.date = "Choisis la date de l'arrivage.";
  if (description.length > 300) errors.description = "Description trop longue (300 caractères maximum).";
  if (cover && !DROP_COVER_RE.test(cover)) errors.cover = "Photo de couverture invalide : envoie-la à nouveau.";

  if (Object.keys(errors).length) return { data: null, errors };
  return {
    data: { title, date: `${date}T10:00:00.000Z`, description: description || null, cover: cover || null },
    errors,
  };
}
