import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { site } from "@/data/site";
import { pageMetadata } from "@/lib/seo";
import "./globals.css";

// Polices hébergées dans le projet (app/fonts, jeu « latin » avec les accents) :
// le build ne dépend pas de Google Fonts, donc pas de police de secours publiée par erreur.
const fredoka = localFont({
  src: "./fonts/fredoka-700-latin.woff2",
  weight: "700",
  variable: "--font-fredoka",
  display: "swap",
  fallback: ["ui-rounded", "Arial", "sans-serif"],
});
// Texte courant : pas de préchargement (police de secours ajustée par next/font, pas de décalage)
const inter = localFont({
  src: "./fonts/inter-variable-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
  preload: false,
  fallback: ["ui-sans-serif", "system-ui", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  ...pageMetadata({ path: "/" }),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s | ${site.name}` },
  applicationName: site.name,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FCEFDA" },
    { media: "(prefers-color-scheme: dark)", color: "#1E0E06" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${fredoka.variable} ${inter.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
