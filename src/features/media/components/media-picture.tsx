import { cn } from "@/lib/cn";
import { smallest, srcSet, variantUrl } from "../lib/urls";
import type { MediaImage } from "../types";

interface MediaPictureProps {
  image: MediaImage;
  alt: string;
  sizes: string;
  className?: string;
  /** Économie de données : l'image n'est chargée que sur demande, en 320 px (≤ 60 Ko). */
  dataSaver?: boolean;
  /** Libellé du bouton d'affichage en économie de données ; reçoit le poids en Ko. */
  showLabel?: (kilobytes: number) => string;
}

/**
 * Image ré-encodée (AVIF puis WebP), dimensions connues pour éviter tout décalage, couleur dominante en attendant.
 * Pas de next/image : les variantes sont produites par le worker, l'optimiseur de Next ne servirait à rien.
 * En économie de données, un <details> natif retarde le téléchargement sans aucun JavaScript.
 */
export function MediaPicture({ image, alt, sizes, className, dataSaver = false, showLabel }: MediaPictureProps) {
  const fallback = smallest(image, "webp");
  if (!fallback) return null;
  const picture = (limit?: number) => (
    <picture>
      <source type="image/avif" srcSet={srcSet(image, "avif", limit)} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(image, "webp", limit)} sizes={sizes} />
      <img
        src={variantUrl(image.assetId, fallback.width, "webp")}
        width={image.width}
        height={image.height}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn("h-auto w-full rounded-lg bg-bg-subtle object-cover", className)}
        style={image.dominantColor ? { backgroundColor: image.dominantColor } : undefined}
      />
    </picture>
  );
  if (!dataSaver || !showLabel) return picture();
  const light = smallest(image, "avif") ?? fallback;
  return (
    <details className="rounded-lg border bg-bg-subtle">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-accent">
        {showLabel(Math.max(1, Math.round(light.bytes / 1024)))}
      </summary>
      <div className="p-2">{picture(320)}</div>
    </details>
  );
}
