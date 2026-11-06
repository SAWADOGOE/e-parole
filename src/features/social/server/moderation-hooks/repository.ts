import { db, type Prisma, type TransactionClient } from "@/server/db";
import { applyCommentState, type CommentAccessRow } from "../comments/repository";

/**
 * Accès réservé au module de modération (via l'index du module social) : copie figée d'une cible au moment
 * du signalement, état courant pour le dossier, et effets des décisions (masquer, retirer, masquage provisoire).
 * Ces fonctions ne filtrent pas la visibilité : l'appelant a déjà vérifié la permission de modération.
 */

export type ModerationTargetType = "POST" | "COMMENT" | "PROFILE";

export interface TargetSnapshot {
  authorId: string;
  /** Données figées, sans email ni information privée du profil. */
  evidence: Prisma.InputJsonObject;
}

export async function snapshotTarget(type: ModerationTargetType, id: string): Promise<TargetSnapshot | null> {
  if (type === "POST") {
    const post = await db.post.findUnique({
      where: { id },
      select: {
        authorId: true, type: true, body: true, createdAt: true, editedAt: true,
        verseBookId: true, verseChapter: true, verseStart: true, verseEnd: true,
        media: { select: { assetId: true, altText: true }, orderBy: { position: "asc" } },
        author: { select: { profile: { select: { handle: true, displayName: true } } } },
      },
    });
    if (!post) return null;
    return {
      authorId: post.authorId,
      evidence: {
        kind: "POST",
        type: post.type,
        body: post.body,
        createdAt: post.createdAt.toISOString(),
        editedAt: post.editedAt?.toISOString() ?? null,
        verse: post.verseBookId ? { bookId: post.verseBookId, chapter: post.verseChapter, verseStart: post.verseStart, verseEnd: post.verseEnd } : null,
        media: post.media.map((m) => ({ assetId: m.assetId, altText: m.altText })),
        handle: post.author.profile?.handle ?? null,
        displayName: post.author.profile?.displayName ?? null,
      },
    };
  }
  if (type === "COMMENT") {
    const comment = await db.comment.findUnique({
      where: { id },
      select: { authorId: true, postId: true, body: true, createdAt: true, author: { select: { profile: { select: { handle: true, displayName: true } } } } },
    });
    if (!comment) return null;
    return {
      authorId: comment.authorId,
      evidence: {
        kind: "COMMENT",
        postId: comment.postId,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        handle: comment.author.profile?.handle ?? null,
        displayName: comment.author.profile?.displayName ?? null,
      },
    };
  }
  const profile = await db.profile.findUnique({ where: { userId: id }, select: { userId: true, handle: true, displayName: true, bio: true, avatarId: true, bannerId: true } });
  if (!profile) return null;
  // Champs publics du profil seulement : église, ville, dénomination restent hors du dossier.
  return {
    authorId: profile.userId,
    evidence: { kind: "PROFILE", handle: profile.handle, displayName: profile.displayName, bio: profile.bio, avatarId: profile.avatarId, bannerId: profile.bannerId },
  };
}

export interface TargetState {
  exists: boolean;
  isHidden: boolean;
  deleted: boolean;
  removedByModeration: boolean;
  current: Prisma.JsonObject | null;
}

/** État courant de la cible, pour comparer au snapshot dans le dossier. */
export async function targetState(type: ModerationTargetType, id: string): Promise<TargetState> {
  if (type === "POST") {
    const post = await db.post.findUnique({ where: { id }, select: { body: true, isHidden: true, deletedAt: true, removedByModeration: true, media: { select: { assetId: true, altText: true }, orderBy: { position: "asc" } } } });
    if (!post) return { exists: false, isHidden: false, deleted: true, removedByModeration: false, current: null };
    return { exists: true, isHidden: post.isHidden, deleted: post.deletedAt !== null, removedByModeration: post.removedByModeration, current: { body: post.body, media: post.media.map((m) => ({ assetId: m.assetId, altText: m.altText })) } };
  }
  if (type === "COMMENT") {
    const comment = await db.comment.findUnique({ where: { id }, select: { body: true, isHidden: true, deletedAt: true, removedByModeration: true } });
    if (!comment) return { exists: false, isHidden: false, deleted: true, removedByModeration: false, current: null };
    return { exists: true, isHidden: comment.isHidden, deleted: comment.deletedAt !== null, removedByModeration: comment.removedByModeration, current: { body: comment.body } };
  }
  const profile = await db.profile.findUnique({ where: { userId: id }, select: { displayName: true, bio: true, handle: true } });
  return { exists: profile !== null, isHidden: false, deleted: profile === null, removedByModeration: false, current: profile ? { handle: profile.handle, displayName: profile.displayName, bio: profile.bio } : null };
}

async function lockedComment(tx: TransactionClient, id: string): Promise<CommentAccessRow | null> {
  const rows = await tx.$queryRaw<CommentAccessRow[]>`
    SELECT c."id", c."postId", c."parentId", c."authorId", p."authorId" AS "postAuthorId", p."commentsLocked",
           c."isHidden", c."hiddenByPostAuthor", c."deletedAt"
    FROM "comment" c JOIN "post" p ON p."id" = c."postId" WHERE c."id" = ${id} FOR UPDATE OF c`;
  return rows[0] ?? null;
}

/** Masquer (décision ou masquage provisoire) ou rétablir un contenu ; compteurs ajustés dans la transaction. */
export async function setTargetHidden(tx: TransactionClient, type: "POST" | "COMMENT", id: string, hidden: boolean): Promise<void> {
  if (type === "POST") {
    await tx.post.updateMany({ where: { id }, data: { isHidden: hidden, hiddenAt: hidden ? new Date() : null } });
    return;
  }
  const comment = await lockedComment(tx, id);
  if (comment && comment.isHidden !== hidden) await applyCommentState(tx, comment, { isHidden: hidden });
}

/** « Retirer » : suppression logique marquée modération, conservée pour une contestation (1 an, docs/admin). */
export async function removeTarget(tx: TransactionClient, type: "POST" | "COMMENT", id: string): Promise<void> {
  if (type === "POST") {
    await tx.post.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), removedByModeration: true } });
    return;
  }
  const comment = await lockedComment(tx, id);
  if (comment && comment.deletedAt === null) await applyCommentState(tx, comment, { delete: true, removedByModeration: true });
}
