import { mediaImageFromStored } from "@/features/media";
import { db, Prisma, type TransactionClient } from "@/server/db";
import type { PostTypeName, ReactionKindName } from "../../constants";
import type { Cursor } from "@/lib/cursor";
import type { MentionView, PostMediaView, PostView, QuotedVerse, VerifiedBadgeName } from "../../types";
import { col, notBlocked, notMuted, visibleAccount } from "../sql";

/**
 * Lecture des publications : UNE requête par page (auteur, avatar, compteurs, réaction et favori de l'acteur,
 * images et mentions agrégées en JSON). Aucun N+1 (test d'intégration « nombre de requêtes constant »).
 * Règles d'accès communes : non supprimée, auteur visible, aucun blocage dans un sens ou dans l'autre ;
 * une publication masquée par la modération n'est rendue qu'à son auteur.
 */

interface PostRow {
  id: string;
  type: PostTypeName;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  isHidden: boolean;
  commentsLocked: boolean;
  authorId: string;
  handle: string;
  displayName: string;
  verifiedBadge: VerifiedBadgeName | null;
  avatarId: string | null;
  avatarWidth: number | null;
  avatarHeight: number | null;
  avatarColor: string | null;
  avatarVariants: unknown;
  amenCount: number;
  loveCount: number;
  encouragedCount: number;
  commentCount: number;
  viewerReaction: ReactionKindName | null;
  bookmarked: boolean;
  verseBookId: string | null;
  verseChapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
  media: unknown;
  mentions: unknown;
  sortAt: Date;
}

export interface PostQuery {
  /** Conditions supplémentaires (fil, auteur, identifiant…). */
  where: Prisma.Sql;
  /** Jointure supplémentaire (favoris). */
  join?: Prisma.Sql;
  /** Colonne de tri et de curseur (par défaut p."createdAt"). */
  sortColumn?: Prisma.Sql;
  cursor: Cursor | null;
  limit: number;
  /** Fils : les publications masquées ne sont jamais parcourues, même pour leur auteur (index partiel). */
  includeOwnHidden: boolean;
}

function mediaFrom(value: unknown): PostMediaView[] {
  if (!Array.isArray(value)) return [];
  const items: PostMediaView[] = [];
  for (const entry of value as { assetId: string; altText: string; width: number | null; height: number | null; color: string | null; variants: unknown }[]) {
    const image = mediaImageFromStored({ assetId: entry.assetId, width: entry.width, height: entry.height, dominantColor: entry.color, variants: entry.variants });
    if (image) items.push({ image, altText: entry.altText });
  }
  return items;
}

export function mentionsFrom(value: unknown): MentionView[] {
  if (!Array.isArray(value)) return [];
  return (value as { written: string; handle: string }[]).map(({ written, handle }) => ({ written, handle }));
}

function verseFrom(row: Pick<PostRow, "verseBookId" | "verseChapter" | "verseStart" | "verseEnd">): QuotedVerse | null {
  if (!row.verseBookId || row.verseChapter === null || row.verseStart === null || row.verseEnd === null) return null;
  return { bookId: row.verseBookId, chapter: row.verseChapter, verseStart: row.verseStart, verseEnd: row.verseEnd };
}

function toView(row: PostRow, viewerId: string): PostView {
  return {
    id: row.id,
    type: row.type,
    body: row.body,
    createdAt: row.createdAt,
    editedAt: row.editedAt,
    isHidden: row.isHidden,
    commentsLocked: row.commentsLocked,
    isOwn: row.authorId === viewerId,
    author: {
      userId: row.authorId,
      handle: row.handle,
      displayName: row.displayName,
      verifiedBadge: row.verifiedBadge,
      avatar: row.avatarId
        ? mediaImageFromStored({ assetId: row.avatarId, width: row.avatarWidth, height: row.avatarHeight, dominantColor: row.avatarColor, variants: row.avatarVariants })
        : null,
    },
    reactions: { AMEN: row.amenCount, LOVE: row.loveCount, ENCOURAGED: row.encouragedCount },
    commentCount: row.commentCount,
    viewerReaction: row.viewerReaction,
    bookmarked: row.bookmarked,
    media: mediaFrom(row.media),
    mentions: mentionsFrom(row.mentions),
    verse: verseFrom(row),
  };
}

/** Mentions d'un contenu, rendues en lien seulement si la personne reste visible pour l'acteur. */
export function mentionsSubquery(viewerId: string, target: "postId" | "commentId", idColumn: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`COALESCE((
    SELECT json_agg(json_build_object('written', lower(mn."handle"), 'handle', mp."handle"))
    FROM "mention" mn
    JOIN "profile" mp ON mp."userId" = mn."userId"
    JOIN "user" mu ON mu."id" = mn."userId"
    WHERE mn.${col(`"${target}"`)} = ${idColumn} AND ${visibleAccount(col("mu"))} AND ${notBlocked(viewerId, col('mn."userId"'))}
  ), '[]'::json)`;
}

