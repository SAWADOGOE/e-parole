import { deleteObjects } from "@/server/storage/s3";
import { PENDING_TTL_HOURS, UNREFERENCED_TTL_DAYS } from "../constants";
import { deleteAssetRows, findExpiredAssets } from "./repository";

const BATCH = 200;

/** Job media.cleanup : envois abandonnés (> 24 h), refus, et images prêtes jamais rattachées (> 7 jours). */
export async function cleanupExpiredMedia(now: Date = new Date()): Promise<number> {
  const pendingBefore = new Date(now.getTime() - PENDING_TTL_HOURS * 3_600_000);
  const unreferencedBefore = new Date(now.getTime() - UNREFERENCED_TTL_DAYS * 86_400_000);
  let removed = 0;
  for (;;) {
    const assets = await findExpiredAssets(pendingBefore, unreferencedBefore, BATCH);
    if (assets.length === 0) return removed;
    await deleteObjects(assets.flatMap((asset) => [asset.key, ...asset.variants.map((variant) => variant.key)]));
    removed += await deleteAssetRows(assets.map((asset) => asset.id));
    if (assets.length < BATCH) return removed;
  }
}
