import type { AdminActionOptions } from "@/server/actions/admin-action-core";
import { AppError } from "@/server/errors/app-error";
import type { GlobalRoleName, PolicyResource } from "@/server/policies";
import { roleChangeSchema, type RoleChangeInput } from "../schemas";
import { findUserRoles, grantRole, hasRole, revokeRole } from "./repository";
import { ROLE_GRANT_PERMISSION } from "./role-permissions";

export type RoleChangeMode = "grant" | "revoke";

async function resolveTarget(input: RoleChangeInput): Promise<PolicyResource> {
  const roles = await findUserRoles(input.userId);
  if (!roles) throw new AppError("NOT_FOUND");
  return { targetUserId: input.userId, targetGlobalRoles: roles };
}

/**
 * Définition de l'action d'attribution / retrait d'un rôle global.
 * La permission dépend du rôle visé (role:grant:<rôle>), la hiérarchie est vérifiée par authorize().
 */
export function roleChangeOptions(
  mode: RoleChangeMode,
  role: GlobalRoleName,
): AdminActionOptions<typeof roleChangeSchema, { userId: string; role: GlobalRoleName }> {
  return {
    permission: ROLE_GRANT_PERMISSION[role],
    schema: roleChangeSchema,
    resolveResource: resolveTarget,
    handler: async ({ actor, input, tx }) => {
      if (input.role !== role) throw new AppError("VALIDATION");
      // Attribuer un rôle déjà détenu (ou retirer un rôle absent) ne fait rien : ni révocation de sessions, ni audit.
      const held = await hasRole(tx, input.userId, input.role);
      if (held === (mode === "grant")) throw new AppError("CONFLICT");
      // Le retrait d'un SUPER_ADMIN est impossible ici (hiérarchie stricte) : procédure CLI documentée en Phase 8.
      if (mode === "grant") await grantRole(tx, input.userId, input.role, actor.userId);
      else await revokeRole(tx, input.userId, input.role);
      return {
        data: { userId: input.userId, role: input.role },
        audit: {
          action: mode === "grant" ? "role.grant" : "role.revoke",
          targetType: "user",
          targetId: input.userId,
          metadata: { role: input.role },
        },
      };
    },
  };
}
