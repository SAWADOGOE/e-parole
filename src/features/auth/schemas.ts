import { z } from "zod";

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;
export const MIN_AGE = 13;

const currentYear = () => new Date().getUTCFullYear();

/** Messages = clés de traduction (namespace auth). */
export const signUpSchema = z.object({
  name: z.string().trim().min(2, "required").max(60, "required"),
  email: z.email("invalidEmail").max(254, "invalidEmail"),
  password: z.string().min(PASSWORD_MIN, "passwordTooShort").max(PASSWORD_MAX, "passwordTooShort"),
  birthYear: z.coerce
    .number<string>("invalidBirthYear")
    .int("invalidBirthYear")
    .min(1900, "invalidBirthYear")
    .refine((year) => year <= currentYear(), "invalidBirthYear")
    .refine((year) => currentYear() - year >= MIN_AGE, "tooYoung"),
  consent: z.literal("on", "consentRequired"),
});

export const signInSchema = z.object({
  email: z.email("invalidEmail"),
  password: z.string().min(1, "required"),
});

export const emailSchema = z.object({ email: z.email("invalidEmail") });

export const resetSchema = z.object({
  password: z.string().min(PASSWORD_MIN, "passwordTooShort").max(PASSWORD_MAX, "passwordTooShort"),
});

export const totpSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "invalidCode") });
export const backupCodeSchema = z.object({ code: z.string().trim().min(6, "invalidCode").max(32, "invalidCode") });

export type FieldErrorKeys = Partial<Record<string, string>>;

/** Première erreur par champ, sous forme de clé de traduction. */
export function firstErrors(error: z.ZodError): FieldErrorKeys {
  const out: FieldErrorKeys = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    out[key] ??= issue.message;
  }
  return out;
}
