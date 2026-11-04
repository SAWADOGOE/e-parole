import { config } from "dotenv";

config({ quiet: true });

export const E2E_BASE_URL = "http://localhost:53100";

/** Identifiants du SUPER_ADMIN de test : base jetable eparole_test, aucune donnée réelle. */
export const E2E_ADMIN = {
  email: "admin.e2e@exemple.test",
  password: "e2e-mot-de-passe-administrateur",
  name: "Admin E2E",
} as const;

function testDbUrl(base: string | undefined): string {
  if (!base) throw new Error("URL de base manquante dans .env");
  const url = new URL(base);
  url.pathname = "/eparole_test";
  return url.toString();
}

/** Environnement commun du serveur web, du worker et du seed E2E. */
export type E2EEnv = Record<string, string> & { NODE_ENV: "production" | "test" | "development" };

export function e2eEnv(): E2EEnv {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined) env[key] = value;
  return {
    ...env,
    NODE_ENV: "production",
    APP_ENV: "test",
    APP_URL: E2E_BASE_URL,
    BETTER_AUTH_URL: E2E_BASE_URL,
    DATABASE_URL: testDbUrl(process.env["DATABASE_URL"]),
    MIGRATION_DATABASE_URL: testDbUrl(process.env["MIGRATION_DATABASE_URL"]),
    SEED_SUPER_ADMIN_EMAIL: E2E_ADMIN.email,
    SEED_SUPER_ADMIN_PASSWORD: E2E_ADMIN.password,
    SEED_SUPER_ADMIN_NAME: E2E_ADMIN.name,
    LOG_LEVEL: "warn",
    CHECKPOINT_DISABLE: "1",
  };
}

export const MAILPIT_URL = process.env["MAILPIT_API_URL"] ?? "http://127.0.0.1:58025";
