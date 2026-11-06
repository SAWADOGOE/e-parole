import { Feather } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { buildRenderContext, getProfile, profilePosts } from "@/features/social";
import { FeedPager } from "@/features/social/components/feed-pager";
import { PostList } from "@/features/social/components/post-list";
import { ProfileHeader } from "@/features/social/components/profile-header";
import { getCurrentSession } from "@/server/auth/session";

/** Pas de nom ni de bio dans les métadonnées : un profil bloqué ou inexistant ne doit rien révéler. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("people");
  return { title: t("metaTitle") };
}

/** Profil public /@handle (REQ-PROF-1, 2) : compte bloqué dans un sens ou dans l'autre, supprimé ou banni → 404. */
export default async function ProfilePage(props: PageProps<"/membres/[handle]">) {
  const { handle } = await props.params;
  const session = await getCurrentSession();
  if (!session) redirect(`/connexion?retour=${encodeURIComponent(`/@${handle}`)}`);
  if (!/^[A-Za-z0-9_]{3,30}$/.test(handle)) notFound();
  const profile = await getProfile(session.actor, handle);
  if (!profile) notFound();
  const search = await props.searchParams;
  const cursor = typeof search["curseur"] === "string" ? search["curseur"] : undefined;
  const page = await profilePosts(session.actor, profile.userId, cursor);
  if (!page) notFound();
  const ctx = await buildRenderContext(page.items);
  const t = await getTranslations("people");

  return (
    <>
      <ProfileHeader profile={profile} dataSaver={ctx.dataSaver} />
      <section aria-labelledby="publications-profil" className="mt-8">
        <h2 id="publications-profil" className="text-xl font-semibold text-fg">
          {t("postsTitle")}
        </h2>
        {page.items.length === 0 && !cursor ? (
          <EmptyState icon={Feather} title={t("postsTitle")} body={profile.relation.isSelf ? t("ownPostsEmpty") : t("postsEmpty", { name: profile.displayName })} className="py-8" />
        ) : (
          <FeedPager
            source={{ kind: "profile", userId: profile.userId }}
            initialCursor={page.nextCursor}
            initialPastFresh
            fallbackHref={page.nextCursor ? (`/@${profile.handle}?curseur=${encodeURIComponent(page.nextCursor)}` as Route) : null}
            moreLabel={t("more")}
          >
            <PostList posts={page.items} ctx={ctx} markerShown />
          </FeedPager>
        )}
      </section>
    </>
  );
}
