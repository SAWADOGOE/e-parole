"use server";

import { action } from "@/server/actions/action";
import type { Result } from "@/server/errors/result";
import { markReadSchema, preferencesSchema } from "../schemas";
import { markReadFor, updatePreferences } from "./service";

export async function markNotificationsReadAction(input: unknown): Promise<Result<{ unread: number }>> {
  return action({ schema: markReadSchema, rateLimit: "notification.read", handler: markReadFor })(input);
}

export async function savePreferencesAction(input: unknown): Promise<Result<void>> {
  return action({ schema: preferencesSchema, rateLimit: "profile.update", handler: updatePreferences })(input);
}
