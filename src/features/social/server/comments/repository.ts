import { mediaImageFromStored } from "@/features/media";
import type { Cursor } from "@/lib/cursor";
import { db, Prisma, type TransactionClient } from "@/server/db";
import type { ReactionKindName } from "../../constants";
import type { CommentView, VerifiedBadgeName } from "../../types";
import { mentionsFrom, mentionsSubquery } from "../posts/repository";
import { col, notBlocked, visibleAccount } from "../sql";

/**
 * Commentaires visibles par l'acteur : auteur affiché et sans blocage ; masqué par la modération → son auteur seul ;
 * masqué par l'auteur de la publication → l'auteur du commentaire et celui de la publication.
 * Un commentaire supprimé qui garde des réponses reste comme emplacement vide (« Commentaire supprimé »).
 */
/** postAuthor : identifiant (paramètre) ou colonne SQL de l'auteur de la publication. */
function visibleComment(viewerId: string, postAuthor: string | Prisma.Sql): Prisma.Sql {
  return Prisma.sql`(NOT c."isHidden" OR c."authorId" = ${viewerId})
    AND (NOT c."hiddenByPostAuthor" OR c."authorId" = ${viewerId} OR ${postAuthor} = ${viewerId})
    AND ${visibleAccount(col("u"))} AND ${notBlocked(viewerId, col('c."authorId"'))}`;
}

interface CommentRow {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  deletedAt: Date | null;
  isHidden: boolean;
  hiddenByPostAuthor: boolean;
  createdAt: Date;
  editedAt: Date | null;
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
  replyCount: number;
  viewerReaction: ReactionKindName | null;
  mentions: unknown;
}

function commentColumns(viewerId: string): Prisma.Sql {
  return Prisma.sql`c."id", c."postId", c."parentId", c."body", c."deletedAt", c."isHidden", c."hiddenByPostAuthor",
    c."createdAt", c."editedAt", c."authorId", pr."handle", pr."displayName", pr."verifiedBadge",
    av."id" AS "avatarId", av."width" AS "avatarWidth", av."height" AS "avatarHeight",
    av."dominantColor" AS "avatarColor", av."variants" AS "avatarVariants",
    c."amenCount", c."loveCount", c."encouragedCount", c."replyCount", r."kind" AS "viewerReaction",
    ${mentionsSubquery(viewerId, "commentId", col('c."id"'))} AS "mentions"`;
}

function commentJoins(viewerId: string): Prisma.Sql {
  return Prisma.sql`JOIN "user" u ON u."id" = c."authorId"
    JOIN "profile" pr ON pr."userId" = c."authorId"
    LEFT JOIN "media_asset" av ON av."id" = pr."avatarId" AND av."status" = 'READY'
    LEFT JOIN "reaction" r ON r."commentId" = c."id" AND r."userId" = ${viewerId}`;
}

function toView(row: CommentRow, viewerId: string): CommentView {
  const deleted = row.deletedAt !== null;
  return {
    id: row.id,
    postId: row.postId,
    parentId: row.parentId,
    body: deleted ? "" : row.body,
    deleted,
    isHidden: row.isHidden,
    hiddenByPostAuthor: row.hiddenByPostAuthor,
    createdAt: row.createdAt,
    editedAt: row.editedAt,
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
    viewerReaction: row.viewerReaction,
    replyCount: row.replyCount,
    mentions: deleted ? [] : mentionsFrom(row.mentions),
    replies: [],
  };
}

/** Une page de commentaires de premier niveau puis leurs réponses : deux requêtes, quel que soit le nombre de fils. */
export async function selectComments(
  viewerId: string,
  post: { id: string; authorId: string },
  cursor: Cursor | null,
  limit: number,
  repliesPerComment: number,
): Promise<{ items: CommentView[]; last: Cursor | null; hasMore: boolean }> {
  const cursorCondition = cursor ? Prisma.sql`AND (c."createdAt", c."id") > (${cursor.createdAt.toISOString()}::timestamp, ${cursor.id})` : Prisma.empty;
  const rows = await db.$queryRaw<CommentRow[]>`
    SELECT ${commentColumns(viewerId)}
    FROM "comment" c ${commentJoins(viewerId)}
    WHERE c."postId" = ${post.id} AND c."parentId" IS NULL
      AND (c."deletedAt" IS NULL OR c."replyCount" > 0)
      AND ${visibleComment(viewerId, post.authorId)}
      ${cursorCondition}
    ORDER BY c."createdAt" ASC, c."id" ASC
    LIMIT ${limit + 1}`;
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit).map((row) => toView(row, viewerId));
  const parentIds = page.map((comment) => comment.id);
  if (parentIds.length > 0) {
    const replies = await db.$queryRaw<CommentRow[]>`
      SELECT * FROM (
        SELECT ${commentColumns(viewerId)}, row_number() OVER (PARTITION BY c."parentId" ORDER BY c."createdAt", c."id") AS "rank"
        FROM "comment" c ${commentJoins(viewerId)}
        WHERE c."parentId" = ANY(${parentIds}::text[]) AND c."deletedAt" IS NULL AND ${visibleComment(viewerId, post.authorId)}
      ) ranked
      WHERE ranked."rank" <= ${repliesPerComment}
      ORDER BY ranked."createdAt", ranked."id"`;
    const byParent = new Map(page.map((comment) => [comment.id, comment]));
    for (const reply of replies) byParent.get(reply.parentId ?? "")?.replies.push(toView(reply, viewerId));
  }
  // Un emplacement supprimé dont aucune réponse n'est visible pour cet acteur (blocage) n'a plus de raison d'être.
  const visible = page.filter((comment) => !comment.deleted || comment.replies.length > 0);
  const lastRow = rows.slice(0, limit).at(-1);
  return { items: visible, last: lastRow ? { createdAt: lastRow.createdAt, id: lastRow.id } : null, hasMore };
}

