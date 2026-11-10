import type { Category } from "@/lib/types";

export interface CategoryInfo {
  id: Category;
  label: string;
  /** Phrase courte affichée sur la carte et en meta description */
  blurb: string;
}

export const categories: CategoryInfo[] = [
  { id: "hoodies", label: "Hoodies", blurb: "Zippés ou à capuche, pour les soirées fraîches." },
  { id: "ensembles", label: "Ensembles", blurb: "Survêtements assortis, haut + bas." },
  { id: "joggings", label: "Joggings", blurb: "Cargo, slim ou classiques." },
  { id: "tshirts", label: "T-shirts", blurb: "Graphiques, unis, oversize." },
  { id: "maillots", label: "Maillots", blurb: "Rétro et actuels." },
  { id: "chemises", label: "Chemises", blurb: "Manches courtes, wax et unies." },
  { id: "accessoires", label: "Accessoires", blurb: "Bonnets, casquettes, sacoches." },
];

export function getCategoryInfo(id: string): CategoryInfo | undefined {
  return categories.find((c) => c.id === id);
}
