import type { z } from "zod";
import { recordAudit, type AuditAction, type AuditMetadata } from "../audit/audit";
import { REAUTH_WINDOW_MS } from "../auth/constants";
import { db, type TransactionClient } from "../db";
import { AppError } from "../errors/app-error";
import { authorize, REAUTH_PERMISSIONS, type Actor, type GlobalPermission, type PolicyResource } from "../policies";
import { enforceRateLimit, type RateLimitName } from "../rate-limit/rate-limit";
import { parseInput } from "./parse-input";

export interface AdminSessionInfo {
  sessionId: string;
  reauthenticatedAt: Date | null;
  actor: Actor;
}

export interface RequestInfo {
  requestId: string | null;
  ip: string | null;
  userAgent: string | null;
}

export interface AdminActionContext<I> {
  actor: Actor;
  session: AdminSessionInfo;
  input: I;
  tx: TransactionClient;
}

export interface AdminAudit {
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  metadata?: AuditMetadata;
}

export interface AdminActionOptions<S extends z.ZodType, T> {
  permission: GlobalPermission;
  schema: S;
  rateLimit?: RateLimitName;
  /** Charge les informations de la ressource (cible, rôles, durée…) nécessaires à authorize(). */
  resolveResource?: (input: z.infer<S>, actor: Actor) => Promise<PolicyResource>;
  handler: (ctx: AdminActionContext<z.infer<S>>) => Promise<{ data: T; audit: AdminAudit }>;
}

/**
 * Cœur d'une action d'administration, indépendant de Next.js (testable contre PostgreSQL) :
 * rate limit → Zod → ressource → authorize (hiérarchie incluse) → ré-auth si requise
 * → handler et audit dans la même transaction.
 * La session admin (rôle global + MFA + âge de session) est vérifiée par l'appelant.
 */
export async function runAdminAction<S extends z.ZodType, T>(
  options: AdminActionOptions<S, T>,
  session: AdminSessionInfo,
  rawInput: unknown,
  request: RequestInfo,
  now: number = Date.now(),
): Promise<T> {
  const actor = session.actor;
  await enforceRateLimit(options.rateLimit ?? "admin.action", actor.userId);
  const input = parseInput(options.schema, rawInput);
  const resource = options.resolveResource ? await options.resolveResource(input, actor) : {};
  authorize(actor, options.permission, resource);
  if (REAUTH_PERMISSIONS.has(options.permission)) {
    const fresh = session.reauthenticatedAt !== null && now - session.reauthenticatedAt.getTime() <= REAUTH_WINDOW_MS;
    if (!fresh) throw new AppError("REAUTH_REQUIRED");
  }
  return db.$transaction(async (tx) => {
    const { data, audit } = await options.handler({ actor, session, input, tx });
    await recordAudit(
      {
        actor,
        action: audit.action,
        targetType: audit.targetType,
        targetId: audit.targetId,
        metadata: { ...audit.metadata, permission: options.permission },
        ip: request.ip,
        userAgent: request.userAgent,
        requestId: request.requestId,
      },
      tx,
    );
    return data;
  });
}
