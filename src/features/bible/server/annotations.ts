import type { z } from "zod";
import { AppError } from "@/server/errors/app-error";
import { authorize, type Actor } from "@/server/policies";
import { DEFAULT_TRANSLATION } from "../constants";
import { applyHighlight } from "../lib/highlight-ranges";
import type {
  bookmarkInputSchema,
  createNoteSchema,
  deleteAnnotationSchema,
  highlightInputSchema,
  readerPrefsSchema,
  readingPositionSchema,
  updateNoteSchema,
} from "../schemas";
import type { TranslationInfo, VerseRange } from "../types";
import {
  createNote as insertNote,
  deleteBookmark,
  deleteHighlight,
  deleteNote as removeNote,
  findBookmarkOwner,
  findHighlightOwner,
  findNoteOwner,
  findPublishedTranslation,
  findVerseCount,
  replaceChapterHighlights,
  saveReaderPrefs,
  saveReadingPosition,
  toggleBookmarks,
  updateNote as writeNote,
} from "./repository";

/** Services d'annotation : aucune donnée de note ne quitte ces fonctions vers un journal ou l'audit. */

async function publishedTranslation(): Promise<TranslationInfo> {
  const translation = await findPublishedTranslation(DEFAULT_TRANSLATION);
  if (!translation) throw new AppError("NOT_FOUND");
  return translation;
}

/** Une référence inexistante ne doit pas entrer en base : les coordonnées sont validées contre la version active. */
async function assertRanges(translation: TranslationInfo, bookId: string, chapter: number, ranges: readonly VerseRange[]): Promise<void> {
  const verseCount = await findVerseCount(translation.versionId, bookId, chapter);
  if (verseCount === null) throw new AppError("NOT_FOUND");
  if (ranges.some((range) => range.verseEnd > verseCount)) throw new AppError("VALIDATION");
}

export async function setHighlight(actor: Actor, input: z.infer<typeof highlightInputSchema>): Promise<void> {
  authorize(actor, "bible_annotation:create");
  const translation = await publishedTranslation();
  await assertRanges(translation, input.bookId, input.chapter, input.ranges);
  const scope = { userId: actor.userId, translationId: translation.id, bookId: input.bookId, chapter: input.chapter };
  await replaceChapterHighlights(scope, (existing) => input.ranges.reduce((current, range) => applyHighlight(current, range, input.color), [...existing]));
}

export async function toggleBookmark(actor: Actor, input: z.infer<typeof bookmarkInputSchema>): Promise<{ added: boolean }> {
  authorize(actor, "bible_annotation:create");
  const translation = await publishedTranslation();
  await assertRanges(translation, input.bookId, input.chapter, input.ranges);
  const scope = { userId: actor.userId, translationId: translation.id, bookId: input.bookId, chapter: input.chapter };
  return toggleBookmarks(scope, input.ranges);
}

export async function addNote(actor: Actor, input: z.infer<typeof createNoteSchema>): Promise<{ id: string }> {
  authorize(actor, "bible_annotation:create");
  const translation = await publishedTranslation();
  await assertRanges(translation, input.bookId, input.chapter, [input.range]);
  const scope = { userId: actor.userId, translationId: translation.id, bookId: input.bookId, chapter: input.chapter };
  return insertNote(scope, input.range, input.body);
}

/** Invisible = 404 : la ressource d'autrui se comporte exactement comme une ressource absente. */
function requireOwned(actor: Actor, owner: string | null): string {
  if (owner === null || owner !== actor.userId) throw new AppError("NOT_FOUND");
  return owner;
}

export async function editNote(actor: Actor, input: z.infer<typeof updateNoteSchema>): Promise<void> {
  const ownerId = requireOwned(actor, await findNoteOwner(input.id));
  authorize(actor, "bible_annotation:update", { ownerId });
  if ((await writeNote(input.id, actor.userId, input.body)) === 0) throw new AppError("NOT_FOUND");
}

export async function deleteNote(actor: Actor, input: z.infer<typeof deleteAnnotationSchema>): Promise<void> {
  const ownerId = requireOwned(actor, await findNoteOwner(input.id));
  authorize(actor, "bible_annotation:delete", { ownerId });
  if ((await removeNote(input.id, actor.userId)) === 0) throw new AppError("NOT_FOUND");
}

export async function removeHighlight(actor: Actor, input: z.infer<typeof deleteAnnotationSchema>): Promise<void> {
  const ownerId = requireOwned(actor, await findHighlightOwner(input.id));
  authorize(actor, "bible_annotation:delete", { ownerId });
  if ((await deleteHighlight(input.id, actor.userId)) === 0) throw new AppError("NOT_FOUND");
}

export async function removeBookmark(actor: Actor, input: z.infer<typeof deleteAnnotationSchema>): Promise<void> {
  const ownerId = requireOwned(actor, await findBookmarkOwner(input.id));
  authorize(actor, "bible_annotation:delete", { ownerId });
  if ((await deleteBookmark(input.id, actor.userId)) === 0) throw new AppError("NOT_FOUND");
}

export async function recordReadingPosition(actor: Actor, input: z.infer<typeof readingPositionSchema>): Promise<void> {
  authorize(actor, "bible_reading_state:update", { ownerId: actor.userId });
  const translation = await publishedTranslation();
  if ((await findVerseCount(translation.versionId, input.bookId, input.chapter)) === null) throw new AppError("NOT_FOUND");
  await saveReadingPosition(actor.userId, translation.id, input.bookId, input.chapter);
}

export async function updateReaderPrefs(actor: Actor, input: z.infer<typeof readerPrefsSchema>): Promise<void> {
  authorize(actor, "bible_reading_state:update", { ownerId: actor.userId });
  await saveReaderPrefs(actor.userId, input);
}
