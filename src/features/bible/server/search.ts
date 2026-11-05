import { SEARCH_PAGE_SIZE } from "../constants";
import { formatReference } from "../lib/format";
import { decodeCursor, encodeCursor, splitHeadline } from "../lib/search-text";
import type { CatalogBook, SearchFacet, SearchHit, SearchPage, TestamentName, TranslationInfo } from "../types";
import { isEmptySearchQuery, searchFacets, searchVerses } from "./repository";

export interface SearchRequest {
  query: string;
  testament?: TestamentName | undefined;
  bookId?: string | undefined;
  cursor?: string | undefined;
}

export async function searchBible(translation: TranslationInfo, books: readonly CatalogBook[], request: SearchRequest): Promise<SearchPage> {
  const startedAt = performance.now();
  const empty: SearchPage = { hits: [], facets: [], total: 0, nextCursor: null, tooCommon: false, elapsedMs: 0 };
  if (await isEmptySearchQuery(request.query)) return { ...empty, tooCommon: request.query.trim().length > 0 };

  const filters = { versionId: translation.versionId, query: request.query, testament: request.testament, bookId: request.bookId };
  const [rows, facetRows] = await Promise.all([
    searchVerses(filters, decodeCursor(request.cursor), SEARCH_PAGE_SIZE + 1),
    searchFacets(filters),
  ]);

  const byId = new Map(books.map((book) => [book.id, book]));
  const page = rows.slice(0, SEARCH_PAGE_SIZE);
  const hits: SearchHit[] = page.flatMap((row) => {
    const book = byId.get(row.bookId);
    if (!book) return [];
    return [
      {
        id: row.id,
        bookId: row.bookId,
        bookName: book.name,
        bookSlug: book.slug,
        chapter: row.chapter,
        verse: row.verse,
        reference: formatReference(book.name, row.chapter, row.verse),
        segments: splitHeadline(row.headline),
      },
    ];
  });
  const facets: SearchFacet[] = facetRows.map(({ bookId, count }) => ({ bookId, count, bookName: byId.get(bookId)?.name ?? bookId }));
  const scoped = request.bookId ? facets.filter((facet) => facet.bookId === request.bookId) : facets;
  const last = page.at(-1);
  return {
    hits,
    facets,
    total: scoped.reduce((sum, facet) => sum + facet.count, 0),
    nextCursor: rows.length > SEARCH_PAGE_SIZE && last ? encodeCursor(last.rank, last.id) : null,
    tooCommon: false,
    elapsedMs: Math.round(performance.now() - startedAt),
  };
}
