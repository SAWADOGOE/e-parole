import type { HIGHLIGHT_COLORS, READER_FONTS, READER_THEMES } from "./constants";

export type HighlightColorName = (typeof HIGHLIGHT_COLORS)[number];
export type ReaderThemeName = (typeof READER_THEMES)[number];
export type ReaderFontName = (typeof READER_FONTS)[number];
export type TestamentName = "OT" | "NT";

export interface BookSummary {
  id: string;
  order: number;
  testament: TestamentName;
  name: string;
  slug: string;
  chapterCount: number;
}

export interface CatalogBook extends BookSummary {
  abbreviations: readonly string[];
  /** Nombre de versets par chapitre importé, pour valider une référence. */
  verseCounts: Readonly<Record<number, number>>;
}

export interface TranslationInfo {
  id: number;
  code: string;
  name: string;
  attribution: string;
  versionId: number;
}

export interface VerseRange {
  verseStart: number;
  verseEnd: number;
}

export interface VerseCoordinates extends VerseRange {
  bookId: string;
  chapter: number;
}

export interface ChapterVerse {
  verse: number;
  text: string;
}

export interface Passage extends VerseCoordinates {
  bookName: string;
  bookSlug: string;
  reference: string;
  verses: readonly ChapterVerse[];
  translationName: string;
  attribution: string;
}

export interface ChapterLink {
  bookName: string;
  bookSlug: string;
  chapter: number;
}

export interface ReaderPrefs {
  fontSize: number;
  lineHeight: number;
  theme: ReaderThemeName;
  font: ReaderFontName;
  showVerseNumbers: boolean;
}

export interface HighlightMark extends VerseRange {
  id: string;
  color: HighlightColorName;
}

export interface NoteMark extends VerseRange {
  id: string;
  body: string;
}

export interface BookmarkMark extends VerseRange {
  id: string;
}

export interface ChapterAnnotations {
  highlights: readonly HighlightMark[];
  notes: readonly NoteMark[];
  bookmarks: readonly BookmarkMark[];
}

export interface SearchHit {
  id: number;
  bookId: string;
  bookName: string;
  bookSlug: string;
  chapter: number;
  verse: number;
  reference: string;
  /** Texte découpé par ts_headline : rendu par React, jamais injecté comme HTML. */
  segments: readonly { text: string; match: boolean }[];
}

export interface SearchFacet {
  bookId: string;
  bookName: string;
  count: number;
}

export interface SearchPage {
  hits: readonly SearchHit[];
  facets: readonly SearchFacet[];
  total: number;
  nextCursor: string | null;
  /** La requête ne contient que des mots vides (« le », « de »…). */
  tooCommon: boolean;
  elapsedMs: number;
}
