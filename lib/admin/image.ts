"use client";

/**
 * Prépare une photo dans le navigateur avant l'envoi :
 * - grande version 1200 px de large, petite version 600 px (petits écrans)
 * - WebP si le navigateur sait l'encoder, sinon JPEG
 * Une photo de téléphone de 5 Mo devient ~150 Ko : rapide à charger même en 3G.
 */
const FULL_WIDTH = 1200;
const SMALL_WIDTH = 600;

async function encode(bitmap: ImageBitmap, width: number, type: string): Promise<Blob> {
  const scale = Math.min(1, width / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Ton navigateur ne peut pas préparer la photo.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  if (!blob) throw new Error("Impossible de préparer la photo.");
  return blob;
}

export async function prepareImage(file: File): Promise<{ full: Blob; small: Blob }> {
  if (!file.type.startsWith("image/")) throw new Error("Ce fichier n'est pas une image.");
  // imageOrientation : respecte la rotation des photos de téléphone
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("Format de photo non reconnu (essaie en JPEG ou PNG).");
  });
  try {
    let full = await encode(bitmap, FULL_WIDTH, "image/webp");
    const type = full.type === "image/webp" ? "image/webp" : "image/jpeg";
    if (type !== full.type) full = await encode(bitmap, FULL_WIDTH, type);
    const small = await encode(bitmap, SMALL_WIDTH, type);
    return { full, small };
  } finally {
    bitmap.close();
  }
}
