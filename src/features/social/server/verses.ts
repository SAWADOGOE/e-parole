import "server-only";
import { getCatalog, getPassages, getTranslation, parseReference, passagePath, type CatalogBook, type Passage, type TranslationInfo } from "@/features/bible";
import { AppError } from "@/server/errors/app-error";
import type { QuotedVerse } from "../types";

/** Clé d'un passage cité, pour rattacher le texte rendu à chaque publication. */
export function verseKey(verse: QuotedVerse): string {
  return `${verse.bookId}.${verse.chapter}.${verse.verseStart}-${verse.verseEnd}`;
}

/** Texte des versets cités d'une page entière en une requête (catalogue en cache) : jamais recopié dans la publication. */
export async function quotedPassages(verses: readonly (QuotedVerse | null)[]): Promise<Map<string, Passage>> {
  const refs = verses.filter((verse): verse is QuotedVerse => verse !== null);
  const passages = new Map<string, Passage>();
  if (refs.length === 0) return passages;
  const translation = await getTranslation();
  if (!translation) return passages;
  const unique = [...new Map(refs.map((ref) => [verseKey(ref), ref])).values()];
  const found = await getPassages(translation, unique);
  unique.forEach((ref, index) => {
    const passage = found[index];
    if (passage) passages.set(verseKey(ref), passage);
  });
  return passages;
}

/** Verset cité valide dans la traduction active (sinon VALIDATION) ; renvoie l'identifiant de traduction à stocker. */
export async function validateQuotedVerse(verse: QuotedVerse): Promise<QuotedVerse & { translationId: number }> {
  const translation = await getTranslation();
  if (!translation) throw new AppError("NOT_FOUND");
  const book = (await getCatalog(translation)).find((candidate) => candidate.id === verse.bookId);
  const count = book?.verseCounts[verse.chapter];
  if (count === undefined || verse.verseEnd > count) throw new AppError("VALIDATION", { fieldErrors: { verse: ["invalidVerse"] } });
  return { ...verse, translationId: translation.id };
}

/** Saisie libre (« Jean 3:16-18 ») → coordonnées d'un passage, pour l'aperçu du composer. */
export async function resolveReference(reference: string): Promise<{ verse: QuotedVerse; passage: Passage } | null> {
  const translation = await getTranslation();
  if (!translation) return null;
  const books = await getCatalog(translation);
  const parsed = parseReference(reference, books);
  if (!parsed.ok || parsed.reference.wholeBook) return null;
  const { bookId, chapter } = parsed.reference;
  const count = books.find((book) => book.id === bookId)?.verseCounts[chapter] ?? 0;
  const verseStart = parsed.reference.verseStart ?? 1;
  // Un chapitre entier est cité jusqu'à 30 versets (contrainte post_verse_ref_chk).
  const verseEnd = Math.min(parsed.reference.verseEnd ?? parsed.reference.verseStart ?? count, verseStart + 29, count);
  if (count === 0 || verseEnd < verseStart) return null;
  const verse: QuotedVerse = { bookId, chapter, verseStart, verseEnd };
  const [passage] = await getPassages(translation, [verse]);
  return passage ? { verse, passage } : null;
}

/** Résolveur des références écrites dans un texte (« Jean 3:16 ») vers un lien du lecteur. */
export async function verseLinkResolver(): Promise<(candidate: string) => string | null> {
  const translation: TranslationInfo | null = await getTranslation();
  const books: CatalogBook[] = translation ? await getCatalog(translation) : [];
  const bySlug = new Map(books.map((book) => [book.id, book.slug]));
  return (candidate) => {
    const parsed = parseReference(candidate, books);
    if (!parsed.ok || parsed.reference.wholeBook) return null;
    const slug = bySlug.get(parsed.reference.bookId);
    if (!slug) return null;
    return passagePath(slug, parsed.reference.chapter, parsed.reference.verseStart, parsed.reference.verseEnd);
  };
}

/** Verset partagé depuis le lecteur (« JHN.3.16-18 ») → aperçu du composer. Valeur invalide : aucun verset. */
export async function resolveSharedVerse(value: string): Promise<(QuotedVerse & { reference: string; text: string; attribution: string }) | null> {
  const match = /^([1-3A-Z][A-Z0-9]{2})\.(\d{1,3})\.(\d{1,3})(?:-(\d{1,3}))?$/.exec(value);
  if (!match?.[1] || !match[2] || !match[3]) return null;
  const verseStart = Number(match[3]);
  const verse: QuotedVerse = { bookId: match[1], chapter: Number(match[2]), verseStart, verseEnd: Math.min(Number(match[4] ?? match[3]), verseStart + 29) };
  if (verse.verseEnd < verse.verseStart) return null;
  const translation = await getTranslation();
  if (!translation) return null;
  const [passage] = await getPassages(translation, [verse]);
  if (!passage) return null;
  return { ...verse, reference: passage.reference, text: passage.verses.map((v) => v.text).join(" "), attribution: passage.attribution };
}
