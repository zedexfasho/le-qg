/**
 * Loader d'images pour l'export statique.
 *
 * Chaque image de `/products`, `/drops` et `/brand` existe en deux tailles :
 *   - `nom.webp`     (jusqu'à 1200 px de large)
 *   - `nom-sm.webp`  (600 px de large), servie aux petits écrans
 * Le paramètre `?w=` ne sert qu'à respecter le contrat de next/image.
 */
const RESPONSIVE = /^\/(products|drops|brand)\/.+\.webp$/;

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  if (width <= 640 && RESPONSIVE.test(src) && !src.endsWith("-sm.webp")) {
    return `${src.replace(/\.webp$/, "-sm.webp")}?w=${width}`;
  }
  return `${src}?w=${width}`;
}
