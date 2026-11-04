import { db, type TransactionClient } from "../db";
import type { Actor } from "../policies";

/** Actions auditées (docs/admin/ADMIN-AUDIT-LOG.md). */
export const AUDIT_ACTIONS = [
  "user.suspend",
  "user.reactivate",
  "user.ban",
  "user.force_password_reset",
  "user.pii.reveal",
  "user.export.admin",
  "user.delete.admin",
  "role.grant",
  "role.revoke",
  "badge.grant",
  "badge.revoke",
  "setting.updated",
  "feature_flag.updated",
  "auth.mfa.enabled",
  "auth.mfa.disabled",
  "auth.session.revoked",
  "security.admin_access_denied",
  "security.cross_community_attempt",
  "seed.super_admin.created",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Métadonnées autorisées : valeurs simples et codes, jamais de contenu sensible. */
export type AuditMetadata = Record<string, string | number | boolean | null | readonly string[]>;

export interface AuditEntry {
  actor: Pick<Actor, "userId" | "globalRoles"> | null;
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  metadata?: AuditMetadata;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/**
 * Écrit une entrée d'audit. Passer le client de transaction pour écrire
 * dans la même transaction que l'action auditée.
 */
export async function recordAudit(entry: AuditEntry, tx: TransactionClient = db): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: entry.actor?.userId ?? null,
      actorRoles: entry.actor ? [...entry.actor.globalRoles] : [],
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
      ip: entry.ip ?? null,
      userAgent: entry.userAgent?.slice(0, 300) ?? null,
      requestId: entry.requestId ?? null,
    },
  });
}
