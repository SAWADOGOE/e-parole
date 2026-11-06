import { z } from "zod";
import { EMAIL_TEMPLATES } from "../email/templates";

export const QUEUES = {
  emailSend: "email.send",
  dailyVerseEnsure: "bible.daily-verse.ensure",
  mediaProcess: "media.process",
  mediaCleanup: "media.cleanup",
  maintenancePurge: "maintenance.purge",
  sanctionsExpire: "moderation.sanctions.expire",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export const emailJobSchema = z.object({
  to: z.email(),
  template: z.enum(EMAIL_TEMPLATES),
  url: z.url(),
});

export type EmailJob = z.infer<typeof emailJobSchema>;

/** Le job ne porte que l'identifiant : aucune donnée personnelle dans pg-boss. */
export const mediaJobSchema = z.object({ assetId: z.string().min(1).max(64).regex(/^[a-z0-9]+$/) });

export type MediaJob = z.infer<typeof mediaJobSchema>;
