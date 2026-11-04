const CODES = [
  "UNAUTHENTICATED",
  "EMAIL_NOT_VERIFIED",
  "MFA_REQUIRED",
  "REAUTH_REQUIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL",
] as const;

export type ErrorMessageKey = (typeof CODES)[number];

/** Clé de traduction (namespace errors.codes) d'un code d'erreur serveur : l'UI ne montre jamais le message brut. */
export function errorKey(code: string): ErrorMessageKey {
  return (CODES as readonly string[]).includes(code) ? (code as ErrorMessageKey) : "INTERNAL";
}
