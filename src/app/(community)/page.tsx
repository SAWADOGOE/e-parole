import { Sprout } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { Route } from "next";
import { findReadingState, getCatalog, getTranslation } from "@/features/bible";
import { DailyVerseCard } from "@/features/bible/components/daily-verse-card";
import { chapterPath, formatReference } from "@/features/bible/lib/format";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("metaTitle") };
}

export default async function HomePage() {
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

  const state = await findReadingState(session.actor.userId);
  const translation = state?.bookId ? await getTranslation() : null;
  const books = translation ? await getCatalog(translation) : [];
  const resumeBook = books.find((book) => book.id === state?.bookId);
  const resumeChapter = state?.chapter ?? null;

  return (
    <>
      <p className="font-serif text-xl text-fg">{t("greeting", { name: session.displayName })}</p>

      <DailyVerseCard headingId="verset-du-jour-mobile" size="lg" className="mt-6 lg:hidden" />
      {resumeBook && resumeChapter ? (
        <p className="mt-6">
          <Link href={chapterPath(resumeBook.slug, resumeChapter)} className="inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline">
            {tBible("resume", { reference: formatReference(resumeBook.name, resumeChapter) })}
          </Link>
        </p>
      ) : null}

      <h1 className="sr-only">{tNav("home")}</h1>
      <h2 className="mt-10 text-sm font-semibold text-muted">{t("feedTitle")}</h2>
      <EmptyState icon={Sprout} title={t("feedEmptyTitle")} body={t("feedEmptyBody")} verse={t("feedEmptyVerse")} />
    </>
  );
}
