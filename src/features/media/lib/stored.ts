import { storedVariantsSchema } from "../schemas";
import type { MediaImage } from "../types";

/** Construit une image affichable depuis des colonnes lues en SQL brut (variants JSON non typé). */
export function mediaImageFromStored(row: {
  assetId: string;
  width: number | null;
  height: number | null;
  dominantColor: string | null;
  variants: unknown;
}): MediaImage | null {
  const parsed = storedVariantsSchema.safeParse(row.variants);
  if (!parsed.success || parsed.data.length === 0 || row.width === null || row.height === null) return null;
  return {
    assetId: row.assetId,
    width: row.width,
    height: row.height,
    dominantColor: row.dominantColor,
    variants: parsed.data.map(({ width, format, bytes }) => ({ width, format, bytes })),
  };
}
