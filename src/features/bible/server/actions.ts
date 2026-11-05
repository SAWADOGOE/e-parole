"use server";

import { action } from "@/server/actions/action";
import type { Result } from "@/server/errors/result";
import {
  bookmarkInputSchema,
  createNoteSchema,
  deleteAnnotationSchema,
  highlightInputSchema,
  readerPrefsSchema,
  readingPositionSchema,
  updateNoteSchema,
} from "../schemas";
import {
  addNote,
  deleteNote,
  editNote,
  recordReadingPosition,
  removeBookmark,
  removeHighlight,
  setHighlight,
  toggleBookmark,
  updateReaderPrefs,
} from "./annotations";

const ANNOTATION = "bible.annotation" as const;
const READING = "bible.reading" as const;

export async function setHighlightAction(input: unknown): Promise<Result<void>> {
  return action({ schema: highlightInputSchema, rateLimit: ANNOTATION, handler: setHighlight })(input);
}

export async function toggleBookmarkAction(input: unknown): Promise<Result<{ added: boolean }>> {
  return action({ schema: bookmarkInputSchema, rateLimit: ANNOTATION, handler: toggleBookmark })(input);
}

export async function addNoteAction(input: unknown): Promise<Result<{ id: string }>> {
  return action({ schema: createNoteSchema, rateLimit: ANNOTATION, handler: addNote })(input);
}

export async function editNoteAction(input: unknown): Promise<Result<void>> {
  return action({ schema: updateNoteSchema, rateLimit: ANNOTATION, handler: editNote })(input);
}

export async function deleteNoteAction(input: unknown): Promise<Result<void>> {
  return action({ schema: deleteAnnotationSchema, rateLimit: ANNOTATION, handler: deleteNote })(input);
}

export async function removeHighlightAction(input: unknown): Promise<Result<void>> {
  return action({ schema: deleteAnnotationSchema, rateLimit: ANNOTATION, handler: removeHighlight })(input);
}

export async function removeBookmarkAction(input: unknown): Promise<Result<void>> {
  return action({ schema: deleteAnnotationSchema, rateLimit: ANNOTATION, handler: removeBookmark })(input);
}

export async function recordReadingAction(input: unknown): Promise<Result<void>> {
  return action({ schema: readingPositionSchema, rateLimit: READING, handler: recordReadingPosition })(input);
}

export async function saveReaderPrefsAction(input: unknown): Promise<Result<void>> {
  return action({ schema: readerPrefsSchema, rateLimit: READING, handler: updateReaderPrefs })(input);
}