export async function selectPosts(viewerId: string, query: PostQuery): Promise<{ items: PostView[]; last: Cursor | null; hasMore: boolean }> {
  const sort = query.sortColumn ?? col('p."createdAt"');
  const cursorCondition = query.cursor
    ? Prisma.sql`AND (${sort}, p."id") < (${query.cursor.createdAt.toISOString()}::timestamp, ${query.cursor.id})`
    : Prisma.empty;
  const hidden = query.includeOwnHidden ? Prisma.sql`(NOT p."isHidden" OR p."authorId" = ${viewerId})` : Prisma.sql`NOT p."isHidden"`;
  const rows = await db.$queryRaw<PostRow[]>`
    SELECT p."id", p."type", p."body", p."createdAt", p."editedAt", p."isHidden", p."commentsLocked",
      p."authorId", pr."handle", pr."displayName", pr."verifiedBadge",
      av."id" AS "avatarId", av."width" AS "avatarWidth", av."height" AS "avatarHeight",
      av."dominantColor" AS "avatarColor", av."variants" AS "avatarVariants",
      p."amenCount", p."loveCount", p."encouragedCount", p."commentCount",
      r."kind" AS "viewerReaction", (bm."userId" IS NOT NULL) AS "bookmarked",
      p."verseBookId", p."verseChapter", p."verseStart", p."verseEnd",
      COALESCE((
        SELECT json_agg(json_build_object('assetId', a."id", 'altText', m."altText", 'width', a."width", 'height', a."height",
                                          'color', a."dominantColor", 'variants', a."variants") ORDER BY m."position")
        FROM "post_media" m JOIN "media_asset" a ON a."id" = m."assetId" AND a."status" = 'READY'
        WHERE m."postId" = p."id"
      ), '[]'::json) AS "media",
      ${mentionsSubquery(viewerId, "postId", col('p."id"'))} AS "mentions",
      ${sort} AS "sortAt"
    FROM "post" p
    JOIN "user" u ON u."id" = p."authorId"
    JOIN "profile" pr ON pr."userId" = p."authorId"
    ${query.join ?? Prisma.empty}
    LEFT JOIN "media_asset" av ON av."id" = pr."avatarId" AND av."status" = 'READY'
    LEFT JOIN "reaction" r ON r."postId" = p."id" AND r."userId" = ${viewerId}
    LEFT JOIN "post_bookmark" bm ON bm."postId" = p."id" AND bm."userId" = ${viewerId}
    WHERE p."deletedAt" IS NULL AND ${hidden}
      AND ${visibleAccount(col("u"))}
      AND ${notBlocked(viewerId, col('p."authorId"'))}
      AND ${query.where}
      ${cursorCondition}
    ORDER BY ${sort} DESC, p."id" DESC
    LIMIT ${query.limit + 1}`;
  const hasMore = rows.length > query.limit;
  const page = rows.slice(0, query.limit);
  const lastRow = page.at(-1);
  return { items: page.map((row) => toView(row, viewerId)), last: lastRow ? { createdAt: lastRow.sortAt, id: lastRow.id } : null, hasMore };
}

export const feedConditions = {
  discover: (viewerId: string): Prisma.Sql => notMuted(viewerId, col('p."authorId"')),
  following: (viewerId: string): Prisma.Sql => Prisma.sql`${notMuted(viewerId, col('p."authorId"'))}
    AND (p."authorId" = ${viewerId} OR EXISTS (SELECT 1 FROM "follow" f WHERE f."followerId" = ${viewerId} AND f."followingId" = p."authorId"))`,
  author: (authorId: string): Prisma.Sql => Prisma.sql`p."authorId" = ${authorId}`,
  id: (postId: string): Prisma.Sql => Prisma.sql`p."id" = ${postId}`,
};

export function bookmarkJoin(viewerId: string): Prisma.Sql {
  return Prisma.sql`JOIN "post_bookmark" saved ON saved."postId" = p."id" AND saved."userId" = ${viewerId}`;
}

/** État brut d'une publication, sans règle d'accès : réservé aux contrôles des services (auteur, verrou, existence). */
export interface PostAccessRow {
  id: string;
  authorId: string;
  isHidden: boolean;
  commentsLocked: boolean;
  deletedAt: Date | null;
}

