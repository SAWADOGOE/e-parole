import "server-only";
import type { z } from "zod";
import { recordMemberEvent } from "@/features/notifications";
import { db } from "@/server/db";
import { AppError } from "@/server/errors/app-error";
import { authorize, type Actor } from "@/server/policies";
import type { commentRefSchema, createCommentSchema, hideCommentSchema, updateCommentSchema } from "../schemas";
import { applyCommentState, findVisibleCommentAccess, insertComment, updateOwnComment, type CommentAccessRow } from "./comments/repository";
import { syncMentions } from "./mentions";
import { findVisiblePostAccess } from "./posts/repository";

export async function requireVisibleComment(actor: Actor, commentId: string): Promise<CommentAccessRow> {
  const comment = await findVisibleCommentAccess(actor.userId, commentId);
  if (!comment) throw new AppError("NOT_FOUND");
  return comment;
}

const LOCKED = new AppError("FORBIDDEN", { message: "Les commentaires de cette publication sont fermés." });

/** US-11 : un seul niveau de réponse ; publication invisible ou parent invisible → 404 ; verrou → refus explicite. */
export async function createComment(actor: Actor, input: z.infer<typeof createCommentSchema>): Promise<{ id: string }> {
  const post = await findVisiblePostAccess(actor.userId, input.postId);
  if (!post) throw new AppError("NOT_FOUND");
  authorize(actor, "comment:create");
  if (post.commentsLocked) throw LOCKED;
  let parentAuthorId: string | null = null;
  if (input.parentId) {
    const parent = await findVisibleCommentAccess(actor.userId, input.parentId);
    if (parent?.postId !== post.id) throw new AppError("NOT_FOUND");
    if (parent.parentId !== null) throw new AppError("VALIDATION", { fieldErrors: { parentId: ["singleLevel"] } });
    parentAuthorId = parent.authorId;
  }
  return db.$transaction(async (tx) => {
    const id = await insertComment(tx, { postId: post.id, authorId: actor.userId, parentId: input.parentId, body: input.body });
    if (parentAuthorId) {
      await recordMemberEvent(tx, { type: "REPLY", recipientId: parentAuthorId, actorId: actor.userId, groupKey: `reply:comment:${input.parentId ?? ""}`, postId: post.id, commentId: input.parentId });
    }
    if (post.authorId !== parentAuthorId) {
      await recordMemberEvent(tx, { type: "COMMENT", recipientId: post.authorId, actorId: actor.userId, groupKey: `comment:post:${post.id}`, postId: post.id });
    }
    await syncMentions(tx, actor.userId, { commentId: id, postId: post.id }, input.body);
    return { id };
  });
}

export async function updateComment(actor: Actor, input: z.infer<typeof updateCommentSchema>): Promise<void> {
  const comment = await requireVisibleComment(actor, input.commentId);
  authorize(actor, "comment:update", { ownerId: comment.authorId });
  await db.$transaction(async (tx) => {
    if ((await updateOwnComment(tx, comment.id, actor.userId, input.body)) === 0) throw new AppError("NOT_FOUND");
    await syncMentions(tx, actor.userId, { commentId: comment.id, postId: comment.postId }, input.body);
  });
}

export async function deleteComment(actor: Actor, input: z.infer<typeof commentRefSchema>): Promise<void> {
  const comment = await requireVisibleComment(actor, input.commentId);
  authorize(actor, "comment:delete", { ownerId: comment.authorId });
  await db.$transaction(async (tx) => {
    const locked = await findVisibleCommentAccess(actor.userId, comment.id, tx, true);
    if (!locked) throw new AppError("NOT_FOUND");
    await applyCommentState(tx, locked, { delete: true });
  });
}

/** L'auteur de la publication masque (ou rétablit) un commentaire sur SA publication. */
export async function hideComment(actor: Actor, input: z.infer<typeof hideCommentSchema>): Promise<void> {
  const comment = await requireVisibleComment(actor, input.commentId);
  authorize(actor, "comment:hide_on_own_post", { ownerId: comment.postAuthorId });
  await db.$transaction(async (tx) => {
    const locked = await findVisibleCommentAccess(actor.userId, comment.id, tx, true);
    if (!locked) throw new AppError("NOT_FOUND");
    if (locked.hiddenByPostAuthor === input.hidden) return;
    await applyCommentState(tx, locked, { hiddenByPostAuthor: input.hidden });
  });
}
