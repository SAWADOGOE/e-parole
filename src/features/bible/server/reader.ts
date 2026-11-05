import "server-only";
import { unstable_cache } from "next/cache";
import { bibleTag, DAILY_VERSE_TAG, DEFAULT_TRANSLATION } from "../constants";
import type { CatalogBook, ChapterVerse, Passage, TranslationInfo, VerseCoordinates } from "../types";
import { isoDay, resolveDailyVerse, utcDay } from "./daily-verse";
import { buildPassage } from "./passages";
import { findCatalog, findChapterVerses, findPublishedTranslation, findVersesForRanges } from "./repository";

/**
 * Lecture publique mise en cache (ADR-010). La CSP à nonce rend les pages dynamiques : c'est le cache de données
 * qui garde le texte rapide. L'identifiant de version fait partie des clés, donc un texte activé ne sert jamais
 * un ancien cache ; seule la fiche de traduction expire vite pour découvrir une activation faite en CLI.
 * Jamais de donnée dépendant de l'utilisateur ici.
 */
const TRANSLATION_TTL_SECONDS = 60;
const DAILY_VERSE_TTL_SECONDS = 3_600;

export function getTranslation(code: string = DEFAULT_TRANSLATION): Promise<TranslationInfo | null> {
  return unstable_cache(() => findPublishedTranslation(code), ["bible-translation", code], {
    tags: [bibleTag(code)],
    revalidate: TRANSLATION_TTL_SECONDS,
  })();
}

export function getCatalog(translation: TranslationInfo): Promise<CatalogBook[]> {
  return unstable_cache(() => findCatalog(translation.versionId), ["bible-catalog", String(translation.versionId)], {
    tags: [bibleTag(translation.code)],
  })();
}

export function getChapterVerses(translation: TranslationInfo, bookId: string, chapter: number): Promise<ChapterVerse[]> {
  return unstable_cache(
    () => findChapterVerses(translation.versionId, bookId, chapter),
    ["bible-chapter", String(translation.versionId), bookId, String(chapter)],
    { tags: [bibleTag(translation.code)] },
  )();
}

export async function getPassage(translation: TranslationInfo, ref: VerseCoordinates): Promise<Passage | null> {
  const [books, stored] = await Promise.all([
    getCatalog(translation),
    unstable_cache(
      () => findVersesForRanges(translation.versionId, [ref]),
      ["bible-passage", String(translation.versionId), ref.bookId, String(ref.chapter), String(ref.verseStart), String(ref.verseEnd)],
      { tags: [bibleTag(translation.code)] },
    )(),
  ]);
  return buildPassage(translation, books, ref, stored);
}

/** Plusieurs passages en une requête (listes de l'utilisateur) : données personnelles, donc hors cache partagé. */
export async function getPassages(translation: TranslationInfo, refs: readonly VerseCoordinates[]): Promise<(Passage | null)[]> {
  const [books, stored] = await Promise.all([getCatalog(translation), findVersesForRanges(translation.versionId, refs)]);
  return refs.map((ref) => buildPassage(translation, books, ref, stored));
}

export interface TodayVerse {
  passage: Passage;
  reflection: string | null;
}

export async function getTodayVerse(): Promise<TodayVerse | null> {
  const translation = await getTranslation();
  if (!translation) return null;
  const today = utcDay(new Date());
  const resolved = await unstable_cache(() => resolveDailyVerse(today), ["daily-verse", isoDay(today)], {
    tags: [DAILY_VERSE_TAG],
    revalidate: DAILY_VERSE_TTL_SECONDS,
  })();
  if (!resolved) return null;
  const passage = await getPassage(translation, resolved.ref);
  return passage ? { passage, reflection: resolved.reflection } : null;
}
