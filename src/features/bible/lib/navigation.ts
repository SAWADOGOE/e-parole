import type { CatalogBook, ChapterLink } from "../types";

export interface ChapterNeighbours {
  previous: ChapterLink | null;
  next: ChapterLink | null;
}

const toLink = (book: CatalogBook, chapter: number): ChapterLink => ({ bookName: book.name, bookSlug: book.slug, chapter });

function importedChapters(book: CatalogBook): number[] {
  return Object.keys(book.verseCounts)
    .map(Number)
    .sort((a, b) => a - b);
}

/**
 * Chapitres voisins dans l'ordre canonique, y compris d'un livre à l'autre (Jean 21 → Actes 1).
 * Seuls les chapitres importés comptent : aucun lien ne peut mener à une page vide.
 */
export function chapterNeighbours(books: readonly CatalogBook[], bookId: string, chapter: number): ChapterNeighbours {
  const flat = [...books]
    .sort((a, b) => a.order - b.order)
    .flatMap((book) => importedChapters(book).map((number) => ({ book, number })));
  const index = flat.findIndex((entry) => entry.book.id === bookId && entry.number === chapter);
  if (index < 0) return { previous: null, next: null };
  const previous = flat[index - 1];
  const next = flat[index + 1];
  return {
    previous: previous ? toLink(previous.book, previous.number) : null,
    next: next ? toLink(next.book, next.number) : null,
  };
}
