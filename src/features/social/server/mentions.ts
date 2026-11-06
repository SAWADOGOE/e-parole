import { recordMemberEvent } from "@/features/notifications";
import type { TransactionClient } from "@/server/db";
import { MAX_MENTIONS } from "../constants";
import { extractMentionHandles } from "../lib/rich-text";
import { findMentionedUserIds, replaceMentions } from "./posts/repository";
import { resolveMentionTargets } from "./profiles/repository";

/**
 * Enregistre les mentions d'un contenu et notifie les personnes nouvellement mentionnées.
 * Résolution sous les règles de blocage et de découvrabilité (resolveMentionTargets) : une mention refusée
 * reste du texte simple, sans lien ni notification.
 */
export async function syncMentions(
  tx: TransactionClient,
  authorId: string,
  target: { postId: string } | { commentId: string; postId: string; postAuthorId: string },
  body: string,
): Promise<void> {
  const key = "commentId" in target ? { commentId: target.commentId } : { postId: target.postId };
  const previous = new Set(await findMentionedUserIds(tx, key));
  const resolved = await resolveMentionTargets(authorId, extractMentionHandles(body, MAX_MENTIONS), tx, "postAuthorId" in target ? target.postAuthorId : null);
  await replaceMentions(tx, key, resolved);
  for (const mention of resolved) {
    if (previous.has(mention.userId)) continue;
    await recordMemberEvent(tx, {
      type: "MENTION",
      recipientId: mention.userId,
      actorId: authorId,
      groupKey: "commentId" in target ? `mention:comment:${target.commentId}` : `mention:post:${target.postId}`,
      postId: target.postId,
      commentId: "commentId" in target ? target.commentId : null,
    });
  }
}
