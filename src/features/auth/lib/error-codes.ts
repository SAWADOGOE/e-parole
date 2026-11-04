/** Traduit un code d'erreur Better Auth en clé de message (namespace auth), sans révéler l'existence d'un compte. */
export function authErrorKey(error: { code?: string | undefined; message?: string | undefined; status?: number } | null | undefined): string {
  if (!error) return "genericError";
  const code = error.code ?? "";
  const message = error.message ?? "";
  if (error.status === 429) return "rateLimited";
  if (message.includes("ACCOUNT_NOT_ACTIVE")) return "accountNotActive";
  if (message.includes("AGE_REQUIREMENT_NOT_MET")) return "tooYoung";
  if (code === "INVALID_EMAIL_OR_PASSWORD") return "invalidCredentials";
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return "emailTaken";
  if (code === "PASSWORD_TOO_SHORT") return "passwordTooShort";
  if (code === "INVALID_EMAIL") return "invalidEmail";
  if (code === "INVALID_CODE" || code === "INVALID_TWO_FACTOR_CODE" || code === "INVALID_BACKUP_CODE") return "invalidCode";
  if (code === "INVALID_TOKEN") return "resetInvalid";
  return "genericError";
}
