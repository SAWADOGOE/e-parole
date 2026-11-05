import { recordAudit } from "../audit/audit";
import { db } from "../db";
import type { Actor } from "../policies";

/** Atteste qu'un second facteur a été vérifié pour cette session. */
export async function markSessionMfaVerified(sessionId: string): Promise<void> {
  await db.session.updateMany({ where: { id: sessionId }, data: { mfaVerifiedAt: new Date() } });
}

export async function markSessionReauthenticated(sessionId: string, at: Date): Promise<void> {
  await db.session.update({ where: { id: sessionId }, data: { reauthenticatedAt: at } });
}

export async function revokeOtherSessions(userId: string, keepSessionId: string): Promise<number> {
  const { count } = await db.session.deleteMany({ where: { userId, id: { not: keepSessionId } } });
  return count;
}

export async function findSessionMarkers(
  sessionId: string,
): Promise<{ createdAt: Date; reauthenticatedAt: Date | null; mfaVerifiedAt: Date | null } | null> {
  return db.session.findUnique({
    where: { id: sessionId },
    select: { createdAt: true, reauthenticatedAt: true, mfaVerifiedAt: true },
  });
}

/** Sessions actives de l'utilisateur, sans jamais exposer les jetons. */
export async function listActiveSessions(userId: string): Promise<{ id: string; createdAt: string; userAgent: string | null }[]> {
  const sessions = await db.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, userAgent: true },
    take: 50,
  });
  return sessions.map((s) => ({ id: s.id, createdAt: s.createdAt.toISOString(), userAgent: s.userAgent }));
}

/** Révoque des sessions de l'acteur (jamais celles d'un autre : filtre userId) et l'audite dans la même transaction. */
export async function revokeSessionsAudited(
  actor: Actor,
  where: { id: string } | { notId: string },
): Promise<number> {
  return db.$transaction(async (tx) => {
    const filter = "id" in where ? { id: where.id } : { id: { not: where.notId } };
    const { count } = await tx.session.deleteMany({ where: { userId: actor.userId, ...filter } });
    if (count > 0) {
      await recordAudit(
        {
          actor,
          action: "auth.session.revoked",
          targetType: "id" in where ? "session" : "user",
          targetId: "id" in where ? where.id : actor.userId,
          metadata: { count },
        },
        tx,
      );
    }
    return count;
  });
}
