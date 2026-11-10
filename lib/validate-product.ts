import { CATEGORIES, SIZES, type Product } from "./types";

/**
 * Vérifie un produit (utilisé par le script d'ajout et par les tests du catalogue).
 * Renvoie la liste des erreurs, en français ; tableau vide = produit valide.
 */
/**
 * requireImages: false = brouillon : photos et prix peuvent manquer (prix 0), ils seront exigés à la publication.
 */
export function validateProduct(input: unknown, options: { requireImages?: boolean } = {}): string[] {
  const errors: string[] = [];
  const draft = options.requireImages === false;
  const p = input as Partial<Product> & Record<string, unknown>;
  if (typeof input !== "object" || input === null) return ["Le produit doit être un objet JSON."];

  if (typeof p.slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) {
    errors.push(`slug invalide (« ${String(p.slug)} ») : minuscules, chiffres et tirets uniquement, ex. "hoodie-zippe-noir".`);
  }
  if (typeof p.name !== "string" || p.name.trim().length < 2) errors.push("name manquant.");
  if (typeof p.condition !== "string" || !p.condition.trim()) errors.push('condition manquante (ex. "Neuf avec étiquette").');
  if (!CATEGORIES.includes(p.category as never)) errors.push(`category invalide : choisir parmi ${CATEGORIES.join(", ")}.`);
  if (!Number.isInteger(p.price) || (p.price as number) < 0 || (!draft && p.price === 0)) errors.push("price doit être un nombre entier positif en FCFA (ex. 25000).");
  if (p.oldPrice !== undefined && p.price !== 0 && (!Number.isInteger(p.oldPrice) || (p.oldPrice as number) <= (p.price as number))) {
    errors.push("oldPrice doit être un entier supérieur à price (ou être retiré).");
  }
  if (typeof p.description !== "string") errors.push("description manquante (peut être vide : \"\").");
  if (p.createdAt !== undefined && Number.isNaN(Date.parse(String(p.createdAt)))) errors.push("createdAt n'est pas une date ISO valide.");

  if (!Array.isArray(p.variants) || p.variants.length === 0) {
    errors.push("variants : au moins une couleur est nécessaire.");
    return errors;
  }

  const seen = new Set<string>();
  p.variants.forEach((v, i) => {
    const where = `variants[${i}]`;
    if (typeof v?.color !== "string" || !v.color.trim()) errors.push(`${where}.color manquant.`);
    else if (seen.has(v.color)) errors.push(`${where}.color « ${v.color} » en double.`);
    else seen.add(v.color);
    if (typeof v?.colorHex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(v.colorHex)) errors.push(`${where}.colorHex doit ressembler à "#1C1A19".`);
    if (!Array.isArray(v?.images) || (options.requireImages !== false && v.images.length === 0)) {
      errors.push(`${where}.images : au moins une photo.`);
    }
    if (typeof v?.stock !== "object" || v.stock === null || Object.keys(v.stock).length === 0) {
      errors.push(`${where}.stock : indiquer au moins une taille, ex. { "M": 2, "L": 1 }.`);
    } else {
      for (const [size, qty] of Object.entries(v.stock)) {
        if (!SIZES.includes(size as never)) errors.push(`${where}.stock : taille « ${size} » inconnue (${SIZES.join(", ")}).`);
        if (!Number.isInteger(qty) || (qty as number) < 0) errors.push(`${where}.stock.${size} doit être un entier ≥ 0.`);
      }
    }
  });

  return errors;
}
