import "server-only";
import { decodeCursor, encodeCursor } from "@/lib/cursor";
import { col } from "./sql";
import { COMMENTS_PAGE_SIZE, FEED_PAGE_SIZE, PEOPLE_PAGE_SIZE, REPLIES_PER_COMMENT } from "../constants";
import type { CommentPage, PeoplePage, PostPage, PostView } from "../types";
import type { Actor } from "@/server/policies";
import { selectComments } from "./comments/repository";
import { bookmarkJoin, feedConditions, findVisiblePostAccess, selectPosts } from "./posts/repository";
import { findVisibleUserId, peopleQueries, selectPeople } from "./relations/repository";

export type FeedName = "following" | "discover";

function page<T>(result: { items: T[]; last: { createdAt: Date; id: string } | null; hasMore: boolean }): { items: T[]; nextCursor: string | null } {
  return { items: result.items, nextCursor: result.hasMore && result.last ? encodeCursor(result.last) : null };
}

/** Fils chronologiques (US-13, REQ-SOC-4), filtrés par les blocages et les mises en sourdine ; 15 par page. */
export async function feedPage(actor: Actor, feed: FeedName, cursor: string | undefined): Promise<PostPage> {
  return page(
    await selectPosts(actor.userId, {
      where: feed === "following" ? feedConditions.following(actor.userId) : feedConditions.discover(actor.userId),
      cursor: decodeCursor(cursor),
      limit: FEED_PAGE_SIZE,
      includeOwnHidden: false,
    }),
  );
}

/** Publications d'un profil : l'auteur y voit aussi les siennes masquées par la modération (avec mention). */
export async function profilePosts(actor: Actor, userId: string, cursor: string | undefined): Promise<PostPage | null> {
  if (!(await findVisibleUserId(actor.userId, userId))) return null;
  return page(
    await selectPosts(actor.userId, { where: feedConditions.author(userId), cursor: decodeCursor(cursor), limit: FEED_PAGE_SIZE, includeOwnHidden: true }),
  );
}

export async function bookmarkedPosts(actor: Actor, cursor: string | undefined): Promise<PostPage> {
  return page(
    await selectPosts(actor.userId, {
      where: col("TRUE"),
      join: bookmarkJoin(actor.userId),
      sortColumn: col('saved."createdAt"'),
      cursor: decodeCursor(cursor),
      limit: FEED_PAGE_SIZE,
      includeOwnHidden: false,
    }),
  );
}

export async function getPost(actor: Actor, postId: string): Promise<PostView | null> {
  const result = await selectPosts(actor.userId, { where: feedConditions.id(postId), cursor: null, limit: 1, includeOwnHidden: true });
  return result.items[0] ?? null;
}

export async function postComments(actor: Actor, postId: string, cursor: string | undefined): Promise<CommentPage | null> {
  const post = await findVisiblePostAccess(actor.userId, postId);
  if (!post) return null;
  return page(await selectComments(actor.userId, post, decodeCursor(cursor), COMMENTS_PAGE_SIZE, REPLIES_PER_COMMENT));
}

/** Abonnés ou abonnements d'une personne visible ; null si elle ne l'est pas (404). */
export async function relationList(actor: Actor, userId: string, kind: "followers" | "following", cursor: string | undefined): Promise<PeoplePage | null> {
  if (!(await findVisibleUserId(actor.userId, userId))) return null;
  const query = kind === "followers" ? peopleQueries.followersOf(userId) : peopleQueries.followingOf(userId);
  return page(await selectPeople(actor.userId, { ...query, cursor: decodeCursor(cursor), limit: PEOPLE_PAGE_SIZE, showUndiscoverable: false }));
}

/** Recherche de profils : seulement les profils découvrables, jamais un compte bloqué. */
export async function searchPeople(actor: Actor, query: string, cursor: string | undefined): Promise<PeoplePage> {
  const escaped = query.replace(/[\\%_]/g, (c) => `\\${c}`);
  if (escaped.length < 2) return { items: [], nextCursor: null };
  return page(
    await selectPeople(actor.userId, { ...peopleQueries.search(actor.userId, escaped), cursor: decodeCursor(cursor), limit: PEOPLE_PAGE_SIZE, showUndiscoverable: false }),
  );
}
