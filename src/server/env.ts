import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  APP_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: z.stringbool().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().min(1),
  S3_ENDPOINT: z.url(),
  /** Adresse du stockage vue par le navigateur (URL présignées) ; par défaut S3_ENDPOINT. */
  S3_PUBLIC_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_BUCKET_PRIVATE: z.string().min(3),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | undefined;

/** Variables d'environnement serveur validées, lues à la première utilisation (jamais exposées au client). */
export function getEnv(): ServerEnv {
  cached ??= envSchema.parse(process.env);
  return cached;
}
