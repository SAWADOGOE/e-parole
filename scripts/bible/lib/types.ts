/** Verset tel que produit par un fournisseur, après normalisation technique. */
export interface SourceVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

/** Éléments de la source volontairement écartés, comptés pour le rapport d'intégrité. */
export type IgnoredCounts = Record<string, number>;

/** Interface d'import (docs/bible/BIBLE-MODULE.md) : un fournisseur lit une source et émet des versets. */
export interface BibleSourceProvider {
  readonly id: string;
  read(filePath: string): AsyncIterable<SourceVerse>;
  /** Disponible une fois la lecture terminée. */
  ignored(): IgnoredCounts;
}

export interface TranslationRecord {
  code: string;
  name: string;
  language: string;
  licenseType: "PUBLIC_DOMAIN" | "CC_BY" | "CC_BY_SA" | "LICENSED";
  licenseUrl: string;
  attribution: string;
  sourceUrl: string;
}

export interface ChapterSummary {
  book: string;
  chapter: number;
  verseCount: number;
}

export interface IntegrityReport {
  bookCount: number;
  chapterCount: number;
  verseCount: number;
  checksum: string;
  chapters: ChapterSummary[];
  /** Anomalies bloquantes : un import réel est refusé tant que cette liste n'est pas vide. */
  errors: string[];
  /** Observations non bloquantes (versets courts, etc.). */
  warnings: string[];
}
