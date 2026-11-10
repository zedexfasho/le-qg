import type { NextConfig } from "next";

/**
 * Le QG — site 100 % statique.
 *
 * `output: "export"` génère un dossier `out/` de fichiers HTML/CSS/JS :
 * déployable tel quel sur Vercel, Netlify, Hostinger ou n'importe quel hébergeur.
 *
 * Les images sont déjà optimisées par nos scripts (WebP 1200 px + version 600 px),
 * le loader `lib/image-loader.ts` choisit la bonne taille sans serveur d'images.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    deviceSizes: [640, 828, 1200],
    imageSizes: [96, 256, 384],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
