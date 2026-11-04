import type { GlobalPermission, GlobalRoleName } from "@/server/policies";

/** Permission requise pour attribuer ou retirer chaque rôle global. */
export const ROLE_GRANT_PERMISSION: Record<GlobalRoleName, GlobalPermission> = {
  SUPER_ADMIN: "role:grant:super_admin",
  ADMIN: "role:grant:admin",
  MODERATOR: "role:grant:moderator",
  CONTENT_EDITOR: "role:grant:editor",
};
