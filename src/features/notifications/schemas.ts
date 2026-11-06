import { z } from "zod";

export const preferencesSchema = z.strictObject({
  REACTION: z.boolean(),
  COMMENT: z.boolean(),
  REPLY: z.boolean(),
  MENTION: z.boolean(),
  FOLLOW: z.boolean(),
});

export const markReadSchema = z.strictObject({ before: z.iso.datetime() });

export const notificationListQuerySchema = z.object({ curseur: z.string().max(120).optional().catch(undefined) });
