"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { parseInput, toResult } from "@/server/actions/action";
import { adminAction } from "@/server/actions/admin-action";
import { getAuth } from "@/server/auth/auth";
import { requireAdminActor } from "@/server/auth/session";
import { db } from "@/server/db";
import { AppError } from "@/server/errors/app-error";
import { fail, type Result } from "@/server/errors/result";
import { enforceRateLimit } from "@/server/rate-limit/rate-limit";
import { reauthSchema, roleChangeModeSchema, roleChangeSchema } from "../schemas";
import { roleChangeOptions, type RoleChangeMode } from "./role-change";

export async function changeRoleAction(
  mode: RoleChangeMode,
  input: unknown,
): Promise<Result<{ userId: string; role: string }>> {
  // Les arguments d'une Server Action viennent du client : ils sont revalidés à l'exécution.
  const parsedMode = roleChangeModeSchema.safeParse(mode);
  const parsed = roleChangeSchema.safeParse(input);
  if (!parsedMode.success || !parsed.success) return fail(new AppError("VALIDATION").toPayload());
  const result = await adminAction(roleChangeOptions(parsedMode.data, parsed.data.role))(parsed.data);
  if (result.ok) revalidatePath(`/admin/users/${result.data.userId}`);
  return result;
}

/** Ré-authentification par mot de passe, valable 10 minutes pour les actions sensibles. */
export async function reauthenticateAction(input: unknown): Promise<Result<{ until: string }>> {
  return toResult(async () => {
    const session = await requireAdminActor();
    await enforceRateLimit("account.reauth", session.actor.userId);
    const { password } = parseInput(reauthSchema, input);
    try {
      await getAuth().api.verifyPassword({ headers: await headers(), body: { password } });
    } catch {
      throw new AppError("VALIDATION", { fieldErrors: { password: ["Mot de passe incorrect."] } });
    }
    const now = new Date();
    await db.session.update({ where: { id: session.sessionId }, data: { reauthenticatedAt: now } });
    return { until: new Date(now.getTime() + 10 * 60 * 1000).toISOString() };
  });
}
