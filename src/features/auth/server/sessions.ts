import { db } from "@/server/db";

/** Sessions actives de l'utilisateur, sans jamais exposer les jetons. */
export async function listOwnSessions(userId: string): Promise<{ id: string; createdAt: string; userAgent: string | null }[]> {
  const sessions = await db.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, userAgent: true },
    take: 50,
  });
  return sessions.map((s) => ({ id: s.id, createdAt: s.createdAt.toISOString(), userAgent: s.userAgent }));
}
