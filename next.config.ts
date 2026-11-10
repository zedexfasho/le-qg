import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * Le QG — site statique + API Cloudflare.
 *
 * `output: "export"` génère un dossier `out/` de fichiers HTML/CSS/JS, servi par Cloudflare.
 * L'API des commandes (dossier worker/) tourne à côté, sur le même domaine (/api, /media).
 *
 * En développement (`npm run dev`), /api et /media sont redirigés vers l'API locale
 * (`npm run dev:api`, port 8787).
 *
 * Les images sont déjà optimisées par nos scripts ou par le dashboard (grande + petite version),
 * le loader `lib/image-loader.ts` choisit la bonne taille sans serveur d'images.
 */
export default function config(phase: string): NextConfig {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    ...(dev
      ? {
          async rewrites() {
            const api = process.env.API_DEV_URL ?? "http://127.0.0.1:8787";
            return [
              { source: "/api/:path*", destination: `${api}/api/:path*` },
              { source: "/media/:path*", destination: `${api}/media/:path*` },
            ];
          },
        }
      : { output: "export" as const }),
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
}
