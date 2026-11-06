import { Compass, Sprout } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { findReadingState, getCatalog, getTranslation } from "@/features/bible";
import { DailyVerseCard } from "@/features/bible/components/daily-verse-card";
import { chapterPath, formatReference } from "@/features/bible/lib/format";
import { buildRenderContext, feedPage } from "@/features/social";
import { ComposerLauncher } from "@/features/social/components/composer-launcher";
import { FeedPager } from "@/features/social/components/feed-pager";
import { PostList, UpToDate, freshBoundary } from "@/features/social/components/post-list";
import { getCurrentSession } from "@/server/auth/session";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("metaTitle") };
}

type FeedTab = "following" | "discover";

function feedHref(feed: FeedTab, cursor?: string): Route {
  const params = new URLSearchParams();
  if (feed === "discover") params.set("fil", "decouvrir");
  if (cursor) params.set("curseur", cursor);
  const query = params.toString();
  return (query ? `/?${query}` : "/");
}

export default async function HomePage(props: PageProps<"/">) {
  const t = await getTranslations("home");
  const tNav = await getTranslations("nav");
  const tBible = await getTranslations("bible");
  const session = await getCurrentSession();

  if (!session) {
    return (
      <section className="py-8 sm:py-16">
        <p className="text-xs font-semibold tracking-[0.18em] text-gold-fg uppercase">e·Parole</p>
        <h1 className="mt-4 max-w-xl font-serif text-display-md text-fg sm:text-display-lg">{t("visitorTitle")}</h1>
        <p className="mt-5 max-w-lg text-lg text-muted">{t("visitorIntro")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/inscription">{t("visitorPrimary")}</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/connexion">{t("visitorSecondary")}</Link>
          </Button>
        </div>
        <DailyVerseCard headingId="verset-du-jour-visiteur" size="lg" className="mt-12 lg:hidden" />
      </section>
    );
  }

  const searchParams = await props.searchParams;
  const feed: FeedTab = searchParams["fil"] === "decouvrir" ? "discover" : "following";
  const cursor = typeof searchParams["curseur"] === "string" ? searchParams["curseur"] : undefined;
  const [state, page] = await Promise.all([findReadingState(session.actor.userId), feedPage(session.actor, feed, cursor)]);
  const translation = state?.bookId ? await getTranslation() : null;
  const books = translation ? await getCatalog(translation) : [];
  const resumeBook = books.find((book) => book.id === state?.bookId);
  const resumeChapter = state?.chapter ?? null;
  const ctx = await buildRenderContext(page.items);

  const tabs: { feed: FeedTab; label: string }[] = [
    { feed: "following", label: t("feedFollowing") },
    { feed: "discover", label: t("feedDiscover") },
  ];

  return (
    <>
      <h1 className="sr-only">{tNav("home")}</h1>
      <p className="font-serif text-xl text-fg">{t("greeting", { name: session.displayName })}</p>
      <DailyVerseCard headingId="verset-du-jour-mobile" size="lg" className="mt-6 lg:hidden" />
      {resumeBook && resumeChapter ? (
        <p className="mt-6">
          <Link href={chapterPath(resumeBook.slug, resumeChapter)} className="inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline">
            {tBible("resume", { reference: formatReference(resumeBook.name, resumeChapter) })}
          </Link>
        </p>
      ) : null}

      <ComposerLauncher label={t("composeCta")} isMinor={session.actor.isMinor} className="mt-8" />

      <nav aria-label={t("feedTabsLabel")} className="mt-6 border-b">
        <ul className="flex gap-1">
          {tabs.map((tab) => (
            <li key={tab.feed}>
              <Link
                href={feedHref(tab.feed)}
                aria-current={tab.feed === feed ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-medium",
                  tab.feed === feed ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
                )}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <h2 className="sr-only">{feed === "following" ? t("feedFollowing") : t("feedDiscover")}</h2>
      {page.items.length === 0 && !cursor ? (
        feed === "following" ? (
          <EmptyState
            icon={Sprout}
            title={t("feedEmptyTitle")}
            body={t("feedEmptyBody")}
            verse={t("feedEmptyVerse")}
            actions={
              <>
                <Button asChild>
                  <Link href={feedHref("discover")}>{t("openDiscover")}</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/membres">{t("findPeople")}</Link>
                </Button>
              </>
            }
          />
        ) : (
          <EmptyState icon={Compass} title={t("feedDiscoverEmptyTitle")} body={t("feedDiscoverEmptyBody")} verse={t("feedEmptyVerse")} />
        )
      ) : (
        <FeedPager
          key={`${feed}-${cursor ?? ""}`}
          source={{ kind: "feed", feed }}
          initialCursor={page.nextCursor}
          initialPastFresh={freshBoundary(page.items) >= 0}
          fallbackHref={page.nextCursor ? feedHref(feed, page.nextCursor) : null}
          moreLabel={t("showOlder")}
        >
          <PostList posts={page.items} ctx={ctx} markerShown={false} />
        </FeedPager>
      )}
      {page.items.length > 0 && !page.nextCursor && freshBoundary(page.items) < 0 ? <UpToDate /> : null}
    </>
  );
}
