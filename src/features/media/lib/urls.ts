import type { MediaImage } from "../types";

/** Adresse d'une variante servie par l'application (jamais l'URL du stockage). */
export function variantUrl(assetId: string, width: number, format: "avif" | "webp"): string {
  return `/api/media/${assetId}/${width}.${format}`;
}

export function srcSet(image: MediaImage, format: "avif" | "webp", maxWidth = Infinity): string {
  return image.variants
    .filter((variant) => variant.format === format && variant.width <= maxWidth)
    .map((variant) => `${variantUrl(image.assetId, variant.width, format)} ${variant.width}w`)
    .join(", ");
}

export function smallest(image: MediaImage, format: "avif" | "webp"): { width: number; bytes: number } | null {
  const candidates = image.variants.filter((variant) => variant.format === format).sort((a, b) => a.width - b.width);
  return candidates[0] ?? null;
}
