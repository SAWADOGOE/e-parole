import { db, Prisma, type TransactionClient } from "@/server/db";
import { BIBLE_LANGUAGE } from "../constants";
import { HEADLINE_START, HEADLINE_STOP } from "../lib/search-text";
import type { ColoredRange } from "../lib/highlight-ranges";
import type {
  BookmarkMark,
  CatalogBook,
  ChapterAnnotations,
  ChapterVerse,
  HighlightColorName,
  HighlightMark,
  NoteMark,
  ReaderPrefs,
  TestamentName,
  TranslationInfo,
  VerseCoordinates,
  VerseRange,
} from "../types";

/** Accès aux données Bible. Le rôle applicatif n'a que SELECT sur le texte : aucune écriture de bible_verse ici. */

// --- Texte et référentiel ---------------------------------------------------

export async function findPublishedTranslation(code: string): Promise<TranslationInfo | null> {
  const row = await db.bibleTranslation.findFirst({
    where: { code, isPublished: true, activeVersionId: { not: null } },
    select: { id: true, code: true, name: true, attribution: true, activeVersionId: true },
  });
  if (row?.activeVersionId == null) return null;
  return { id: row.id, code: row.code, name: row.name, attribution: row.attribution, versionId: row.activeVersionId };
}

export async function findCatalog(versionId: number): Promise<CatalogBook[]> {
  const [books, metas] = await Promise.all([
    db.bibleBook.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
        testament: true,
        chapterCount: true,
        names: { where: { language: BIBLE_LANGUAGE }, select: { name: true, slug: true, abbreviations: true } },
      },
    }),
    db.bibleChapterMeta.findMany({ where: { versionId }, select: { bookId: true, chapter: true, verseCount: true } }),
  ]);
  const counts = new Map<string, Record<number, number>>();
  for (const { bookId, chapter, verseCount } of metas) {
    const entry = counts.get(bookId) ?? {};
    entry[chapter] = verseCount;
    counts.set(bookId, entry);
  }
  return books.flatMap((book) => {
    const name = book.names[0];
    if (!name) return [];
    return [
      {
        id: book.id,
        order: book.order,
        testament: book.testament,
        chapterCount: book.chapterCount,
        name: name.name,
        slug: name.slug,
        abbreviations: name.abbreviations,
        verseCounts: counts.get(book.id) ?? {},
      },
    ];
  });
}

export async function findChapterVerses(versionId: number, bookId: string, chapter: number): Promise<ChapterVerse[]> {
  return db.bibleVerse.findMany({
    where: { versionId, bookId, chapter },
    orderBy: { verse: "asc" },
    select: { verse: true, text: true },
  });
}

export async function findVerseCount(versionId: number, bookId: string, chapter: number): Promise<number | null> {
  const meta = await db.bibleChapterMeta.findUnique({
    where: { versionId_bookId_chapter: { versionId, bookId, chapter } },
    select: { verseCount: true },
  });
  return meta?.verseCount ?? null;
}

export type StoredVerse = ChapterVerse & { bookId: string; chapter: number };

/** Une seule requête pour plusieurs passages (listes d'annotations) : pas de N+1. */
export async function findVersesForRanges(versionId: number, targets: readonly VerseCoordinates[]): Promise<StoredVerse[]> {
  if (targets.length === 0) return [];
  return db.bibleVerse.findMany({
    where: {
      versionId,
      OR: targets.map(({ bookId, chapter, verseStart, verseEnd }) => ({ bookId, chapter, verse: { gte: verseStart, lte: verseEnd } })),
    },
    orderBy: [{ bookId: "asc" }, { chapter: "asc" }, { verse: "asc" }],
    select: { bookId: true, chapter: true, verse: true, text: true },
  });
}

export async function findSimilarBookIds(term: string, limit: number): Promise<string[]> {
  const rows = await db.$queryRaw<{ bookId: string }[]>`
    SELECT "bookId" FROM "bible_book_name"
    WHERE "language" = ${BIBLE_LANGUAGE} AND public.bible_fold("name") % public.bible_fold(${term})
    ORDER BY similarity(public.bible_fold("name"), public.bible_fold(${term})) DESC
    LIMIT ${limit}`;
  return rows.map((row) => row.bookId);
}

// --- Recherche plein texte --------------------------------------------------

export interface SearchFilters {
  versionId: number;
  query: string;
  testament?: TestamentName | undefined;
  bookId?: string | undefined;
}

export interface SearchRow {
  id: number;
  bookId: string;
  chapter: number;
  verse: number;
  rank: string;
  headline: string;
}

