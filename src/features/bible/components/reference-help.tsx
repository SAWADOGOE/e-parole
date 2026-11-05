import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatReference, passagePath } from "../lib/format";
import type { ParsedReference, ReferenceError } from "../lib/parse-reference";
import { findSimilarBookIds } from "../server/repository";
import type { CatalogBook } from "../types";

export function referencePath(books: readonly CatalogBook[], ref: ParsedReference): string | null {
  const book = books.find((entry) => entry.id === ref.bookId);
  return book ? passagePath(book.slug, ref.chapter, ref.verseStart, ref.verseEnd) : null;
}

function referenceLabel(books: readonly CatalogBook[], ref: ParsedReference): string {
  return formatReference(books.find((entry) => entry.id === ref.bookId)?.name ?? ref.bookId, ref.chapter, ref.verseStart, ref.verseEnd);
}

const LINK = "inline-flex min-h-11 items-center text-accent underline underline-offset-4";

/** Une référence invalide explique et propose : jamais de page d'erreur (US-2). */
export async function ReferenceHelp({ error, books }: { error: ReferenceError; books: readonly CatalogBook[] }) {
  const t = await getTranslations("bible.search");
  if (error.code === "NOT_A_REFERENCE") return null;
  const bookName = (id: string): string => books.find((entry) => entry.id === id)?.name ?? id;

  if (error.code === "UNKNOWN_BOOK") {
    const ids = error.suggestions.length > 0 ? error.suggestions : await findSimilarBookIds(error.input, 5);
    return (
      <div role="status" className="mt-6 rounded-md border bg-bg-elevated p-4">
        <p className="text-fg">{t("bookError", { input: error.input })}</p>
        {ids.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {ids.map((id) => {
              const path = referencePath(books, { bookId: id, chapter: 1 });
              return path ? (
                <li key={id}>
                  <Link href={path} className={LINK}>
                    {bookName(id)}
                  </Link>
                </li>
              ) : null;
            })}
          </ul>
        ) : null}
      </div>
    );
  }

  const message =
    error.code === "CHAPTER_OUT_OF_RANGE"
      ? t("chapterError", { book: bookName(error.bookId), count: error.maxChapter })
      : error.code === "VERSE_OUT_OF_RANGE"
        ? t("verseError", { book: bookName(error.bookId), chapter: error.chapter, count: error.maxVerse })
        : t("rangeError");
  const path = referencePath(books, error.suggestion);
  return (
    <div role="status" className="mt-6 rounded-md border bg-bg-elevated p-4">
      <p className="text-fg">{message}</p>
      {path ? (
        <Link href={path} className={`mt-1 ${LINK}`}>
          {t("suggestion", { reference: referenceLabel(books, error.suggestion) })}
        </Link>
      ) : null}
    </div>
  );
}
