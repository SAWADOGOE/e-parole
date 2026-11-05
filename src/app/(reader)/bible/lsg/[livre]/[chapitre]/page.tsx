import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { BookOpen } from "lucide-react";
import { findChapterAnnotations, findReadingState, getChapterVerses, resolveChapter } from "@/features/bible";
import { ACTIONS_SLOT_ID } from "@/features/bible/constants";
import { ChapterLinkPending } from "@/features/bible/components/chapter-skeleton";
import { ChapterText } from "@/features/bible/components/chapter-text";
import { LazyNoteList } from "@/features/bible/components/lazy-note-list";
import { ReaderChrome } from "@/features/bible/components/reader-chrome";
import { chapterPath, formatReference, parseFocus } from "@/features/bible/lib/format";
import { chapterNeighbours } from "@/features/bible/lib/navigation";
import { READER_BOOT_SCRIPT } from "@/features/bible/lib/reader-prefs";
import type { ChapterLink, ReaderPrefs } from "@/features/bible/types";
import { getCurrentSession } from "@/server/auth/session";

interface PageProps {
  params: Promise<{ livre: string; chapitre: string }>;
  searchParams: Promise<{ v?: string | string[] }>;
}

const TRANSLATION_SHORT_NAME = "LSG";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { livre, chapitre } = await params;
  const resolved = await resolveChapter(livre, chapitre);
  if (!resolved) return {};
  return { title: `${formatReference(resolved.book.name, resolved.chapter)} · ${resolved.translation.name}` };
}

function ChapterNavLink({ link, label, direction }: { link: ChapterLink; label: string; direction: "previous" | "next" }) {
  const reference = formatReference(link.bookName, link.chapter);
  return (
    <Link
      href={chapterPath(link.bookSlug, link.chapter)}
      aria-label={label}
      rel={direction === "next" ? "next" : "prev"}
      className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-accent hover:bg-bg-subtle"
    >
      {direction === "previous" ? <ChevronLeft aria-hidden="true" className="size-5" /> : null}
      {reference}
      {direction === "next" ? <ChevronRight aria-hidden="true" className="size-5" /> : null}
      <ChapterLinkPending />
    </Link>
  );
}

export default async function ChapterPage({ params, searchParams }: PageProps) {
  const { livre, chapitre } = await params;
  const t = await getTranslations("bible");
  const resolved = await resolveChapter(livre, chapitre);

  if (!resolved) {
    return (
      <main id="contenu" tabIndex={-1} className="mx-auto max-w-[38rem] px-4 py-12">
        <h1 className="sr-only">{t("title")}</h1>
        <EmptyState icon={BookOpen} title={t("emptyTitle")} body={t("emptyBody")} verse={t("emptyVerse")} />
      </main>
    );
  }

  const { translation, books, book, chapter } = resolved;
  const session = await getCurrentSession();
  const userId = session?.actor.userId;
  const [verses, annotations, state, query, nonce] = await Promise.all([
    getChapterVerses(translation, book.id, chapter),
    userId ? findChapterAnnotations({ userId, translationId: translation.id, bookId: book.id, chapter }) : null,
    userId ? findReadingState(userId) : null,
    searchParams,
    headers().then((h) => h.get("x-nonce") ?? undefined),
  ]);

  const { previous, next } = chapterNeighbours(books, book.id, chapter);
  const reference = formatReference(book.name, chapter);
  const focus = parseFocus(typeof query.v === "string" ? query.v : undefined);
  const serverPrefs: ReaderPrefs | null = state?.prefsSetAt
    ? { fontSize: state.fontSize, lineHeight: state.lineHeight, theme: state.theme, font: state.font, showVerseNumbers: state.showVerseNumbers }
    : null;

  return (
    <>
      <script nonce={nonce} data-prefs={serverPrefs ? JSON.stringify(serverPrefs) : undefined} dangerouslySetInnerHTML={{ __html: READER_BOOT_SCRIPT }} />
      <ReaderChrome
        key={`${book.id}-${chapter}`}
        bookId={book.id}
        bookName={book.name}
        bookSlug={book.slug}
        chapter={chapter}
        translationShortName={TRANSLATION_SHORT_NAME}
        translationName={translation.name}
        previousHref={previous ? chapterPath(previous.bookSlug, previous.chapter) : null}
        nextHref={next ? chapterPath(next.bookSlug, next.chapter) : null}
        isSignedIn={session !== null}
        canPersist={session?.actor.emailVerified ?? false}
        serverPrefs={serverPrefs}
      />
      <main id="contenu" tabIndex={-1} className="mx-auto max-w-[38rem] px-4 pt-6 pb-[calc(var(--bottom-nav-height)+48px)] md:pb-16">
        <article lang="fr" className="reader-text text-fg">
          <h1 tabIndex={-1} className="mb-6 font-serif text-display-md text-fg">{reference}</h1>
          <ChapterText verses={verses} annotations={annotations} focus={focus} />
          <footer data-reader-footer="" className="mt-10 border-t pt-4 font-sans text-sm text-muted">
            <p>{translation.attribution}</p>
          </footer>
        </article>
        <div id={ACTIONS_SLOT_ID} />
        <nav aria-label={t("chapterNavLabel")} className="mt-4 flex items-center justify-between gap-2">
          {previous ? (
            <ChapterNavLink link={previous} direction="previous" label={t("previousChapter", { reference: formatReference(previous.bookName, previous.chapter) })} />
          ) : (
            <span />
          )}
          {next ? <ChapterNavLink link={next} direction="next" label={t("nextChapter", { reference: formatReference(next.bookName, next.chapter) })} /> : <span />}
        </nav>
        {annotations && annotations.notes.length > 0 ? (
          <section aria-labelledby="mes-notes" className="mt-10 border-t pt-6">
            <h2 id="mes-notes" className="text-xl font-semibold text-fg">
              {t("notes.title")}
            </h2>
            <LazyNoteList
              notes={annotations.notes.map(({ id, body, verseStart, verseEnd }) => ({
                id,
                body,
                reference: formatReference(book.name, chapter, verseStart, verseEnd),
              }))}
            />
          </section>
        ) : null}
      </main>
    </>
  );
}