const tsQuery = (query: string): Prisma.Sql => Prisma.sql`websearch_to_tsquery('public.french_unaccent'::regconfig, ${query})`;
const HEADLINE_OPTIONS = `StartSel=${HEADLINE_START},StopSel=${HEADLINE_STOP},HighlightAll=true`;

export async function isEmptySearchQuery(query: string): Promise<boolean> {
  const rows = await db.$queryRaw<{ empty: boolean }[]>`SELECT numnode(${tsQuery(query)}) = 0 AS empty`;
  return rows[0]?.empty ?? true;
}

export async function searchVerses(
  filters: SearchFilters,
  cursor: { rank: string; id: number } | null,
  limit: number,
): Promise<SearchRow[]> {
  const conditions = [Prisma.sql`v."versionId" = ${filters.versionId}`, Prisma.sql`v."search" @@ q.query`];
  if (filters.testament) conditions.push(Prisma.sql`b."testament" = ${filters.testament}::"Testament"`);
  if (filters.bookId) conditions.push(Prisma.sql`v."bookId" = ${filters.bookId}`);
  const after = cursor
    ? Prisma.sql`WHERE r.rank < ${cursor.rank}::real OR (r.rank = ${cursor.rank}::real AND r.id > ${cursor.id})`
    : Prisma.empty;
  // Les identifiants suivent l'ordre canonique de l'import : à rang égal, l'ordre de lecture est conservé.
  return db.$queryRaw<SearchRow[]>`
    WITH q AS (SELECT ${tsQuery(filters.query)} AS query),
    ranked AS (
      SELECT v.id, v."bookId", v.chapter, v.verse, v.text, ts_rank_cd(v."search", q.query) AS rank
      FROM "bible_verse" v
      JOIN "bible_book" b ON b.id = v."bookId"
      CROSS JOIN q
      WHERE ${Prisma.join(conditions, " AND ")}
    ),
    page AS (SELECT * FROM ranked r ${after} ORDER BY r.rank DESC, r.id ASC LIMIT ${limit})
    SELECT p.id, p."bookId", p.chapter, p.verse, p.rank::text AS rank,
      ts_headline('public.french_unaccent'::regconfig, p.text, q.query, ${HEADLINE_OPTIONS}) AS headline
    FROM page p CROSS JOIN q
    ORDER BY p.rank DESC, p.id ASC`;
}

export async function searchFacets(filters: SearchFilters): Promise<{ bookId: string; count: number }[]> {
  const conditions = [Prisma.sql`v."versionId" = ${filters.versionId}`, Prisma.sql`v."search" @@ ${tsQuery(filters.query)}`];
  if (filters.testament) conditions.push(Prisma.sql`b."testament" = ${filters.testament}::"Testament"`);
  return db.$queryRaw<{ bookId: string; count: number }[]>`
    SELECT v."bookId", count(*)::int AS count
    FROM "bible_verse" v JOIN "bible_book" b ON b.id = v."bookId"
    WHERE ${Prisma.join(conditions, " AND ")}
    GROUP BY v."bookId", b."order"
    ORDER BY b."order"`;
}

// --- Annotations : chaque requête est filtrée par userId ---------------------

interface ChapterScope {
  userId: string;
  translationId: number;
  bookId: string;
  chapter: number;
}

export async function findChapterAnnotations(scope: ChapterScope): Promise<ChapterAnnotations> {
  const range = { verseStart: true, verseEnd: true, id: true } as const;
  const [highlights, notes, bookmarks] = await Promise.all([
    db.bibleHighlight.findMany({ where: scope, orderBy: { verseStart: "asc" }, select: { ...range, color: true } }),
    db.bibleNote.findMany({ where: scope, orderBy: { verseStart: "asc" }, select: { ...range, body: true } }),
    db.bibleBookmark.findMany({ where: scope, orderBy: { verseStart: "asc" }, select: range }),
  ]);
  return { highlights, notes, bookmarks };
}

export async function replaceChapterHighlights(
  scope: ChapterScope,
  compute: (existing: readonly ColoredRange[]) => readonly ColoredRange[],
): Promise<void> {
  await db.$transaction(async (tx) => {
    const existing = await tx.bibleHighlight.findMany({ where: scope, select: { verseStart: true, verseEnd: true, color: true } });
    const next = compute(existing);
    await tx.bibleHighlight.deleteMany({ where: scope });
    await tx.bibleHighlight.createMany({ data: next.map((range) => ({ ...scope, ...range })) });
  });
}

