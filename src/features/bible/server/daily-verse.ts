import { createHash } from "node:crypto";
import { DAILY_VERSE_DUPLICATE_WINDOW_DAYS, DEFAULT_TRANSLATION } from "../constants";
import type { VerseCoordinates } from "../types";
import { findDailyVerse, findPublishedTranslation, insertAutomaticDailyVerse, listPool, listRecentDailyVerses, type DailyVerseRow } from "./repository";

/** Le fuseau de référence (Africa/Ouagadougou) est UTC : un jour éditorial est une date UTC. */
export function utcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

const sameRef = (a: VerseCoordinates, b: VerseCoordinates): boolean =>
  a.bookId === b.bookId && a.chapter === b.chapter && a.verseStart === b.verseStart;

/**
 * Sélection déterministe : la même date donne le même verset sur toutes les instances, sans écriture.
 * Les références utilisées sur la fenêtre de 30 jours sont écartées tant que la liste le permet.
 */
export function pickFromPool(date: Date, pool: readonly VerseCoordinates[], recent: readonly VerseCoordinates[]): VerseCoordinates | null {
  const fresh = pool.filter((entry) => !recent.some((used) => sameRef(entry, used)));
  const candidates = fresh.length > 0 ? fresh : pool;
  if (candidates.length === 0) return null;
  const hash = createHash("sha256").update(isoDay(date)).digest().readUInt32BE(0);
  return candidates[hash % candidates.length] ?? null;
}

async function automaticChoice(date: Date): Promise<VerseCoordinates | null> {
  const [pool, recent] = await Promise.all([listPool(), listRecentDailyVerses(DAILY_VERSE_DUPLICATE_WINDOW_DAYS, date)]);
  return pickFromPool(date, pool, recent);
}

export interface ResolvedDailyVerse {
  ref: VerseCoordinates;
  reflection: string | null;
  isAutomatic: boolean;
}

/** Verset d'un jour : celui programmé, sinon la sélection automatique. N'écrit jamais (chemin de rendu). */
export async function resolveDailyVerse(date: Date): Promise<ResolvedDailyVerse | null> {
  const row: DailyVerseRow | null = await findDailyVerse(date);
  if (row) {
    const { bookId, chapter, verseStart, verseEnd, reflection, isAutomatic } = row;
    return { ref: { bookId, chapter, verseStart, verseEnd }, reflection, isAutomatic };
  }
  const ref = await automaticChoice(date);
  return ref ? { ref, reflection: null, isAutomatic: true } : null;
}

/** Job du worker : consigne la sélection automatique dans l'historique si aucun éditeur n'a programmé ce jour. */
export async function ensureAutomaticDailyVerse(now: Date): Promise<boolean> {
  const date = utcDay(now);
  if (await findDailyVerse(date)) return false;
  const translation = await findPublishedTranslation(DEFAULT_TRANSLATION);
  const ref = await automaticChoice(date);
  if (!translation || !ref) return false;
  return insertAutomaticDailyVerse(date, translation.id, ref);
}
