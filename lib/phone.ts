/**
 * Normalise un numéro sénégalais au format international attendu par wa.me.
 *   "+221 77 123 45 67" → "221771234567"
 *   "77 123 45 67"      → "221771234567"
 *   "00221771234567"    → "221771234567"
 * Renvoie `null` si le numéro est invalide.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 9) digits = `221${digits}`;
  return /^221[37]\d{8}$/.test(digits) ? digits : null;
}

/** Affichage lisible : "221771234567" → "77 123 45 67" */
export function formatPhone(input: string | null | undefined): string {
  const n = normalizePhone(input);
  if (!n) return input ?? "";
  const d = n.slice(3);
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}
