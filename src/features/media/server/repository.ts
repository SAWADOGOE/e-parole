import { db, type TransactionClient } from "@/server/db";
import type { UploadPurpose } from "../constants";
import { storedVariantsSchema } from "../schemas";
import type { MediaImage, MediaStatusName, MediaVariant } from "../types";

export interface AssetRow {
  id: string;
  ownerId: string;
  purpose: UploadPurpose | "COMMUNITY_IMAGE" | "VERIFICATION_DOCUMENT";
  key: string;
  mime: string;
  size: number;
  status: MediaStatusName;
  errorCode: string | null;
  width: number | null;
  height: number | null;
  dominantColor: string | null;
  variants: MediaVariant[];
}

const ASSET_SELECT = {
  id: true,
  ownerId: true,
  purpose: true,
  key: true,
  mime: true,
  size: true,
  status: true,
  errorCode: true,
  width: true,
  height: true,
  dominantColor: true,
  variants: true,
} as const;

function toRow(asset: {
  id: string;
  ownerId: string;
  purpose: AssetRow["purpose"];
  key: string;
  mime: string;
  size: number;
  status: MediaStatusName;
  errorCode: string | null;
  width: number | null;
  height: number | null;
  dominantColor: string | null;
  variants: unknown;
}): AssetRow {
  const parsed = storedVariantsSchema.safeParse(asset.variants);
  return { ...asset, variants: parsed.success ? parsed.data : [] };
}

export function toMediaImage(row: Pick<AssetRow, "id" | "width" | "height" | "dominantColor" | "variants">): MediaImage | null {
  if (row.width === null || row.height === null || row.variants.length === 0) return null;
  return {
    assetId: row.id,
    width: row.width,
    height: row.height,
    dominantColor: row.dominantColor,
    variants: row.variants.map(({ width, format, bytes }) => ({ width, format, bytes })),
  };
}

export async function findAsset(assetId: string): Promise<AssetRow | null> {
  const asset = await db.mediaAsset.findUnique({ where: { id: assetId }, select: ASSET_SELECT });
  return asset ? toRow(asset) : null;
}

/** Envois non terminés et volume stocké, pour les quotas. */
export async function usageFor(ownerId: string): Promise<{ pending: number; storedBytes: number }> {
  const [pending, stored] = await Promise.all([
    db.mediaAsset.count({ where: { ownerId, status: { in: ["PENDING", "PROCESSING"] } } }),
    db.$queryRaw<{ bytes: bigint | null }[]>`
      SELECT SUM((v->>'bytes')::bigint) AS bytes
      FROM "media_asset" a, jsonb_array_elements(a."variants") v
      WHERE a."ownerId" = ${ownerId} AND a."status" = 'READY'`,
  ]);
  return { pending, storedBytes: Number(stored[0]?.bytes ?? 0) };
}

export async function createPendingAsset(data: {
  ownerId: string;
  purpose: UploadPurpose;
  bucket: string;
  key: string;
  mime: string;
  size: number;
}): Promise<string> {
  const asset = await db.mediaAsset.create({ data: { ...data, status: "PENDING", isPublic: false }, select: { id: true } });
  return asset.id;
}

/** PENDING → PROCESSING, seulement pour le propriétaire (sinon 0 ligne). */
export async function markUploaded(assetId: string, ownerId: string): Promise<number> {
  const result = await db.mediaAsset.updateMany({
    where: { id: assetId, ownerId, status: "PENDING" },
    data: { status: "PROCESSING", uploadedAt: new Date() },
  });
  return result.count;
}

export async function markReady(
  assetId: string,
  data: { width: number; height: number; sha256: string; dominantColor: string; variants: readonly MediaVariant[] },
): Promise<void> {
  await db.mediaAsset.updateMany({
    where: { id: assetId, status: "PROCESSING" },
    data: { ...data, variants: [...data.variants].map((v) => ({ ...v })), status: "READY", processedAt: new Date(), errorCode: null },
  });
}

export async function markRejected(assetId: string, errorCode: string): Promise<void> {
  await db.mediaAsset.updateMany({
    where: { id: assetId, status: { in: ["PENDING", "PROCESSING"] } },
    data: { status: "REJECTED", errorCode, processedAt: new Date() },
  });
}

/** Image prête appartenant à ce membre, pour cet usage (vérifiée avant de l'attacher à un contenu). */
export async function findOwnedReadyAssets(
  ownerId: string,
  assetIds: readonly string[],
  purpose: UploadPurpose,
  tx: TransactionClient = db,
): Promise<AssetRow[]> {
  if (assetIds.length === 0) return [];
  const rows = await tx.mediaAsset.findMany({
    where: { id: { in: [...assetIds] }, ownerId, purpose, status: "READY" },
    select: ASSET_SELECT,
  });
  return rows.map(toRow);
}

/** Assets à supprimer : envois jamais terminés, refusés, ou prêts mais rattachés à rien depuis trop longtemps. */
export async function findExpiredAssets(pendingBefore: Date, unreferencedBefore: Date, limit: number): Promise<AssetRow[]> {
  const ids = await db.$queryRaw<{ id: string }[]>`
    SELECT a."id" FROM "media_asset" a
    WHERE (a."status" IN ('PENDING', 'PROCESSING', 'REJECTED') AND a."createdAt" < ${pendingBefore})
       OR (a."status" = 'READY' AND a."createdAt" < ${unreferencedBefore}
           AND NOT EXISTS (SELECT 1 FROM "post_media" m WHERE m."assetId" = a."id")
           AND NOT EXISTS (SELECT 1 FROM "profile" p WHERE p."avatarId" = a."id" OR p."bannerId" = a."id"))
    ORDER BY a."createdAt"
    LIMIT ${limit}`;
  if (ids.length === 0) return [];
  const rows = await db.mediaAsset.findMany({ where: { id: { in: ids.map((r) => r.id) } }, select: ASSET_SELECT });
  return rows.map(toRow);
}

export async function deleteAssetRows(assetIds: readonly string[]): Promise<number> {
  const result = await db.mediaAsset.deleteMany({ where: { id: { in: [...assetIds] } } });
  return result.count;
}

/** Images prêtes, dans l'ordre demandé (dossier de modération : images de la copie figée). */
export async function findReadyImages(assetIds: readonly string[]): Promise<MediaImage[]> {
  if (assetIds.length === 0) return [];
  const rows = await db.mediaAsset.findMany({ where: { id: { in: [...assetIds] }, status: "READY" }, select: ASSET_SELECT });
  const byId = new Map(rows.map((row) => [row.id, toMediaImage(toRow(row))]));
  return assetIds.flatMap((id) => {
    const image = byId.get(id);
    return image ? [image] : [];
  });
}
