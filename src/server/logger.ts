import pino from "pino";

/**
 * Logger structuré. Règle : identifiants techniques uniquement.
 * Jamais de contenu de prière, de message, de note, de mot de passe, de token ni d'email en clair.
 */
export const logger = pino({
  level: process.env["LOG_LEVEL"] ?? "info",
  base: { service: process.env["EPAROLE_PROCESS"] ?? "web" },
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "email",
      "*.email",
      "secret",
      "*.secret",
      "body",
      "*.body",
      "headers.cookie",
      "headers.authorization",
    ],
    censor: "[masqué]",
  },
});

/**
 * Erreur réduite à ce qui est sûr à journaliser. Une erreur de base de données peut citer la ligne refusée
 * (« Failing row contains… », donc le texte d'une publication) : on ne garde que son nom et ses codes.
 */
export function safeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { type: typeof error };
  const withCode = error as Error & { code?: unknown; meta?: { code?: unknown } };
  const fromDatabase = /^Prisma|DriverAdapter/.test(error.name) || typeof withCode.meta?.code === "string";
  return {
    name: error.name,
    ...(typeof withCode.code === "string" ? { code: withCode.code } : {}),
    ...(typeof withCode.meta?.code === "string" ? { dbCode: withCode.meta.code } : {}),
    ...(fromDatabase ? {} : { message: error.message, stack: error.stack }),
  };
}
