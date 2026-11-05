import { z } from "zod";
import { EMAIL_TEMPLATES } from "../email/templates";

export const QUEUES = {
  emailSend: "email.send",
  dailyVerseEnsure: "bible.daily-verse.ensure",
} as const;

export const emailJobSchema = z.object({
  to: z.email(),
  template: z.enum(EMAIL_TEMPLATES),
  url: z.url(),
});

export type EmailJob = z.infer<typeof emailJobSchema>;