export async function toggleBookmarks(scope: ChapterScope, ranges: readonly VerseRange[]): Promise<{ added: boolean }> {
  return db.$transaction(async (tx) => {
    const where = { ...scope, OR: ranges.map(({ verseStart, verseEnd }) => ({ verseStart, verseEnd })) };
    const found = await tx.bibleBookmark.count({ where });
    // Tout est déjà en favori : le geste retire. Sinon il complète.
    if (found === ranges.length) {
      await tx.bibleBookmark.deleteMany({ where });
      return { added: false };
    }
    await tx.bibleBookmark.createMany({ data: ranges.map((range) => ({ ...scope, ...range })), skipDuplicates: true });
    return { added: true };
  });
}

export async function createNote(scope: ChapterScope, range: VerseRange, body: string): Promise<{ id: string }> {
  return db.bibleNote.create({ data: { ...scope, ...range, body }, select: { id: true } });
}

export async function findNoteOwner(id: string): Promise<string | null> {
  const note = await db.bibleNote.findUnique({ where: { id }, select: { userId: true } });
  return note?.userId ?? null;
}

export async function findHighlightOwner(id: string): Promise<string | null> {
  const row = await db.bibleHighlight.findUnique({ where: { id }, select: { userId: true } });
  return row?.userId ?? null;
}

export async function findBookmarkOwner(id: string): Promise<string | null> {
  const row = await db.bibleBookmark.findUnique({ where: { id }, select: { userId: true } });
  return row?.userId ?? null;
}

export async function updateNote(id: string, userId: string, body: string): Promise<number> {
  const { count } = await db.bibleNote.updateMany({ where: { id, userId }, data: { body } });
  return count;
}

export async function deleteNote(id: string, userId: string): Promise<number> {
  const { count } = await db.bibleNote.deleteMany({ where: { id, userId } });
  return count;
}

export async function deleteHighlight(id: string, userId: string): Promise<number> {
  const { count } = await db.bibleHighlight.deleteMany({ where: { id, userId } });
  return count;
}

export async function deleteBookmark(id: string, userId: string): Promise<number> {
  const { count } = await db.bibleBookmark.deleteMany({ where: { id, userId } });
  return count;
}

interface ListedAnnotation extends VerseCoordinates {
  id: string;
}

export type ListedHighlight = ListedAnnotation & Pick<HighlightMark, "color">;
export type ListedNote = ListedAnnotation & Pick<NoteMark, "body"> & { updatedAt: Date };
export type ListedBookmark = ListedAnnotation & Pick<BookmarkMark, "id">;

const coordinates = { id: true, bookId: true, chapter: true, verseStart: true, verseEnd: true } as const;
const newestFirst = [{ createdAt: "desc" }, { id: "desc" }] as const;

function paging(cursor: string | undefined, take: number) {
  return { take, orderBy: [...newestFirst], ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) };
}

export async function listHighlights(userId: string, cursor: string | undefined, take: number): Promise<ListedHighlight[]> {
  return db.bibleHighlight.findMany({ where: { userId }, select: { ...coordinates, color: true }, ...paging(cursor, take) });
}

export async function listNotes(userId: string, cursor: string | undefined, take: number): Promise<ListedNote[]> {
  return db.bibleNote.findMany({ where: { userId }, select: { ...coordinates, body: true, updatedAt: true }, ...paging(cursor, take) });
}

export async function listBookmarks(userId: string, cursor: string | undefined, take: number): Promise<ListedBookmark[]> {
  return db.bibleBookmark.findMany({ where: { userId }, select: coordinates, ...paging(cursor, take) });
}

// --- État de lecture --------------------------------------------------------

export interface ReadingState extends ReaderPrefs {
  bookId: string | null;
  chapter: number | null;
}

export async function findReadingState(userId: string): Promise<ReadingState | null> {
  return db.bibleReadingState.findUnique({
    where: { userId },
    select: { bookId: true, chapter: true, fontSize: true, lineHeight: true, theme: true, font: true, showVerseNumbers: true },
  });
}

export async function saveReadingPosition(userId: string, translationId: number, bookId: string, chapter: number): Promise<void> {
  const position = { translationId, bookId, chapter };
  await db.bibleReadingState.upsert({ where: { userId }, create: { userId, ...position }, update: position });
}

export async function saveReaderPrefs(userId: string, prefs: ReaderPrefs): Promise<void> {
  await db.bibleReadingState.upsert({ where: { userId }, create: { userId, ...prefs }, update: prefs });
}

// --- Verset du jour ---------------------------------------------------------

export interface DailyVerseRow extends VerseCoordinates {
  id: string;
  date: Date;
  translationId: number;
  reflection: string | null;
  isAutomatic: boolean;
}

const dailySelect = {
  id: true,
  date: true,
  translationId: true,
  bookId: true,
  chapter: true,
  verseStart: true,
  verseEnd: true,
  reflection: true,
  isAutomatic: true,
} as const;

