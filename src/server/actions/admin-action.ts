import "server-only";
import type { z } from "zod";
import { requireAdminActor } from "../auth/session";
import type { Result } from "../errors/result";
import { getRequestContext } from "../request-context";
import { toResult } from "./action";
import { runAdminAction, type AdminActionOptions } from "./admin-action-core";

export type { AdminActionContext, AdminAudit, AdminActionOptions } from "./admin-action-core";

/**
 * Server Action d'administration : session admin + MFA + âge de session (requireAdminActor),
 * puis le cœur runAdminAction (rate limit, Zod, authorize, ré-auth, transaction + audit).
 */
export function adminAction<S extends z.ZodType, T>(options: AdminActionOptions<S, T>) {
  return async (input: unknown): Promise<Result<T>> =>
    toResult(async () => {
      const session = await requireAdminActor();
      const context = await getRequestContext();
      return runAdminAction(options, session, input, context);
    });
}
