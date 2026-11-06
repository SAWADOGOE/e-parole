import { db } from "@/server/db";
import { col, notBlocked, visibleAccount } from "../sql";

/**
 * Une image n'est servie qu'à qui voit le contenu qui la porte (ADR-012) : son propriétaire, ou tout membre qui voit
 * la publication (non supprimée, non masquée, sans blocage) ou le profil (avatar, bannière) auquel elle est rattachée.
 */
export async function canViewAsset(viewerId: string, assetId: string): Promise<boolean> {
  const rows = await db.$queryRaw<{ ok: number }[]>`
    SELECT 1 AS "ok" FROM "media_asset" a
    WHERE a."id" = ${assetId} AND a."status" = 'READY' AND (
      a."ownerId" = ${viewerId}
      OR EXISTS (
        SELECT 1 FROM "post_media" m JOIN "post" p ON p."id" = m."postId" JOIN "user" u ON u."id" = p."authorId"
        WHERE m."assetId" = a."id" AND p."deletedAt" IS NULL AND NOT p."isHidden"
          AND ${visibleAccount(col("u"))} AND ${notBlocked(viewerId, col('p."authorId"'))})
      OR EXISTS (
        SELECT 1 FROM "profile" pr JOIN "user" u ON u."id" = pr."userId"
        WHERE (pr."avatarId" = a."id" OR pr."bannerId" = a."id")
          AND ${visibleAccount(col("u"))} AND ${notBlocked(viewerId, col('pr."userId"'))})
    )`;
  return rows.length > 0;
}

/** Les modérateurs voient les images des contenus signalés, même masqués ou retirés. */
export async function isAssetLinkedToContent(assetId: string): Promise<boolean> {
  const count = await db.mediaAsset.count({
    where: { id: assetId, status: "READY", OR: [{ postMedia: { isNot: null } }, { avatarOf: { isNot: null } }, { bannerOf: { isNot: null } }] },
  });
  return count > 0;
}
