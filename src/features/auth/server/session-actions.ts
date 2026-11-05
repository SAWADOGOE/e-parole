"use server";

import { z } from "zod";
import { action } from "@/server/actions/action";
import { getCurrentSession } from "@/server/auth/session";
import { revokeSessionsAudited } from "@/server/auth/session-repository";
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
      const count = await revokeSessionsAudited(actor, { id: sessionId });
      if (count === 0) throw new AppError("NOT_FOUND");
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
      return { revoked: await revokeSessionsAudited(actor, { notId: current.sessionId }) };
    },
  })({});
}
