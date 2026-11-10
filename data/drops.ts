import type { Drop } from "@/lib/types";

/**
 * Arrivages (« drops »). Un produit appartient à un drop via son champ `dropId`.
 * La couverture se range dans /public/drops/<id>.webp (+ <id>-sm.webp).
 */
export const drops: Drop[] = [
  {
    id: "drop-novembre-2026",
    title: "Drop de novembre",
    date: "2026-11-06T10:00:00.000Z",
    cover: "/drops/drop-novembre-2026.webp",
    description: "Hoodies épais, ensembles coton et cargos : de quoi tenir les soirées fraîches de la saison.",
  },
  {
    id: "drop-octobre-2026",
    title: "Drop d'octobre",
    date: "2026-10-15T10:00:00.000Z",
    cover: "/drops/drop-octobre-2026.webp",
    description: "Maillots rétro, chemises wax et accessoires pour finir la saison des pluies en beauté.",
  },
];
