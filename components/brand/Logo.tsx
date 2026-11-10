import Image, { getImageProps } from "next/image";

/**
 * Logo officiel Le QG — le lettrage n'est jamais recréé en police.
 *
 * Pour passer plus tard à des fichiers SVG : déposer les SVG dans /public/brand
 * puis changer uniquement les chemins ci-dessous.
 */
export const LOGO_ASSETS = {
  wordmark: { src: "/brand/wordmark.webp", width: 661, height: 341 },
  wordmarkLight: { src: "/brand/wordmark-light.webp", width: 661, height: 341 },
  badge: { src: "/brand/badge.webp", width: 753, height: 748 },
  icon: { src: "/icons/icon-192.png", width: 192, height: 192 },
} as const;

type Variant = "badge" | "wordmark" | "icon";

interface LogoProps {
  variant: Variant;
  /** Largeur intrinsèque en px (la hauteur suit les proportions) */
  width: number;
  /** Attribut `sizes` si la largeur affichée varie selon l'écran */
  sizes?: string;
  className?: string;
  /** Image principale de la page : chargée en priorité */
  priority?: boolean;
  /** Pour le lettrage : "auto" suit le mode clair/sombre, "light" force la version crème */
  tone?: "auto" | "light" | "dark";
}

const ALT = "Le QG";

export function Logo({ variant, width, sizes, className = "", priority = false, tone = "auto" }: LogoProps) {
  if (variant === "wordmark") {
    const { wordmark, wordmarkLight } = LOGO_ASSETS;
    const height = Math.round((width * wordmark.height) / wordmark.width);
    const common = {
      alt: ALT,
      width,
      height,
      sizes: sizes ?? `${width}px`,
      loading: priority ? ("eager" as const) : ("lazy" as const),
      fetchPriority: priority ? ("high" as const) : undefined,
    };
    if (tone !== "auto") {
      const src = tone === "light" ? wordmarkLight.src : wordmark.src;
      return <Image {...common} src={src} alt={ALT} className={className} />;
    }
    // <picture> : le navigateur ne télécharge que la version adaptée au thème
    const dark = getImageProps({ ...common, src: wordmarkLight.src }).props;
    const { srcSet, ...light } = getImageProps({ ...common, src: wordmark.src }).props;
    return (
      <picture className={className}>
        <source media="(prefers-color-scheme: dark)" srcSet={dark.srcSet} sizes={dark.sizes} />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- img générée par getImageProps (alt inclus) */}
        <img {...light} srcSet={srcSet} />
      </picture>
    );
  }

  const asset = LOGO_ASSETS[variant];
  const height = Math.round((width * asset.height) / asset.width);
  return (
    <Image
      src={asset.src}
      alt={ALT}
      width={width}
      height={height}
      preload={priority}
      fetchPriority={priority ? "high" : undefined}
      sizes={sizes ?? `${width}px`}
      className={className}
    />
  );
}
