/** Parseur de références bibliques françaises : fonction pure, sans accès aux données (docs/bible/BIBLE-SEARCH.md). */

export interface ReferenceBook {
  id: string;
  name: string;
  abbreviations: readonly string[];
  chapterCount: number;
  verseCounts: Readonly<Record<number, number>>;
}

export interface ParsedReference {
  bookId: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

export type ReferenceError =
  /** Rien ne ressemble à une référence : la saisie relève de la recherche plein texte. */
  | { code: "NOT_A_REFERENCE" }
  | { code: "UNKNOWN_BOOK"; input: string; suggestions: readonly string[] }
  | { code: "CHAPTER_OUT_OF_RANGE"; bookId: string; chapter: number; maxChapter: number; suggestion: ParsedReference }
  | { code: "VERSE_OUT_OF_RANGE"; bookId: string; chapter: number; verse: number; maxVerse: number; suggestion: ParsedReference }
  | { code: "INVALID_RANGE"; bookId: string; chapter: number; suggestion: ParsedReference };

export type ParseResult = { ok: true; reference: ParsedReference } | { ok: false; error: ReferenceError };

const MAX_INPUT_LENGTH = 80;
const MIN_BOOK_ONLY_KEY_LENGTH = 6;
const MAX_SUGGESTIONS = 5;
const MAX_EDIT_DISTANCE = 2;

const ORDINALS: Readonly<Record<string, string>> = {
  i: "1", ii: "2", iii: "3",
  premier: "1", premiere: "1", "1er": "1", "1ere": "1", "1re": "1",
  deuxieme: "2", second: "2", seconde: "2", "2e": "2", "2eme": "2", "2nd": "2", "2nde": "2",
  troisieme: "3", "3e": "3", "3eme": "3",
};

const ORDINAL_PREFIX = /^(premiere?|deuxieme|seconde?|troisieme|1ere|1er|1re|2eme|2nde|2nd|2e|3eme|3e|iii|ii|i)\s+/;

const REFERENCE =
  /^([1-3]?\s*[a-z]+(?:[ -][a-z]+)*?)\.?\s*(?:(\d{1,4})(?:(?:\s*[:.,]\s*|\s*v(?:ersets?)?\.?\s*|\s+)(\d{1,4}))?(?:\s*(?:-|a|au)\s*(\d{1,4})(?:\s*[:.]\s*(\d{1,4}))?)?)?$/;

export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function bookKey(raw: string): string {
  const ordinal = ORDINAL_PREFIX.exec(raw);
  const expanded = ordinal?.[1] ? `${ORDINALS[ordinal[1]] ?? ""}${raw.slice(ordinal[0].length)}` : raw;
  return expanded.replace(/[\s-]+/g, "");
}

function findBook(key: string, books: readonly ReferenceBook[]): ReferenceBook | undefined {
  return books.find((book) => book.abbreviations.includes(key));
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + cost);
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/** Livres proches d'une saisie partielle ou mal orthographiée, pour les suggestions (« Jea » → Jean, Jacques). */
export function suggestBooks(input: string, books: readonly ReferenceBook[]): string[] {
  const key = bookKey(foldText(input));
  if (!key) return [];
  const scored = books.flatMap((book) => {
    const name = bookKey(foldText(book.name));
    if (name.startsWith(key) || book.abbreviations.some((abbreviation) => abbreviation.startsWith(key))) {
      return [{ id: book.id, score: 0 }];
    }
    // Comparaison à longueur égale : « Jea » reste proche de « Jacques » par son début.
    const distance = editDistance(key, name.slice(0, Math.max(key.length, 1)));
    return distance <= Math.min(MAX_EDIT_DISTANCE, key.length - 1) ? [{ id: book.id, score: distance }] : [];
  });
  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => entry.id);
}

function validate(book: ReferenceBook, chapter: number, verseStart?: number, verseEnd?: number): ParseResult {
  if (chapter < 1 || chapter > book.chapterCount) {
    const target = chapter < 1 ? 1 : book.chapterCount;
    return {
      ok: false,
      error: {
        code: "CHAPTER_OUT_OF_RANGE",
        bookId: book.id,
        chapter,
        maxChapter: book.chapterCount,
        suggestion: { bookId: book.id, chapter: target },
      },
    };
  }
  if (verseStart === undefined) return { ok: true, reference: { bookId: book.id, chapter } };

  if (verseEnd !== undefined && verseEnd < verseStart) {
    return {
      ok: false,
      error: {
        code: "INVALID_RANGE",
        bookId: book.id,
        chapter,
        suggestion: { bookId: book.id, chapter, verseStart: verseEnd, verseEnd: verseStart },
      },
    };
  }

  const maxVerse = book.verseCounts[chapter];
  if (maxVerse !== undefined) {
    const outOfRange = verseStart < 1 ? verseStart : verseStart > maxVerse ? verseStart : verseEnd !== undefined && verseEnd > maxVerse ? verseEnd : null;
    if (outOfRange !== null) {
      const clampedStart = Math.min(Math.max(verseStart, 1), maxVerse);
      return {
        ok: false,
        error: {
          code: "VERSE_OUT_OF_RANGE",
          bookId: book.id,
          chapter,
          verse: outOfRange,
          maxVerse,
          suggestion: {
            bookId: book.id,
            chapter,
            verseStart: clampedStart,
            ...(verseEnd !== undefined && clampedStart < maxVerse ? { verseEnd: maxVerse } : {}),
          },
        },
      };
    }
  }
  return {
    ok: true,
    reference: { bookId: book.id, chapter, verseStart, ...(verseEnd !== undefined && verseEnd !== verseStart ? { verseEnd } : {}) },
  };
}

export function parseReference(input: string, books: readonly ReferenceBook[]): ParseResult {
  const notReference: ParseResult = { ok: false, error: { code: "NOT_A_REFERENCE" } };
  if (input.length > MAX_INPUT_LENGTH) return notReference;
  const folded = foldText(input);
  if (!folded) return notReference;

  const match = REFERENCE.exec(folded);
  if (!match) return notReference;
  const [, rawBook = "", rawChapter, rawVerse, rawEnd, rawEndVerse] = match;
  const key = bookKey(rawBook.trim());
  const book = findBook(key, books);

  if (rawChapter === undefined) {
    // Sans chiffre, seul un nom complet ouvre un livre : « es » ou « la » restent une recherche de mots.
    if (!book) return notReference;
    const isFullName = bookKey(foldText(book.name)) === key || key.length >= MIN_BOOK_ONLY_KEY_LENGTH;
    return isFullName ? { ok: true, reference: { bookId: book.id, chapter: 1 } } : notReference;
  }

  if (!book) return { ok: false, error: { code: "UNKNOWN_BOOK", input: rawBook.trim(), suggestions: suggestBooks(rawBook, books) } };

  const first = Number(rawChapter);
  const second = rawVerse === undefined ? undefined : Number(rawVerse);
  const end = rawEnd === undefined ? undefined : Number(rawEnd);

  // Dans un livre d'un seul chapitre, « Jude 5 » désigne le verset 5.
  if (book.chapterCount === 1 && second === undefined) return validate(book, 1, first, end);

  // « Psaumes 23-24 » et « Jean 3:16-4:2 » : plages entre chapitres, ouvertes à leur début.
  if (second === undefined) return validate(book, first);
  if (rawEndVerse !== undefined) return validate(book, first, second);
  return validate(book, first, second, end);
}
