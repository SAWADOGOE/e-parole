import { createHash } from "node:crypto";
import type { RateLimitName } from "../rate-limit/rate-limit";

const PATH_LIMITS: Record<string, RateLimitName> = {
  "/sign-in/email": "auth.signin.account",
  "/request-password-reset": "auth.reset.account",
  "/send-verification-email": "auth.verification.account",
};

/** Sujet de limitation par compte : email normalisé et haché (aucun email en clair stocké). */
export function accountLimitFor(path: string, body: unknown): { name: RateLimitName; subject: string } | null {
  const name = PATH_LIMITS[path];
  if (!name) return null;
  const email = (body as { email?: unknown } | null)?.email;
  if (typeof email !== "string" || email.length === 0) return null;
  const subject = createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
  return { name, subject };
}
