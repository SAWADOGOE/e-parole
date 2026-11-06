import { deleteObjects } from "@/server/storage/s3";
import { PENDING_TTL_HOURS, UNREFERENCED_TTL_DAYS, VARIANT_FORMATS, VARIANT_WIDTHS } from "../constants";
import { storedVariantsSchema } from "../schemas";
import { deleteExpiredAssets } from "./repository";
import { variantKey } from "./process";

const BATCH = 200;
const ALL_WIDTHS = [...new Set(Object.values(VARIANT_WIDTHS).flat())];

/** Toutes les clés possibles d'un asset : un traitement interrompu peut avoir écrit des variantes non enregistrées. */
function keysOf(asset: { id: string; key: string; variants: unknown }): string[] {
  const parsed = storedVariantsSchema.safeParse(asset.variants);
  const recorded = parsed.success ? parsed.data.map((variant) => variant.key) : [];
  const possible = ALL_WIDTHS.flatMap((width) => VARIANT_FORMATS.map((format) => variantKey(asset.id, width, format)));
  return [...new Set([asset.key, ...recorded, ...possible])];
}

/**
 * Job media.cleanup : envois abandonnés (> 24 h), refus, images prêtes jamais rattachées (> 7 jours).
 * Les lignes sont supprimées d'abord (condition revérifiée), le stockage ensuite : jamais d'image cassée.
 */
export async function cleanupExpiredMedia(now: Date = new Date()): Promise<number> {
  const pendingBefore = new Date(now.getTime() - PENDING_TTL_HOURS * 3_600_000);
  const unreferencedBefore = new Date(now.getTime() - UNREFERENCED_TTL_DAYS * 86_400_000);
  let removed = 0;
  for (;;) {
    const deleted = await deleteExpiredAssets(pendingBefore, unreferencedBefore, BATCH);
    if (deleted.length > 0) await deleteObjects(deleted.flatMap(keysOf));
    removed += deleted.length;
    if (deleted.length < BATCH) return removed;
  }
}
