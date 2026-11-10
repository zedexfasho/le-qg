import type { Metadata, Viewport } from "next";
import { Fredoka, Inter } from "next/font/google";
import { site } from "@/data/site";
import { pageMetadata } from "@/lib/seo";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["700"], variable: "--font-fredoka", display: "swap" });
// Texte courant : pas de préchargement (police de secours ajustée par next/font, pas de décalage)
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", preload: false });

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
