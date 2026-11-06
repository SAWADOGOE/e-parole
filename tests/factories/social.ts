import { createComment } from "@/features/social/server/comments";
import { createPost } from "@/features/social/server/posts";
import type { Actor } from "@/server/policies";

/** Données de test uniquement (aucun contenu réel). */
export async function postAs(actor: Actor, body = "[Test] Une publication", extra: { type?: "TEXT" | "TESTIMONY" } = {}): Promise<string> {
  const { id } = await createPost(actor, { type: extra.type ?? "TEXT", body, verse: null, images: [] });
  return id;
}

export async function commentAs(actor: Actor, postId: string, body = "[Test] Un commentaire", parentId: string | null = null): Promise<string> {
  const { id } = await createComment(actor, { postId, parentId, body });
  return id;
}
