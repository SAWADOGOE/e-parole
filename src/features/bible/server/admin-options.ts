import type { AdminActionOptions } from "@/server/actions/admin-action-core";
import { AppError } from "@/server/errors/app-error";
import { DAILY_VERSE_DUPLICATE_WINDOW_DAYS, DAILY_VERSE_MAX_DAYS_AHEAD, DEFAULT_TRANSLATION } from "../constants";
import { isoDay, utcDay } from "./daily-verse";
import { parseReference } from "../lib/parse-reference";
import {
  activateVersionSchema,
  deleteDailyVerseSchema,
  scheduleDailyVerseSchema,
  setPublishedSchema,
} from "../schemas";
import type { CatalogBook, TranslationInfo, VerseCoordinates } from "../types";
import {
  activateVersion,
  findCatalog,
  findDailyVerseDuplicates,
  findPublishedTranslation,
  findTranslationCode,
  findVersionTranslation,
  removeDailyVerse,
  setTranslationPublished,
  upsertDailyVerse,
} from "./repository";

/** Définitions des actions d'administration Bible, testables sans Next.js via runAdminAction(). */

const DAY_MS = 86_400_000;

/** Refus métier des fonctions d'activation : toute autre erreur (droits, connexion) reste une erreur serveur. */
const STATE_REFUSAL = /non activable|incomplète|altérée|sans version active/;

function toConflict(error: unknown): AppError {
  if (error instanceof Error && STATE_REFUSAL.test(error.message)) return new AppError("CONFLICT", { cause: error });
  throw error;
}

export function parseDay(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || isoDay(date) !== value) throw new AppError("VALIDATION", { fieldErrors: { date: ["invalidDate"] } });
  return date;
}

export interface ResolvedReference {
  translation: TranslationInfo;
  books: CatalogBook[];
  coordinates: VerseCoordinates;
}

/** Une référence de verset du jour doit désigner au moins un verset précis du texte importé. */
export async function resolveVerseReference(reference: string): Promise<ResolvedReference> {
  const translation = await findPublishedTranslation(DEFAULT_TRANSLATION);
  if (!translation) throw new AppError("NOT_FOUND");
  const books = await findCatalog(translation.versionId);
  const parsed = parseReference(reference, books);
  if (!parsed.ok || parsed.reference.verseStart === undefined) {
    throw new AppError("VALIDATION", { fieldErrors: { reference: ["invalidReference"] } });
  }
  const { bookId, chapter, verseStart, verseEnd } = parsed.reference;
  return { translation, books, coordinates: { bookId, chapter, verseStart, verseEnd: verseEnd ?? verseStart } };
}

export function assertSchedulable(date: Date, now: Date = new Date()): void {
  const today = utcDay(now).getTime();
  const days = (date.getTime() - today) / DAY_MS;
  if (days < 0 || days > DAILY_VERSE_MAX_DAYS_AHEAD) throw new AppError("VALIDATION", { fieldErrors: { date: ["dateOutOfWindow"] } });
}

export function dailyVerseDuplicates(ref: VerseCoordinates, date: Date): Promise<Date[]> {
  return findDailyVerseDuplicates(ref, date, DAILY_VERSE_DUPLICATE_WINDOW_DAYS);
}

export function scheduleDailyVerseOptions(): AdminActionOptions<typeof scheduleDailyVerseSchema, { date: string }> {
  return {
    permission: "daily_verse:manage",
    schema: scheduleDailyVerseSchema,
    handler: async ({ actor, input, tx }) => {
      const date = parseDay(input.date);
      assertSchedulable(date);
      const { translation, coordinates } = await resolveVerseReference(input.reference);
      const duplicates = await dailyVerseDuplicates(coordinates, date);
      if (duplicates.length > 0 && !input.acknowledgeDuplicate) {
        throw new AppError("CONFLICT", { fieldErrors: { reference: duplicates.map(isoDay) } });
      }
      const { id, created } = await upsertDailyVerse(tx, {
        ...coordinates,
        date,
        translationId: translation.id,
        reflection: input.reflection || null,
        scheduledById: actor.userId,
      });
      return {
        data: { date: input.date },
        audit: {
          action: created ? "daily_verse.scheduled" : "daily_verse.updated",
          targetType: "daily_verse",
          targetId: id,
          metadata: {
            date: input.date,
            bookId: coordinates.bookId,
            chapter: coordinates.chapter,
            verseStart: coordinates.verseStart,
            verseEnd: coordinates.verseEnd,
            duplicateAcknowledged: duplicates.length > 0,
          },
        },
      };
    },
  };
}

export function deleteDailyVerseOptions(): AdminActionOptions<typeof deleteDailyVerseSchema, { date: string }> {
  return {
    permission: "daily_verse:manage",
    schema: deleteDailyVerseSchema,
    handler: async ({ input, tx }) => {
      const date = parseDay(input.date);
      // Un jour passé appartient à l'historique et à la fenêtre anti-doublon : il ne s'efface pas.
      if (date < utcDay(new Date())) throw new AppError("VALIDATION", { fieldErrors: { date: ["dateInPast"] } });
      const id = await removeDailyVerse(tx, date);
      if (!id) throw new AppError("NOT_FOUND");
      return {
        data: { date: input.date },
        audit: { action: "daily_verse.deleted", targetType: "daily_verse", targetId: id, metadata: { date: input.date } },
      };
    },
  };
}

export function activateVersionOptions(): AdminActionOptions<typeof activateVersionSchema, { code: string }> {
  return {
    permission: "bible:import",
    schema: activateVersionSchema,
    handler: async ({ input, tx }) => {
      const version = await findVersionTranslation(input.versionId);
      if (!version) throw new AppError("NOT_FOUND");
      try {
        await activateVersion(tx, input.versionId);
      } catch (error: unknown) {
        // La fonction refuse une version déjà active, incomplète ou altérée.
        throw toConflict(error);
      }
      return {
        data: { code: version.code },
        audit: {
          action: "bible.version.activated",
          targetType: "bible_translation_version",
          targetId: String(input.versionId),
          metadata: { translation: version.code, checksum: version.checksum },
        },
      };
    },
  };
}

export function setPublishedOptions(): AdminActionOptions<typeof setPublishedSchema, { code: string }> {
  return {
    permission: "bible:translation:publish",
    schema: setPublishedSchema,
    handler: async ({ input, tx }) => {
      const code = await findTranslationCode(input.translationId);
      if (!code) throw new AppError("NOT_FOUND");
      try {
        await setTranslationPublished(tx, input.translationId, input.published);
      } catch (error: unknown) {
        throw toConflict(error);
      }
      return {
        data: { code },
        audit: {
          action: input.published ? "bible.translation.published" : "bible.translation.unpublished",
          targetType: "bible_translation",
          targetId: String(input.translationId),
          metadata: { translation: code },
        },
      };
    },
  };
}