/** Publication visible par l'acteur (mêmes règles que les fils), ou null : sert de garde « 404 avant permission ». */
export async function findVisiblePostAccess(viewerId: string, postId: string, tx: TransactionClient = db): Promise<PostAccessRow | null> {
  const rows = await tx.$queryRaw<PostAccessRow[]>`
    SELECT p."id", p."authorId", p."isHidden", p."commentsLocked", p."deletedAt"
    FROM "post" p JOIN "user" u ON u."id" = p."authorId"
    WHERE p."id" = ${postId} AND p."deletedAt" IS NULL AND (NOT p."isHidden" OR p."authorId" = ${viewerId})
      AND ${visibleAccount(col("u"))} AND ${notBlocked(viewerId, col('p."authorId"'))}`;
  return rows[0] ?? null;
}

export async function insertPost(
  tx: TransactionClient,
  data: { authorId: string; type: PostTypeName; body: string; verse: (QuotedVerse & { translationId: number }) | null },
): Promise<string> {
  const post = await tx.post.create({
    data: {
      authorId: data.authorId,
      type: data.type,
      body: data.body,
      ...(data.verse
        ? {
            verseTranslationId: data.verse.translationId,
            verseBookId: data.verse.bookId,
            verseChapter: data.verse.chapter,
            verseStart: data.verse.verseStart,
            verseEnd: data.verse.verseEnd,
          }
        : {}),
    },
    select: { id: true },
  });
  return post.id;
}

export async function attachMedia(tx: TransactionClient, postId: string, images: readonly { assetId: string; altText: string }[]): Promise<void> {
  if (images.length === 0) return;
  await tx.postMedia.createMany({ data: images.map((image, position) => ({ postId, assetId: image.assetId, position, altText: image.altText })) });
}

/** Mise à jour par l'auteur seulement : la condition authorId fait partie de la requête (pas d'IDOR possible). */
export async function updateOwnPost(tx: TransactionClient, postId: string, authorId: string, data: { type: PostTypeName; body: string }): Promise<number> {
  const result = await tx.post.updateMany({
    where: { id: postId, authorId, deletedAt: null },
    data: { type: data.type, body: data.body, editedAt: new Date() },
  });
  return result.count;
}

export async function setCommentsLocked(postId: string, authorId: string, locked: boolean): Promise<number> {
  const result = await db.post.updateMany({ where: { id: postId, authorId, deletedAt: null }, data: { commentsLocked: locked } });
  return result.count;
}

export async function softDeleteOwnPost(postId: string, authorId: string): Promise<number> {
  const result = await db.post.updateMany({ where: { id: postId, authorId, deletedAt: null }, data: { deletedAt: new Date() } });
  return result.count;
}

export async function replaceMentions(
  tx: TransactionClient,
  target: { postId: string } | { commentId: string },
  mentions: readonly { userId: string; handle: string }[],
): Promise<void> {
  await tx.mention.deleteMany({ where: target });
  if (mentions.length === 0) return;
  await tx.mention.createMany({ data: mentions.map((m) => ({ ...target, userId: m.userId, handle: m.handle })), skipDuplicates: true });
}

/** Identifiants des personnes déjà mentionnées (pour ne notifier que les nouvelles mentions après édition). */
export async function findMentionedUserIds(tx: TransactionClient, target: { postId: string } | { commentId: string }): Promise<string[]> {
  const rows = await tx.mention.findMany({ where: target, select: { userId: true } });
  return rows.map((row) => row.userId);
}

export async function setBookmark(userId: string, postId: string, saved: boolean): Promise<void> {
  if (saved) {
    await db.postBookmark.upsert({ where: { userId_postId: { userId, postId } }, create: { userId, postId }, update: {} });
  } else {
    await db.postBookmark.deleteMany({ where: { userId, postId } });
  }
}

/** Nombre de publications visibles d'un auteur (profil). */
export async function countAuthorPosts(authorId: string): Promise<number> {
  return db.post.count({ where: { authorId, deletedAt: null, isHidden: false } });
}

export async function findAccountCreatedAt(userId: string): Promise<Date | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
  return user?.createdAt ?? null;
}

/** Images déjà rattachées à une publication (une image ne sert qu'une fois). */
export async function countAttachedAssets(tx: TransactionClient, assetIds: readonly string[]): Promise<number> {
  if (assetIds.length === 0) return 0;
  return tx.postMedia.count({ where: { assetId: { in: [...assetIds] } } });
}

/** La publication garde-t-elle un contenu (verset ou image) si son texte devient vide ? */
export async function hasNonTextContent(tx: TransactionClient, postId: string): Promise<boolean> {
  const post = await tx.post.findUnique({ where: { id: postId }, select: { verseBookId: true, _count: { select: { media: true } } } });
  return post !== null && (post.verseBookId !== null || post._count.media > 0);
}
