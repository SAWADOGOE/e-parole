import { Bookmark } from "lucide-react";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { bookmarkedPosts, buildRenderContext } from "@/features/social";
import { FeedPager } from "@/features/social/components/feed-pager";
import { PostList } from "@/features/social/components/post-list";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bookmarks");
  return { title: t("metaTitle") };
}

/** Mes favoris (S-9) : liste privée ; une publication supprimée, masquée ou d'un compte bloqué n'y figure plus. */
export default async function BookmarksPage(props: PageProps<"/favoris">) {
  const session = await getCurrentSession();
  if (!session) redirect("/connexion?retour=/favoris");
  const search = await props.searchParams;
  const cursor = typeof search["curseur"] === "string" ? search["curseur"] : undefined;
  const page = await bookmarkedPosts(session.actor, cursor);
  const ctx = await buildRenderContext(page.items);
  const t = await getTranslations("bookmarks");
  return (
    <>
      <h1 className="font-serif text-display-sm text-fg sm:text-display-md">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("intro")}</p>
      <div className="mt-6">
        {page.items.length === 0 && !cursor ? (
          <EmptyState icon={Bookmark} title={t("emptyTitle")} body={t("emptyBody")} />
        ) : (
          <FeedPager
            source={{ kind: "bookmarks" }}
            initialCursor={page.nextCursor}
            initialPastFresh
            fallbackHref={page.nextCursor ? (`/favoris?curseur=${encodeURIComponent(page.nextCursor)}` as Route) : null}
            moreLabel={t("more")}
          >
            <PostList posts={page.items} ctx={ctx} markerShown />
          </FeedPager>
        )}
      </div>
    </>
  );
}
