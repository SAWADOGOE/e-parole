"use server";

import type { ReactNode } from "react";
import { action } from "@/server/actions/action";
import type { Actor } from "@/server/policies";
import type { Result } from "@/server/errors/result";
import { PostList, freshBoundary } from "../components/post-list";
import { postPageSchema } from "../schemas";
import type { PostPage } from "../types";
import { bookmarkedPosts, feedPage, profilePosts } from "./feeds";
import { buildRenderContext } from "./render-context";

export interface RenderedPage {
  node: ReactNode;
  nextCursor: string | null;
  /** La page contient ou suit le repère « Tu es à jour » : le chargement automatique s'arrête. */
  pastFresh: boolean;
}

type Source = ReturnType<typeof postPageSchema.parse>["source"];

async function pageFor(actor: Actor, source: Source, cursor: string): Promise<PostPage> {
  switch (source.kind) {
    case "feed":
      return feedPage(actor, source.feed, cursor);
    case "profile":
      return (await profilePosts(actor, source.userId, cursor)) ?? { items: [], nextCursor: null };
    case "bookmarks":
      return bookmarkedPosts(actor, cursor);
  }
}

/** Page suivante rendue côté serveur : aucun composant de publication n'est envoyé au navigateur. */
export async function loadPostPageAction(input: unknown): Promise<Result<RenderedPage>> {
  return action({
    schema: postPageSchema,
    rateLimit: "feed.page",
    handler: async (actor, data) => {
      const page = await pageFor(actor, data.source, data.cursor);
      // Le repère « Tu es à jour » n'existe que dans les fils ; profils et favoris n'en ont pas.
      const markerShown = data.markerShown || data.source.kind !== "feed";
      const ctx = await buildRenderContext(page.items);
      return {
        node: <PostList posts={page.items} ctx={ctx} markerShown={markerShown} />,
        nextCursor: page.nextCursor,
        pastFresh: markerShown || freshBoundary(page.items) >= 0,
      };
    },
  })(input);
}
