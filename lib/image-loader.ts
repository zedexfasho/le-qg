/**
 * Loader d'images pour l'export statique.
 *
 * Chaque image de `/products`, `/drops`, `/brand` et `/media` (photos ajoutées depuis
 * le dashboard) existe en deux tailles :
 *   - `nom.webp`     (jusqu'à 1200 px de large)
 *   - `nom-sm.webp`  (600 px de large), servie aux petits écrans
 * Les photos du dashboard peuvent aussi être en .jpg (navigateurs sans WebP).
 * Le paramètre `?w=` ne sert qu'à respecter le contrat de next/image.
 */
const RESPONSIVE = /^\/(products|drops|brand)\/.+\.webp$|^\/media\/[a-f0-9]+\.(webp|jpg|png)$/;

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  if (width <= 640 && RESPONSIVE.test(src)) {
    return `${src.replace(/\.(webp|jpg|png)$/, "-sm.$1")}?w=${width}`;
  }
  return `${src}?w=${width}`;
}