export async function findDailyVerse(date: Date): Promise<DailyVerseRow | null> {
  return db.dailyVerse.findUnique({ where: { date }, select: dailySelect });
}

export async function listDailyVerses(from: Date, to: Date): Promise<DailyVerseRow[]> {
  return db.dailyVerse.findMany({ where: { date: { gte: from, lte: to } }, orderBy: { date: "asc" }, select: dailySelect });
}

export async function listRecentDailyVerses(take: number, before: Date): Promise<DailyVerseRow[]> {
  return db.dailyVerse.findMany({ where: { date: { lt: before } }, orderBy: { date: "desc" }, take, select: dailySelect });
}

export async function findDailyVerseDuplicates(ref: VerseCoordinates, date: Date, windowDays: number): Promise<Date[]> {
  const span = windowDays * 86_400_000;
  const rows = await db.dailyVerse.findMany({
    where: {
      bookId: ref.bookId,
      chapter: ref.chapter,
      verseStart: { lte: ref.verseEnd },
      verseEnd: { gte: ref.verseStart },
      date: { gte: new Date(date.getTime() - span), lte: new Date(date.getTime() + span), not: date },
    },
    orderBy: { date: "asc" },
    select: { date: true },
  });
  return rows.map((row) => row.date);
}

export async function listPool(): Promise<VerseCoordinates[]> {
  return db.dailyVersePool.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
    select: { bookId: true, chapter: true, verseStart: true, verseEnd: true },
  });
}

/** N'écrase jamais un verset programmé par un éditeur. */
export async function insertAutomaticDailyVerse(date: Date, translationId: number, ref: VerseCoordinates): Promise<boolean> {
  const { count } = await db.dailyVerse.createMany({
    data: [{ date, translationId, ...ref, isAutomatic: true }],
    skipDuplicates: true,
  });
  return count > 0;
}

export async function upsertDailyVerse(
  tx: TransactionClient,
  data: VerseCoordinates & { date: Date; translationId: number; reflection: string | null; scheduledById: string },
): Promise<{ id: string; created: boolean }> {
  const existing = await tx.dailyVerse.findUnique({ where: { date: data.date }, select: { id: true } });
  if (existing) {
    await tx.dailyVerse.update({ where: { id: existing.id }, data: { ...data, isAutomatic: false } });
    return { id: existing.id, created: false };
  }
  const row = await tx.dailyVerse.create({ data, select: { id: true } });
  return { id: row.id, created: true };
}

export async function removeDailyVerse(tx: TransactionClient, date: Date): Promise<string | null> {
  const row = await tx.dailyVerse.findUnique({ where: { date }, select: { id: true } });
  if (!row) return null;
  await tx.dailyVerse.delete({ where: { id: row.id } });
  return row.id;
}

// --- Administration ---------------------------------------------------------

export async function listTranslationsForAdmin() {
  return db.bibleTranslation.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      licenseType: true,
      licenseUrl: true,
      licenseEvidence: true,
      attribution: true,
      sourceUrl: true,
      sourceRetrievedAt: true,
      isPublished: true,
      activeVersionId: true,
      versions: {
        orderBy: { id: "desc" },
        select: {
          id: true,
          status: true,
          sourceProvider: true,
          sourceSha256: true,
          checksum: true,
          bookCount: true,
          chapterCount: true,
          verseCount: true,
          importedAt: true,
          activatedAt: true,
          importedBy: true,
        },
      },
    },
  });
}

export type AdminTranslation = Awaited<ReturnType<typeof listTranslationsForAdmin>>[number];

export async function findVersionTranslation(versionId: number): Promise<{ code: string; checksum: string } | null> {
  const row = await db.bibleTranslationVersion.findUnique({
    where: { id: versionId },
    select: { checksum: true, translation: { select: { code: true } } },
  });
  return row ? { code: row.translation.code, checksum: row.checksum } : null;
}

export async function findTranslationCode(id: number): Promise<string | null> {
  const row = await db.bibleTranslation.findUnique({ where: { id }, select: { code: true } });
  return row?.code ?? null;
}

/** Seules écritures atteignables depuis l'application : fonctions SECURITY DEFINER limitées à une bascule d'état. */
export async function activateVersion(tx: TransactionClient, versionId: number): Promise<void> {
  await tx.$executeRaw`SELECT public.bible_activate_version(${versionId}::integer)`;
}

export async function setTranslationPublished(tx: TransactionClient, translationId: number, published: boolean): Promise<void> {
  await tx.$executeRaw`SELECT public.bible_set_published(${translationId}::integer, ${published}::boolean)`;
}

export type { HighlightColorName };
