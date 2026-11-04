import type { Actor } from "@/server/policies";
import type { GlobalRoleName } from "@/server/policies";

export function makeActor(overrides: Partial<Actor> & { roles?: GlobalRoleName[] } = {}): Actor {
  const { roles, ...rest } = overrides;
  return {
    userId: "actor_1",
    globalRoles: roles ?? [],
    status: "ACTIVE",
    emailVerified: true,
    twoFactorEnabled: true,
    isMinor: false,
    canPublishEditorial: false,
    ...rest,
  };
}