export interface CommentAccessRow {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  postAuthorId: string;
  commentsLocked: boolean;
  isHidden: boolean;
  hiddenByPostAuthor: boolean;
  deletedAt: Date | null;
}

/** Commentaire visible par l'acteur, sur une publication visible ; sinon null (404). Verrou de ligne optionnel. */
export async function findVisibleCommentAccess(viewerId: string, commentId: string, tx: TransactionClient = db, lock = false): Promise<CommentAccessRow | null> {
  const rows = await tx.$queryRaw<CommentAccessRow[]>`
    SELECT c."id", c."postId", c."parentId", c."authorId", p."authorId" AS "postAuthorId", p."commentsLocked",
           c."isHidden", c."hiddenByPostAuthor", c."deletedAt"
    FROM "comment" c
    JOIN "user" u ON u."id" = c."authorId"
    JOIN "post" p ON p."id" = c."postId"
    JOIN "user" pu ON pu."id" = p."authorId"
    WHERE c."id" = ${commentId} AND c."deletedAt" IS NULL
      AND p."deletedAt" IS NULL AND (NOT p."isHidden" OR p."authorId" = ${viewerId})
      AND ${visibleAccount(col("pu"))} AND ${notBlocked(viewerId, col('p."authorId"'))}
      AND ${visibleComment(viewerId, col('p."authorId"'))}
    ${lock ? Prisma.sql`FOR UPDATE OF c` : Prisma.empty}`;
  return rows[0] ?? null;
}

/** Un commentaire est compté dans post.commentCount s'il n'est ni supprimé ni masqué. */
export function isCounted(row: Pick<CommentAccessRow, "deletedAt" | "isHidden" | "hiddenByPostAuthor">): boolean {
  return row.deletedAt === null && !row.isHidden && !row.hiddenByPostAuthor;
}

export async function insertComment(tx: TransactionClient, data: { postId: string; authorId: string; parentId: string | null; body: string }): Promise<string> {
  const comment = await tx.comment.create({ data, select: { id: true } });
  await tx.$executeRaw`UPDATE "post" SET "commentCount" = "commentCount" + 1 WHERE "id" = ${data.postId}`;
  if (data.parentId) await tx.$executeRaw`UPDATE "comment" SET "replyCount" = "replyCount" + 1 WHERE "id" = ${data.parentId}`;
  return comment.id;
}

export async function updateOwnComment(tx: TransactionClient, commentId: string, authorId: string, body: string): Promise<number> {
  const result = await tx.comment.updateMany({ where: { id: commentId, authorId, deletedAt: null }, data: { body, editedAt: new Date() } });
  return result.count;
}

/** Ajuste les compteurs après un changement d'état (suppression, masquage) d'un commentaire verrouillé par l'appelant. */
export async function applyCommentState(
  tx: TransactionClient,
  before: CommentAccessRow,
  change: Partial<Pick<CommentAccessRow, "isHidden" | "hiddenByPostAuthor">> & { delete?: true; removedByModeration?: true },
): Promise<void> {
  const after = {
    deletedAt: change.delete ? new Date() : before.deletedAt,
    isHidden: change.isHidden ?? before.isHidden,
    hiddenByPostAuthor: change.hiddenByPostAuthor ?? before.hiddenByPostAuthor,
  };
  await tx.comment.update({
    where: { id: before.id },
    data: {
      deletedAt: after.deletedAt,
      isHidden: after.isHidden,
      hiddenByPostAuthor: after.hiddenByPostAuthor,
      ...(change.removedByModeration ? { removedByModeration: true } : {}),
    },
  });
  const delta = Number(isCounted(after)) - Number(isCounted(before));
  if (delta !== 0) await tx.$executeRaw`UPDATE "post" SET "commentCount" = "commentCount" + ${delta} WHERE "id" = ${before.postId}`;
  if (change.delete && before.deletedAt === null && before.parentId) {
    await tx.$executeRaw`UPDATE "comment" SET "replyCount" = "replyCount" - 1 WHERE "id" = ${before.parentId}`;
  }
}
