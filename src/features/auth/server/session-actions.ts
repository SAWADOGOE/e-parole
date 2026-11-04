"use server";

import { z } from "zod";
import { action } from "@/server/actions/action";
import { recordAudit } from "@/server/audit/audit";
import { getCurrentSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { AppError } from "@/server/errors/app-error";
import type { Result } from "@/server/errors/result";

const revokeSchema = z.object({ sessionId: z.string().min(1).max(64) });
const emptySchema = z.object({});

/** Révoque une session de l'utilisateur courant (jamais celle d'un autre : filtre userId). */
export async function revokeSessionAction(input: unknown): Promise<Result<{ revoked: number }>> {
  return action({
    schema: revokeSchema,
    handler: async (actor, { sessionId }) => {
      const current = await getCurrentSession();
      if (current?.sessionId === sessionId) throw new AppError("VALIDATION");
      const { count } = await db.session.deleteMany({ where: { id: sessionId, userId: actor.userId } });
      if (count === 0) throw new AppError("NOT_FOUND");
      await recordAudit({ actor, action: "auth.session.revoked", targetType: "session", targetId: sessionId });
      return { revoked: count };
    },
  })(input);
}

export async function revokeOtherSessionsAction(): Promise<Result<{ revoked: number }>> {
  return action({
    schema: emptySchema,
    handler: async (actor) => {
      const current = await getCurrentSession();
      if (!current) throw new AppError("UNAUTHENTICATED");
      const { count } = await db.session.deleteMany({ where: { userId: actor.userId, id: { not: current.sessionId } } });
      await recordAudit({ actor, action: "auth.session.revoked", targetType: "user", targetId: actor.userId, metadata: { count } });
      return { revoked: count };
    },
  })({});
}
