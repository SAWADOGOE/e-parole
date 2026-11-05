import type { VerseRange } from "../types";

/** « Jean 3:16 », « 1 Corinthiens 13:4-7 », « Psaumes 23 ». */
export function formatReference(bookName: string, chapter: number, verseStart?: number, verseEnd?: number): string {
  if (verseStart === undefined) return `${bookName} ${chapter}`;
  const range = verseEnd !== undefined && verseEnd !== verseStart ? `${verseStart}-${verseEnd}` : `${verseStart}`;
  return `${bookName} ${chapter}:${range}`;
}

/** Regroupe une sélection en plages contiguës : [1, 2, 3, 7] → 1-3 et 7. */
export function toRanges(verses: Iterable<number>): VerseRange[] {
  const sorted = [...new Set(verses)].sort((a, b) => a - b);
  const ranges: VerseRange[] = [];
  for (const verse of sorted) {
    const last = ranges.at(-1);
    if (last?.verseEnd === verse - 1) last.verseEnd = verse;
    else ranges.push({ verseStart: verse, verseEnd: verse });
  }
  return ranges;
}

export function formatRanges(ranges: readonly VerseRange[]): string {
  return ranges.map(({ verseStart, verseEnd }) => (verseStart === verseEnd ? `${verseStart}` : `${verseStart}-${verseEnd}`)).join(", ");
}

/** « Jean 3:16, 18-19 » pour une sélection éventuellement discontinue. */
export function formatSelectionReference(bookName: string, chapter: number, verses: Iterable<number>): string {
  return `${bookName} ${chapter}:${formatRanges(toRanges(verses))}`;
}

/** Format de copie (docs/bible/BIBLE-READER-UX.md) : « « … » — Jean 3:16 (Louis Segond 1910) ». */
export function formatCopy(texts: readonly string[], reference: string, translationName: string): string {
  return `« ${texts.join(" ")} » — ${reference} (${translationName})`;
}

/** Paramètre d'URL d'une plage ciblée : « 4-7 » ou « 16 ». */
export function formatFocus(verseStart: number, verseEnd?: number): string {
  return verseEnd !== undefined && verseEnd !== verseStart ? `${verseStart}-${verseEnd}` : `${verseStart}`;
}

export function parseFocus(value: string | undefined): VerseRange | null {
  const match = /^(\d{1,3})(?:-(\d{1,3}))?$/.exec(value ?? "");
  if (!match) return null;
  const verseStart = Number(match[1]);
  const verseEnd = match[2] === undefined ? verseStart : Number(match[2]);
  return verseStart >= 1 && verseEnd >= verseStart ? { verseStart, verseEnd } : null;
}

export function chapterPath(bookSlug: string, chapter: number): `/bible/lsg/${string}` {
  return `/bible/lsg/${bookSlug}/${chapter}`;
}

/** Lien direct vers un passage, partageable tel quel. */
export function passagePath(bookSlug: string, chapter: number, verseStart?: number, verseEnd?: number): `/bible/lsg/${string}` {
  const base = chapterPath(bookSlug, chapter);
  return verseStart === undefined ? base : `${base}?v=${formatFocus(verseStart, verseEnd)}#v${verseStart}`;
}
