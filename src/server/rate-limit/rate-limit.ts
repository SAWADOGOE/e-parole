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

export async function enforceRateLimit(name: RateLimitName, subject: string): Promise<void> {
  const { allowed, retryAfterSeconds } = await consumeRateLimit(name, subject);
  if (!allowed) throw new AppError("RATE_LIMITED", { retryAfterSeconds });
}
