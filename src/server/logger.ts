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
