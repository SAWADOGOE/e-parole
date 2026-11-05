import "server-only";
import { notFound, permanentRedirect } from "next/navigation";
import { chapterPath } from "../lib/format";
import { foldText } from "../lib/parse-reference";
import type { CatalogBook, TranslationInfo } from "../types";
import { getCatalog, getTranslation } from "./reader";

export interface ResolvedChapter {
  translation: TranslationInfo;
  books: CatalogBook[];
  book: CatalogBook;
  chapter: number;
}

export function findBookBySegment(books: readonly CatalogBook[], segment: string): CatalogBook | undefined {
  const key = foldText(decodeURIComponent(segment)).replace(/[\s-]+/g, "");
  return books.find((book) => book.slug === segment) ?? books.find((book) => book.id.toLowerCase() === key || book.abbreviations.includes(key));
}

/** Résout une URL de chapitre. null : aucune traduction publiée (état vide, pas une erreur). */
export async function resolveChapter(livre: string, chapitre: string): Promise<ResolvedChapter | null> {
  const translation = await getTranslation();
  if (!translation) return null;
  const books = await getCatalog(translation);
  const book = findBookBySegment(books, livre);
  const chapter = Number(chapitre);
  if (!book || !/^\d{1,3}$/.test(chapitre) || book.verseCounts[chapter] === undefined) notFound();
  return { translation, books, book, chapter };
}

/**
 * À appeler dans le layout du chapitre, avant tout flux : une fois le flux commencé, le statut HTTP est figé à 200.
 * Ici, un chapitre inexistant répond vraiment 404 et une variante d'URL vraiment 308.
 */
export async function assertCanonicalChapter(livre: string, chapitre: string): Promise<void> {
  const resolved = await resolveChapter(livre, chapitre);
  if (resolved && (livre !== resolved.book.slug || chapitre !== String(resolved.chapter))) {
    permanentRedirect(chapterPath(resolved.book.slug, resolved.chapter));
  }
}
