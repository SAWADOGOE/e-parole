"use server";

import { revalidatePath, updateTag } from "next/cache";
import { reauthenticateAction } from "@/features/administration";
import { parseInput, toResult } from "@/server/actions/action";
import { adminAction } from "@/server/actions/admin-action";
import { requireAdminActor } from "@/server/auth/session";
import type { Result } from "@/server/errors/result";
import { authorize } from "@/server/policies";
import { bibleTag, DAILY_VERSE_TAG } from "../constants";
import { dailyVerseReferenceSchema } from "../schemas";
import type { Passage } from "../types";
import { isoDay } from "./daily-verse";
import {
  activateVersionOptions,
  dailyVerseDuplicates,
  deleteDailyVerseOptions,
  parseDay,
  resolveVerseReference,
  scheduleDailyVerseOptions,
  setPublishedOptions,
} from "./admin-options";
import { buildPassage } from "./passages";
import { findVersesForRanges } from "./repository";

const DAILY_VERSES_PATH = "/admin/bible/daily-verses";
const TRANSLATIONS_PATH = "/admin/bible/translations";

function refreshDailyVerse(): void {
  updateTag(DAILY_VERSE_TAG);
  revalidatePath(DAILY_VERSES_PATH);
}

export interface DailyVersePreview {
  passage: Passage;
  duplicates: string[];
}

/** Aperçu exact avant programmation : même texte et même attribution que l'affichage public. */
export async function previewDailyVerseAction(input: unknown): Promise<Result<DailyVersePreview | null>> {
  return toResult(async () => {
    const session = await requireAdminActor();
    authorize(session.actor, "daily_verse:manage");
    const { date, reference } = parseInput(dailyVerseReferenceSchema, input);
    const { translation, books, coordinates } = await resolveVerseReference(reference);
    const stored = await findVersesForRanges(translation.versionId, [coordinates]);
    const passage = buildPassage(translation, books, coordinates, stored);
    if (!passage) return null;
    return { passage, duplicates: (await dailyVerseDuplicates(coordinates, parseDay(date))).map(isoDay) };
  });
}

export async function scheduleDailyVerseAction(input: unknown): Promise<Result<{ date: string }>> {
  const result = await adminAction(scheduleDailyVerseOptions())(input);
  if (result.ok) refreshDailyVerse();
  return result;
}

export async function deleteDailyVerseAction(input: unknown): Promise<Result<{ date: string }>> {
  const result = await adminAction(deleteDailyVerseOptions())(input);
  if (result.ok) refreshDailyVerse();
  return result;
}

export async function activateVersionAction(input: unknown): Promise<Result<{ code: string }>> {
  const result = await adminAction(activateVersionOptions())(input);
  if (result.ok) {
    updateTag(bibleTag(result.data.code));
    revalidatePath(TRANSLATIONS_PATH);
  }
  return result;
}

export async function setPublishedAction(input: unknown): Promise<Result<{ code: string }>> {
  const result = await adminAction(setPublishedOptions())(input);
  if (result.ok) {
    updateTag(bibleTag(result.data.code));
    revalidatePath(TRANSLATIONS_PATH);
  }
  return result;
}

export async function reauthenticateForBibleAction(input: unknown): Promise<Result<{ until: string }>> {
  return reauthenticateAction(input);
}
