import { formatReference } from "../lib/format";
import type { CatalogBook, Passage, TranslationInfo, VerseCoordinates } from "../types";
import type { StoredVerse } from "./repository";

/** Assemble un passage : référence + texte issu de la base + attribution, toujours ensemble. */
export function buildPassage(
  translation: TranslationInfo,
  books: readonly CatalogBook[],
  ref: VerseCoordinates,
  stored: readonly StoredVerse[],
): Passage | null {
  const book = books.find((entry) => entry.id === ref.bookId);
  const verses = stored
    .filter((v) => v.bookId === ref.bookId && v.chapter === ref.chapter && v.verse >= ref.verseStart && v.verse <= ref.verseEnd)
    .map(({ verse, text }) => ({ verse, text }));
  if (!book || verses.length === 0) return null;
  return {
    ...ref,
    bookName: book.name,
    bookSlug: book.slug,
    reference: formatReference(book.name, ref.chapter, ref.verseStart, ref.verseEnd),
    verses,
    translationName: translation.name,
    attribution: translation.attribution,
  };
}
