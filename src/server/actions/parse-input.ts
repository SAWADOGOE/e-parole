import type { z } from "zod";
import { AppError, type FieldErrors } from "../errors/app-error";

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", { fieldErrors: zodFieldErrors(parsed.error) });
  return parsed.data;
}
