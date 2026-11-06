import { mediaImageFromStored } from "@/features/media";
import { db, Prisma, type TransactionClient } from "@/server/db";
import type { Cursor } from "@/lib/cursor";
import type { PersonSummary, RelationEntry, VerifiedBadgeName } from "../../types";
import { col, notBlocked, visibleAccount } from "../sql";

export interface RelationState {
  following: boolean;
  followedBy: boolean;
  muted: boolean;
}

/** Personne visible par l'acteur (compte affiché, aucun blocage) : sinon null, qui devient un 404. */
export async function findVisibleUserId(viewerId: string, userId: string, tx: TransactionClient = db): Promise<string | null> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT u."id" FROM "user" u
    WHERE u."id" = ${userId} AND ${visibleAccount(col("u"))} AND ${notBlocked(viewerId, col('u."id"'))}`;
  return rows[0]?.id ?? null;
}

export async function isBlockedEitherWay(a: string, b: string, tx: TransactionClient = db): Promise<boolean> {
  const count = await tx.block.count({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] } });
  return count > 0;
}

export async function relationState(viewerId: string, targetId: string): Promise<RelationState> {
  const [following, followedBy, muted] = await Promise.all([
    db.follow.count({ where: { followerId: viewerId, followingId: targetId } }),
    db.follow.count({ where: { followerId: targetId, followingId: viewerId } }),
    db.mute.count({ where: { muterId: viewerId, mutedId: targetId } }),
  ]);
  return { following: following > 0, followedBy: followedBy > 0, muted: muted > 0 };
}

/** Renvoie true si l'abonnement vient d'être créé (seul ce cas notifie). */
export async function setFollow(tx: TransactionClient, followerId: string, followingId: string, active: boolean): Promise<boolean> {
  if (!active) {
    await tx.follow.deleteMany({ where: { followerId, followingId } });
    return false;
  }
  const inserted = await tx.$executeRaw`
    INSERT INTO "follow" ("followerId", "followingId") VALUES (${followerId}, ${followingId}) ON CONFLICT DO NOTHING`;
  return inserted === 1;
}

/** Bloquer retire les abonnements dans les deux sens, dans la même transaction. Aucune notification n'est créée. */
export async function setBlock(tx: TransactionClient, blockerId: string, blockedId: string, active: boolean): Promise<void> {
  if (!active) {
    await tx.block.deleteMany({ where: { blockerId, blockedId } });
    return;
  }
  await tx.$executeRaw`INSERT INTO "block" ("blockerId", "blockedId") VALUES (${blockerId}, ${blockedId}) ON CONFLICT DO NOTHING`;
  await tx.follow.deleteMany({
    where: { OR: [{ followerId: blockerId, followingId: blockedId }, { followerId: blockedId, followingId: blockerId }] },
  });
}

export async function setMute(muterId: string, mutedId: string, active: boolean): Promise<void> {
  if (!active) {
    await db.mute.deleteMany({ where: { muterId, mutedId } });
    return;
  }
  await db.$executeRaw`INSERT INTO "mute" ("muterId", "mutedId") VALUES (${muterId}, ${mutedId}) ON CONFLICT DO NOTHING`;
}

/** Liste privée des personnes bloquées ou en sourdine par l'acteur (réglages de confidentialité). */
export async function listOwnRelations(viewerId: string, kind: "block" | "mute"): Promise<RelationEntry[]> {
  const rows =
    kind === "block"
      ? await db.block.findMany({
          where: { blockerId: viewerId },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { createdAt: true, blocked: { select: { id: true, profile: { select: { handle: true, displayName: true } } } } },
        }).then((list) => list.map((row) => ({ since: row.createdAt, user: row.blocked })))
      : await db.mute.findMany({
          where: { muterId: viewerId },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { createdAt: true, muted: { select: { id: true, profile: { select: { handle: true, displayName: true } } } } },
        }).then((list) => list.map((row) => ({ since: row.createdAt, user: row.muted })));
  return rows.flatMap(({ since, user }) =>
    user.profile ? [{ userId: user.id, handle: user.profile.handle, displayName: user.profile.displayName, since }] : [],
  );
}

interface PersonRow {
  userId: string;
  handle: string;
  displayName: string;
  bio: string | null;
  verifiedBadge: VerifiedBadgeName | null;
  avatarId: string | null;
  avatarWidth: number | null;
  avatarHeight: number | null;
  avatarColor: string | null;
  avatarVariants: unknown;
  following: boolean;
  sortAt: Date;
}

export function toPerson(row: PersonRow): PersonSummary {
  return {
    userId: row.userId,
    handle: row.handle,
    displayName: row.displayName,
    bio: row.bio,
    verifiedBadge: row.verifiedBadge,
    following: row.following,
    avatar: row.avatarId
      ? mediaImageFromStored({ assetId: row.avatarId, width: row.avatarWidth, height: row.avatarHeight, dominantColor: row.avatarColor, variants: row.avatarVariants })
      : null,
  };
}

/**
 * Personnes (abonnés, abonnements, recherche). Les profils non découvrables (mineurs par défaut) n'apparaissent
 * jamais dans la liste d'autrui ni dans la recherche ; les comptes bloqués dans un sens ou dans l'autre non plus.
 */
export async function selectPeople(
  viewerId: string,
  options: { join: Prisma.Sql; where: Prisma.Sql; sortColumn: Prisma.Sql; cursor: Cursor | null; limit: number; showUndiscoverable: boolean },
): Promise<{ items: PersonSummary[]; last: Cursor | null; hasMore: boolean }> {
  const cursorCondition = options.cursor
    ? Prisma.sql`AND (${options.sortColumn}, u."id") < (${options.cursor.createdAt.toISOString()}::timestamp, ${options.cursor.id})`
    : Prisma.empty;
  const discoverable = options.showUndiscoverable ? Prisma.empty : Prisma.sql`AND (pr."isDiscoverable" OR u."id" = ${viewerId})`;
  const rows = await db.$queryRaw<PersonRow[]>`
    SELECT u."id" AS "userId", pr."handle", pr."displayName", pr."bio", pr."verifiedBadge",
      av."id" AS "avatarId", av."width" AS "avatarWidth", av."height" AS "avatarHeight",
      av."dominantColor" AS "avatarColor", av."variants" AS "avatarVariants",
      EXISTS (SELECT 1 FROM "follow" vf WHERE vf."followerId" = ${viewerId} AND vf."followingId" = u."id") AS "following",
      ${options.sortColumn} AS "sortAt"
    FROM "user" u
    JOIN "profile" pr ON pr."userId" = u."id"
    ${options.join}
    LEFT JOIN "media_asset" av ON av."id" = pr."avatarId" AND av."status" = 'READY'
    WHERE ${visibleAccount(col("u"))} AND ${notBlocked(viewerId, col('u."id"'))} ${discoverable}
      AND ${options.where}
      ${cursorCondition}
    ORDER BY ${options.sortColumn} DESC, u."id" DESC
    LIMIT ${options.limit + 1}`;
  const hasMore = rows.length > options.limit;
  const page = rows.slice(0, options.limit);
  const lastRow = page.at(-1);
  return { items: page.map(toPerson), last: lastRow ? { createdAt: lastRow.sortAt, id: lastRow.userId } : null, hasMore };
}

export const peopleQueries = {
  followersOf: (userId: string) => ({
    join: Prisma.sql`JOIN "follow" rel ON rel."followerId" = u."id" AND rel."followingId" = ${userId}`,
    where: Prisma.sql`TRUE`,
    sortColumn: col('rel."createdAt"'),
  }),
  followingOf: (userId: string) => ({
    join: Prisma.sql`JOIN "follow" rel ON rel."followingId" = u."id" AND rel."followerId" = ${userId}`,
    where: Prisma.sql`TRUE`,
    sortColumn: col('rel."createdAt"'),
  }),
  search: (viewerId: string, query: string) => ({
    join: Prisma.empty,
    where: Prisma.sql`u."id" <> ${viewerId} AND (pr."handle" ILIKE ${`%${query}%`} OR pr."displayName" ILIKE ${`%${query}%`} OR similarity(pr."displayName", ${query}) > 0.3)`,
    sortColumn: col('u."createdAt"'),
  }),
};

/** Compteurs d'abonnés et d'abonnements, comptes visibles seulement. */
export async function countFollows(userId: string): Promise<{ followers: number; following: number }> {
  const rows = await db.$queryRaw<{ followers: bigint; following: bigint }[]>`
    SELECT
      (SELECT count(*) FROM "follow" f JOIN "user" u ON u."id" = f."followerId" WHERE f."followingId" = ${userId} AND ${visibleAccount(col("u"))}) AS "followers",
      (SELECT count(*) FROM "follow" f JOIN "user" u ON u."id" = f."followingId" WHERE f."followerId" = ${userId} AND ${visibleAccount(col("u"))}) AS "following"`;
  const row = rows[0];
  return { followers: Number(row?.followers ?? 0), following: Number(row?.following ?? 0) };
}

/** Existence seule : bloquer reste possible envers quelqu'un qui nous a déjà bloqué (sans rien révéler de plus). */
export async function userExists(userId: string): Promise<boolean> {
  return (await db.user.count({ where: { id: userId, deletedAt: null } })) > 0;
}
