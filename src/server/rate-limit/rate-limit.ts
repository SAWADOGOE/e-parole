import { db } from "../db";
import { AppError } from "../errors/app-error";

export interface RateLimitRule {
  /** Fenêtre en secondes. */
  window: number;
  max: number;
}

/** Limites nommées (docs/19-SECURITY.md). Les limites d'authentification sont gérées par Better Auth. */
export const RATE_LIMITS = {
  "admin.action": { window: 3600, max: 120 },
  "admin.sanction": { window: 3600, max: 30 },
  "account.reauth": { window: 900, max: 5 },
  "account.export": { window: 86_400, max: 3 },
  "auth.signin.failures.account_ip": { window: 900, max: 10 },
  "auth.signin.failures.account": { window: 3600, max: 50 },
  "auth.reset.account": { window: 3600, max: 3 },
  "audit.access_denied": { window: 3600, max: 20 },
  "auth.account_exists.account": { window: 86_400, max: 2 },
  "auth.verification.account": { window: 3600, max: 3 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

/**
 * Fenêtre fixe atomique dans PostgreSQL (même table que Better Auth, clés préfixées « app: »).
 * Un seul UPSERT : pas de course entre lecture et écriture.
 */
export async function consumeRateLimit(
  name: RateLimitName,
  subject: string,
  now: number = Date.now(),
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const rule = RATE_LIMITS[name];
  const key = `app:${name}:${subject}`;
  const windowStart = now - rule.window * 1000;
  const rows = await db.$queryRaw<{ count: number; lastRequest: bigint }[]>`
    INSERT INTO "rate_limit" ("id", "key", "count", "lastRequest")
    VALUES (gen_random_uuid()::text, ${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limit"."lastRequest" < ${windowStart} THEN 1 ELSE "rate_limit"."count" + 1 END,
      "lastRequest" = CASE WHEN "rate_limit"."lastRequest" < ${windowStart} THEN ${now} ELSE "rate_limit"."lastRequest" END
    RETURNING "count", "lastRequest"`;
  const row = rows[0];
  if (!row) return { allowed: true, retryAfterSeconds: 0 };
  const allowed = row.count <= rule.max;
  const resetAt = Number(row.lastRequest) + rule.window * 1000;
  return { allowed, retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((resetAt - now) / 1000)) };
}

/** Lecture seule : la fenêtre courante a-t-elle atteint son maximum ? (ne consomme rien) */
export async function isRateLimited(
  name: RateLimitName,
  subject: string,
  now: number = Date.now(),
): Promise<{ limited: boolean; retryAfterSeconds: number }> {
  const rule = RATE_LIMITS[name];
  const rows = await db.$queryRaw<{ count: number; lastRequest: bigint }[]>`
    SELECT "count", "lastRequest" FROM "rate_limit" WHERE "key" = ${`app:${name}:${subject}`}`;
  const row = rows[0];
  if (!row) return { limited: false, retryAfterSeconds: 0 };
  const resetAt = Number(row.lastRequest) + rule.window * 1000;
  const limited = resetAt > now && row.count >= rule.max;
  return { limited, retryAfterSeconds: limited ? Math.max(1, Math.ceil((resetAt - now) / 1000)) : 0 };
}

/**
 * Rend un créneau consommé (ex. connexion réussie) : le créneau est réservé atomiquement AVANT la vérification
 * du mot de passe, puis rendu en cas de succès — seuls les échecs restent comptés, sans course possible.
 */
export async function refundRateLimit(name: RateLimitName, subject: string): Promise<void> {
  await db.$executeRaw`
    UPDATE "rate_limit" SET "count" = GREATEST("count" - 1, 0) WHERE "key" = ${`app:${name}:${subject}`}`;
}

export async function enforceRateLimit(name: RateLimitName, subject: string): Promise<void> {
  const { allowed, retryAfterSeconds } = await consumeRateLimit(name, subject);
  if (!allowed) throw new AppError("RATE_LIMITED", { retryAfterSeconds });
}
