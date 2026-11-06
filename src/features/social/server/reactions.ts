import "server-only";
import type { z } from "zod";
import { recordMemberEvent } from "@/features/notifications";
import { db } from "@/server/db";
import { AppError } from "@/server/errors/app-error";
import { authorize, type Actor } from "@/server/policies";
import type { ReactionKindName } from "../constants";
import type { reactionSchema } from "../schemas";
import { findVisibleCommentAccess } from "./comments/repository";
import { findVisiblePostAccess } from "./posts/repository";
import { readCounts, setReaction, type ReactionTarget } from "./reactions/repository";

export interface ReactionResult {
  kind: ReactionKindName | null;
  counts: Record<ReactionKindName, number>;
}

/** US-12 : trois réactions, une par personne et par cible, modifiable et retirable. Cible invisible → 404. */
export async function react(actor: Actor, input: z.infer<typeof reactionSchema>): Promise<ReactionResult> {
  let recipientId: string;
  let postId: string;
  if (input.target === "post") {
    const post = await findVisiblePostAccess(actor.userId, input.targetId);
    if (!post) throw new AppError("NOT_FOUND");
    recipientId = post.authorId;
    postId = post.id;
  } else {
    const comment = await findVisibleCommentAccess(actor.userId, input.targetId);
    if (!comment) throw new AppError("NOT_FOUND");
    recipientId = comment.authorId;
    postId = comment.postId;
  }
  authorize(actor, "reaction:set");
  const target: ReactionTarget = { kind: input.target, id: input.targetId };
  return db.$transaction(async (tx) => {
    const change = await setReaction(tx, actor.userId, target, input.kind);
    if (change === "created") {
      await recordMemberEvent(tx, {
        type: "REACTION",
        recipientId,
        actorId: actor.userId,
        groupKey: `reaction:${input.target}:${input.targetId}`,
        postId,
        commentId: input.target === "comment" ? input.targetId : null,
      });
    }
    return { kind: input.kind, counts: await readCounts(tx, target) };
  });
}
