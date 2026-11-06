"use server";

import { revalidatePath } from "next/cache";
import { action } from "@/server/actions/action";
import type { Result } from "@/server/errors/result";
import {
  bookmarkSchema,
  commentRefSchema,
  createCommentSchema,
  createPostSchema,
  hideCommentSchema,
  lockCommentsSchema,
  mentionSearchSchema,
  postRefSchema,
  profileImageSchema,
  reactionSchema,
  relationSchema,
  updateCommentSchema,
  updatePostSchema,
  updateProfileSchema,
  verseReferenceSchema,
} from "../schemas";
import type { QuotedVerse } from "../types";
import { createComment, deleteComment, hideComment, updateComment } from "./comments";
import { createPost, deletePost, lockComments, toggleBookmark, updatePost } from "./posts";
import { changeProfileImage, editProfile, searchMentions } from "./profiles";
import { react, type ReactionResult } from "./reactions";
import { block, follow, mute } from "./relations";
import { resolveReference } from "./verses";

/*
 * Server Actions du réseau social : session → limite de débit → Zod → service (visibilité, puis authorize()).
 * Aucun contenu n'est journalisé ; les erreurs inattendues portent seulement un identifiant de requête.
 */

export async function createPostAction(input: unknown): Promise<Result<{ id: string }>> {
  return action({ schema: createPostSchema, handler: createPost })(input);
}

export async function updatePostAction(input: unknown): Promise<Result<void>> {
  return action({ schema: updatePostSchema, rateLimit: "post.update", handler: updatePost })(input);
}

export async function deletePostAction(input: unknown): Promise<Result<void>> {
  return action({ schema: postRefSchema, rateLimit: "post.update", handler: deletePost })(input);
}

export async function lockCommentsAction(input: unknown): Promise<Result<void>> {
  return action({ schema: lockCommentsSchema, rateLimit: "post.update", handler: lockComments })(input);
}

export async function bookmarkAction(input: unknown): Promise<Result<{ saved: boolean }>> {
  return action({ schema: bookmarkSchema, rateLimit: "bookmark.manage", handler: toggleBookmark })(input);
}

export async function createCommentAction(input: unknown): Promise<Result<{ id: string }>> {
  return action({ schema: createCommentSchema, rateLimit: "comment.create", handler: createComment })(input);
}

export async function updateCommentAction(input: unknown): Promise<Result<void>> {
  return action({ schema: updateCommentSchema, rateLimit: "comment.update", handler: updateComment })(input);
}

export async function deleteCommentAction(input: unknown): Promise<Result<void>> {
  return action({ schema: commentRefSchema, rateLimit: "comment.update", handler: deleteComment })(input);
}

export async function hideCommentAction(input: unknown): Promise<Result<void>> {
  return action({ schema: hideCommentSchema, rateLimit: "comment.update", handler: hideComment })(input);
}

export async function reactAction(input: unknown): Promise<Result<ReactionResult>> {
  return action({ schema: reactionSchema, rateLimit: "reaction.set", handler: react })(input);
}

export async function followAction(input: unknown): Promise<Result<{ following: boolean }>> {
  return action({ schema: relationSchema, rateLimit: "relation.follow", handler: follow })(input);
}

export async function blockAction(input: unknown): Promise<Result<{ blocked: boolean }>> {
  return action({ schema: relationSchema, rateLimit: "relation.block", handler: block })(input);
}

export async function muteAction(input: unknown): Promise<Result<{ muted: boolean }>> {
  return action({ schema: relationSchema, rateLimit: "relation.block", handler: mute })(input);
}

export async function editProfileAction(input: unknown): Promise<Result<{ handle: string }>> {
  const result = await action({ schema: updateProfileSchema, rateLimit: "profile.update", handler: editProfile })(input);
  if (result.ok) revalidatePath("/profil");
  return result;
}

export async function profileImageAction(input: unknown): Promise<Result<void>> {
  return action({ schema: profileImageSchema, rateLimit: "profile.update", handler: changeProfileImage })(input);
}

export async function mentionSuggestionsAction(input: unknown): Promise<Result<{ handle: string; displayName: string }[]>> {
  return action({ schema: mentionSearchSchema, rateLimit: "profile.search", handler: searchMentions })(input);
}

/** Aperçu d'un verset pour le composer : le texte vient de la base, l'auteur ne peut pas le modifier. */
export async function previewVerseAction(
  input: unknown,
): Promise<Result<{ verse: QuotedVerse; reference: string; text: string; attribution: string } | null>> {
  return action({
    schema: verseReferenceSchema,
    rateLimit: "bible.search",
    handler: async (_actor, data) => {
      const resolved = await resolveReference(data.reference);
      if (!resolved) return null;
      return {
        verse: resolved.verse,
        reference: resolved.passage.reference,
        text: resolved.passage.verses.map((verse) => verse.text).join(" "),
        attribution: resolved.passage.attribution,
      };
    },
  })(input);
}
