import { z } from "zod";
import {
  HIGHLIGHT_COLORS,
  MAX_CHAPTER_NUMBER,
  MAX_SELECTION_RANGES,
  MAX_VERSE_NUMBER,
  NOTE_MAX_LENGTH,
  READER_FONTS,
  READER_FONT_SIZES,
  READER_LINE_HEIGHTS,
  READER_THEMES,
  REFLECTION_MAX_LENGTH,
  SEARCH_QUERY_MAX_LENGTH,
} from "./constants";

const bookId = z.string().regex(/^[1-3A-Z][A-Z0-9]{2}$/);
const chapter = z.number().int().min(1).max(MAX_CHAPTER_NUMBER);
const verse = z.number().int().min(1).max(MAX_VERSE_NUMBER);
const entityId = z.string().min(1).max(64).regex(/^[a-z0-9]+$/);

const rangeSchema = z
  .object({ verseStart: verse, verseEnd: verse })
  .refine(({ verseStart, verseEnd }) => verseEnd >= verseStart, { message: "invalidRange" });

const passageFields = { bookId, chapter };

export const highlightInputSchema = z.object({
  ...passageFields,
  ranges: z.array(rangeSchema).min(1).max(MAX_SELECTION_RANGES),
  /** null retire le surlignage. */
  color: z.enum(HIGHLIGHT_COLORS).nullable(),
});

export const bookmarkInputSchema = z.object({ ...passageFields, ranges: z.array(rangeSchema).min(1).max(MAX_SELECTION_RANGES) });

const noNul = (value: string): boolean => !value.includes("\u0000");

const noteBody = z.string().trim().min(1).max(NOTE_MAX_LENGTH).refine(noNul);

export const createNoteSchema = z.object({ ...passageFields, range: rangeSchema, body: noteBody });
export const updateNoteSchema = z.object({ id: entityId, body: noteBody });
export const deleteAnnotationSchema = z.object({ id: entityId });

export const readingPositionSchema = z.object(passageFields);

export const readerPrefsSchema = z.object({
  fontSize: z.number().refine((value) => (READER_FONT_SIZES as readonly number[]).includes(value)),
  lineHeight: z.number().refine((value) => (READER_LINE_HEIGHTS as readonly number[]).includes(value)),
  theme: z.enum(READER_THEMES),
  font: z.enum(READER_FONTS),
  showVerseNumbers: z.boolean(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).refine(noNul).catch(""),
  testament: z.enum(["OT", "NT"]).optional().catch(undefined),
  livre: bookId.optional().catch(undefined),
  curseur: z.string().max(120).optional().catch(undefined),
});

export const annotationListQuerySchema = z.object({
  onglet: z.enum(["surlignages", "notes", "favoris"]).catch("surlignages"),
  curseur: entityId.optional().catch(undefined),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const dailyVerseReferenceSchema = z.object({ date: isoDate, reference: z.string().trim().min(1).max(80).refine(noNul) });

export const scheduleDailyVerseSchema = dailyVerseReferenceSchema.extend({
  reflection: z.string().trim().max(REFLECTION_MAX_LENGTH).refine(noNul).optional(),
  /** Le doublon sur 30 jours est un avertissement : l'éditeur peut confirmer en connaissance de cause. */
  acknowledgeDuplicate: z.boolean().default(false),
});

export const deleteDailyVerseSchema = z.object({ date: isoDate });

export const dailyVerseMonthSchema = z.object({ mois: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().catch(undefined) });

export const activateVersionSchema = z.object({ versionId: z.number().int().positive() });
export const setPublishedSchema = z.object({ translationId: z.number().int().positive(), published: z.boolean() });
