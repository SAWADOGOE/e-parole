import "server-only";
import type { z } from "zod";
import { findOwnedReadyAssets } from "@/features/media";
import { db } from "@/server/db";
import { AppError } from "@/server/errors/app-error";
import { authorize, type Actor } from "@/server/policies";
import { enforceRateLimit } from "@/server/rate-limit/rate-limit";
import { NEW_ACCOUNT_DAYS } from "../constants";
import type { bookmarkSchema, createPostSchema, lockCommentsSchema, postRefSchema, updatePostSchema } from "../schemas";
import { syncMentions } from "./mentions";
import {
  attachMedia,
  countAttachedAssets,
  findAccountCreatedAt,
  findVisiblePostAccess,
  hasNonTextContent,
  insertPost,
  setBookmark,
  setCommentsLocked,
  softDeleteOwnPost,
  updateOwnPost,
  type PostAccessRow,
} from "./posts/repository";
import { validateQuotedVerse } from "./verses";

/** Visibilité avant permission : une publication invisible (supprimée, masquée, auteur bloqué) répond 404. */
export async function requireVisiblePost(actor: Actor, postId: string): Promise<PostAccessRow> {
  const post = await findVisiblePostAccess(actor.userId, postId);
  if (!post) throw new AppError("NOT_FOUND");
  return post;
}

async function enforcePostRate(actor: Actor): Promise<void> {
  const createdAt = await findAccountCreatedAt(actor.userId);
  const isNew = createdAt !== null && Date.now() - createdAt.getTime() < NEW_ACCOUNT_DAYS * 86_400_000;
  await enforceRateLimit(isNew ? "post.create.new_account" : "post.create", actor.userId);
}

/** US-10 / US-5 : publication toujours publique, verset cité par référence, images prêtes du membre lui-même. */
export async function createPost(actor: Actor, input: z.infer<typeof createPostSchema>): Promise<{ id: string }> {
  authorize(actor, "post:create");
  await enforcePostRate(actor);
  const verse = input.verse ? await validateQuotedVerse(input.verse) : null;
  const assetIds = input.images.map((image) => image.assetId);
  return db.$transaction(async (tx) => {
    const owned = await findOwnedReadyAssets(actor.userId, assetIds, "POST_IMAGE", tx);
    if (owned.length !== assetIds.length) throw new AppError("VALIDATION", { fieldErrors: { images: ["imageNotReady"] } });
    if ((await countAttachedAssets(tx, assetIds)) > 0) {
      throw new AppError("VALIDATION", { fieldErrors: { images: ["imageAlreadyUsed"] } });
    }
    const id = await insertPost(tx, { authorId: actor.userId, type: input.type, body: input.body, verse });
    await attachMedia(tx, id, input.images);
    await syncMentions(tx, actor.userId, { postId: id }, input.body);
    return { id };
  });
}

/** IDOR impossible : l'auteur est vérifié par authorize() ET par la condition de la requête de mise à jour. */
export async function updatePost(actor: Actor, input: z.infer<typeof updatePostSchema>): Promise<void> {
  const post = await requireVisiblePost(actor, input.postId);
  authorize(actor, "post:update", { ownerId: post.authorId });
  await db.$transaction(async (tx) => {
    if (input.body.length === 0 && !(await hasNonTextContent(tx, post.id))) {
      throw new AppError("VALIDATION", { fieldErrors: { body: ["emptyPost"] } });
    }
    if ((await updateOwnPost(tx, post.id, actor.userId, input)) === 0) throw new AppError("NOT_FOUND");
    await syncMentions(tx, actor.userId, { postId: post.id }, input.body);
  });
}

export async function deletePost(actor: Actor, input: z.infer<typeof postRefSchema>): Promise<void> {
  const post = await requireVisiblePost(actor, input.postId);
  authorize(actor, "post:delete", { ownerId: post.authorId });
  if ((await softDeleteOwnPost(post.id, actor.userId)) === 0) throw new AppError("NOT_FOUND");
}

export async function lockComments(actor: Actor, input: z.infer<typeof lockCommentsSchema>): Promise<void> {
  const post = await requireVisiblePost(actor, input.postId);
  authorize(actor, "post:update", { ownerId: post.authorId });
  if ((await setCommentsLocked(post.id, actor.userId, input.locked)) === 0) throw new AppError("NOT_FOUND");
}

/** Favori privé d'une publication visible. */
export async function toggleBookmark(actor: Actor, input: z.infer<typeof bookmarkSchema>): Promise<{ saved: boolean }> {
  const post = await requireVisiblePost(actor, input.postId);
  authorize(actor, "bookmark:manage");
  await setBookmark(actor.userId, post.id, input.saved);
  return { saved: input.saved };
}
