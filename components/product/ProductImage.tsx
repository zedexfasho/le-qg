"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { PLACEHOLDER_IMAGE } from "@/lib/product";

/**
 * next/image avec image de secours : si une photo manque (fichier supprimé,
 * faute de frappe dans products.ts), on affiche le placeholder cintre.
 */
export function ProductImage({ src, alt, ...props }: Omit<ImageProps, "src"> & { src?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const resolved = !src || failed === src ? PLACEHOLDER_IMAGE : src;
  return <Image {...props} src={resolved} alt={alt} onError={() => setFailed(src ?? null)} />;
}
