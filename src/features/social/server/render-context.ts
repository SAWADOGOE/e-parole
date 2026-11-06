import "server-only";
import { isDataSaver } from "@/server/data-saver";
import type { PostRenderContext } from "../components/post-item";
import type { PostView } from "../types";
import { quotedPassages, verseKey, verseLinkResolver } from "./verses";

/** Tout ce qu'une page de publications doit charger une seule fois (versets cités en une requête, mode économie). */
export async function buildRenderContext(posts: readonly PostView[]): Promise<PostRenderContext> {
  const [dataSaver, resolveVerse, passages] = await Promise.all([isDataSaver(), verseLinkResolver(), quotedPassages(posts.map((post) => post.verse))]);
  return { dataSaver, resolveVerse, passages, verseKey };
}
