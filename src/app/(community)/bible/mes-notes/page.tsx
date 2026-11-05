import { BookOpen, Bookmark, Highlighter, NotebookPen, type LucideIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  ANNOTATIONS_PAGE_SIZE,
  annotationListQuerySchema,
  getCatalog,
  getPassages,
  getTranslation,
  listBookmarks,
  listHighlights,
  listNotes,
} from "@/features/bible";
import { NoteList } from "@/features/bible/components/note-list";
import { RemoveAnnotationButton } from "@/features/bible/components/remove-annotation-button";
import { VerseQuote } from "@/features/bible/components/verse-quote";
import { formatReference } from "@/features/bible/lib/format";
import type { TranslationInfo, VerseCoordinates } from "@/features/bible/types";
import { getCurrentSession } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bible.annotations");
  return { title: t("metaTitle") };
}

const TABS = [
  { key: "surlignages", label: "highlights" },
  { key: "notes", label: "notes" },
  { key: "favoris", label: "bookmarks" },
] as const;

const EMPTY: Record<(typeof TABS)[number]["key"], { icon: LucideIcon; title: "emptyHighlightsTitle" | "emptyNotesTitle" | "emptyBookmarksTitle"; body: "emptyHighlightsBody" | "emptyNotesBody" | "emptyBookmarksBody" }> = {
  surlignages: { icon: Highlighter, title: "emptyHighlightsTitle", body: "emptyHighlightsBody" },
  notes: { icon: NotebookPen, title: "emptyNotesTitle", body: "emptyNotesBody" },
  favoris: { icon: Bookmark, title: "emptyBookmarksTitle", body: "emptyBookmarksBody" },
};

async function PassageList({ translation, items, kind }: { translation: TranslationInfo; items: readonly (VerseCoordinates & { id: string })[]; kind: "highlight" | "bookmark" }) {
  const passages = await getPassages(translation, items);
  return (
    <ul className="mt-6 flex flex-col gap-6">
      {items.map((item, index) => {
        const passage = passages[index];
        return passage ? (
          <li key={item.id} className="flex items-start justify-between gap-2">
            <VerseQuote passage={passage} className="flex-1" />
            <RemoveAnnotationButton id={item.id} kind={kind} reference={passage.reference} />
          </li>
        ) : null;
      })}
    </ul>
  );
}

export default async function MyBibleNotesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/connexion?retour=/bible/mes-notes");
  const t = await getTranslations("bible.annotations");
  const { onglet, curseur } = annotationListQuerySchema.parse(await searchParams);
  const userId = session.actor.userId;
  const translation = await getTranslation();
  const take = ANNOTATIONS_PAGE_SIZE + 1;

  const rows =
    onglet === "surlignages" ? await listHighlights(userId, curseur, take) : onglet === "notes" ? await listNotes(userId, curseur, take) : await listBookmarks(userId, curseur, take);
  const page = rows.slice(0, ANNOTATIONS_PAGE_SIZE);
  const nextCursor = rows.length > ANNOTATIONS_PAGE_SIZE ? page.at(-1)?.id : undefined;
  const empty = EMPTY[onglet];
  const books = translation ? await getCatalog(translation) : [];
  const nameOf = (bookId: string): string => books.find((book) => book.id === bookId)?.name ?? bookId;

  return (
    <>
      <h1 className="font-serif text-display-sm text-fg sm:text-display-md">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("intro")}</p>
      <nav aria-label={t("tabsLabel")} className="mt-5 flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={`/bible/mes-notes?onglet=${key}` as Route}
            aria-current={onglet === key ? "page" : undefined}
            className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm text-fg hover:bg-bg-subtle aria-[current]:border-accent aria-[current]:bg-accent-subtle aria-[current]:font-semibold"
          >
            {t(label)}
          </Link>
        ))}
      </nav>

      {page.length === 0 ? (
        <EmptyState
          icon={empty.icon}
          title={t(empty.title)}
          body={t(empty.body)}
          actions={
            <Button asChild>
              <Link href="/bible">
                <BookOpen aria-hidden="true" />
                {t("openReader")}
              </Link>
            </Button>
          }
        />
      ) : null}

      {page.length > 0 && onglet === "notes" ? (
        <div className="mt-4">
          <NoteList
            notes={(page as Awaited<ReturnType<typeof listNotes>>).map((note) => ({
              id: note.id,
              body: note.body,
              reference: formatReference(nameOf(note.bookId), note.chapter, note.verseStart, note.verseEnd),
            }))}
          />
        </div>
      ) : null}
      {page.length > 0 && onglet !== "notes" && translation ? (
        <PassageList translation={translation} items={page} kind={onglet === "surlignages" ? "highlight" : "bookmark"} />
      ) : null}

      {nextCursor ? (
        <div className="mt-6">
          <Button asChild variant="secondary">
            <Link href={`/bible/mes-notes?onglet=${onglet}&curseur=${nextCursor}` as Route}>{t("more")}</Link>
          </Button>
        </div>
      ) : null}
    </>
  );
}
