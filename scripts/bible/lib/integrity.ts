import { BIBLE_BOOKS } from "../../../prisma/seed/bible-catalog";
import { sha256 } from "./normalize";
import type { ChapterSummary, IntegrityReport, SourceVerse } from "./types";

const ORDER = new Map(BIBLE_BOOKS.map((book, index) => [book.id, index]));

/** Empreinte globale : indépendante de l'ordre de lecture, sensible au moindre caractère de chaque verset. */
export function globalChecksum(verses: readonly SourceVerse[]): string {
  const lines = [...verses]
    .sort((a, b) => (ORDER.get(a.book) ?? 0) - (ORDER.get(b.book) ?? 0) || a.chapter - b.chapter || a.verse - b.verse)
    .map((v) => `${v.book}\t${v.chapter}\t${v.verse}\t${sha256(v.text)}`);
  return sha256(lines.join("\n"));
}

export interface IntegrityOptions {
  /** Échantillon de test : le canon complet n'est pas exigé, les autres contrôles restent actifs. */
  partial?: boolean;
}

/** Contrôle la structure de la source sans jamais la corriger. */
export function checkIntegrity(verses: readonly SourceVerse[], options: IntegrityOptions = {}): IntegrityReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  const byChapter = new Map<string, { book: string; chapter: number; numbers: number[] }>();

  for (const { book, chapter, verse, text } of verses) {
    const key = `${book} ${chapter}:${verse}`;
    if (!ORDER.has(book)) errors.push(`Livre hors du canon : ${book}`);
    if (seen.has(key)) errors.push(`Verset en double : ${key}`);
    seen.add(key);
    if (!text) errors.push(`Verset vide : ${key}`);
    const chapterKey = `${book} ${chapter}`;
    const entry = byChapter.get(chapterKey) ?? { book, chapter, numbers: [] };
    entry.numbers.push(verse);
    byChapter.set(chapterKey, entry);
  }

  const chapters: ChapterSummary[] = [];
  for (const { book, chapter, numbers } of byChapter.values()) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const max = sorted.at(-1) ?? 0;
    // Une numérotation trouée est signalée mais n'est pas une erreur : elle peut appartenir à la source.
    if (sorted.length !== max) warnings.push(`${book} ${chapter} : ${sorted.length} versets pour une numérotation allant jusqu'à ${max}`);
    chapters.push({ book, chapter, verseCount: sorted.length });
  }
  chapters.sort((a, b) => (ORDER.get(a.book) ?? 0) - (ORDER.get(b.book) ?? 0) || a.chapter - b.chapter);

  const books = new Set(chapters.map((c) => c.book));
  if (!options.partial) {
    if (books.size !== BIBLE_BOOKS.length) errors.push(`${books.size} livres trouvés pour ${BIBLE_BOOKS.length} attendus`);
    for (const { id, chapterCount } of BIBLE_BOOKS) {
      const found = chapters.filter((c) => c.book === id).length;
      if (books.has(id) && found !== chapterCount) errors.push(`${id} : ${found} chapitres pour ${chapterCount} attendus`);
      if (!books.has(id)) errors.push(`Livre manquant : ${id}`);
    }
  }

  return {
    bookCount: books.size,
    chapterCount: chapters.length,
    verseCount: verses.length,
    checksum: globalChecksum(verses),
    chapters,
    errors,
    warnings,
  };
}
