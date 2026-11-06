import { randomUUID } from "node:crypto";
import { db } from "@/server/db";
import type { Actor, GlobalRoleName } from "@/server/policies";

let counter = 0;

/** Crée un utilisateur de test (aucune donnée réelle) avec ses rôles et une session. */
export async function createTestUser(
  options: { roles?: GlobalRoleName[]; twoFactor?: boolean; birthYear?: number; emailVerified?: boolean; createdAt?: Date; discoverable?: boolean } = {},
) {
  counter += 1;
  const suffix = `${counter}_${randomUUID().slice(0, 6)}`;
  const user = await db.user.create({
    data: {
      email: `test_${suffix}@exemple.test`,
      name: `Utilisateur ${counter}`,
      emailVerified: options.emailVerified ?? true,
      twoFactorEnabled: options.twoFactor ?? true,
      birthYear: options.birthYear ?? 1990,
      ...(options.createdAt ? { createdAt: options.createdAt } : {}),
      profile: {
        create: { handle: `test_${suffix}`.slice(0, 30), displayName: `Utilisateur ${counter}`, isDiscoverable: options.discoverable ?? true },
      },
      roles: { create: (options.roles ?? []).map((role) => ({ role })) },
    },
  });
  const session = await db.session.create({
    data: { userId: user.id, token: `tok_${suffix}`, expiresAt: new Date(Date.now() + 3_600_000) },
  });
  const actor: Actor = {
    userId: user.id,
    globalRoles: options.roles ?? [],
    status: "ACTIVE",
    emailVerified: options.emailVerified ?? true,
    twoFactorEnabled: options.twoFactor ?? true,
    isMinor: new Date().getUTCFullYear() - (options.birthYear ?? 1990) < 18,
    canPublishEditorial: false,
  };
  return { user, session, actor };
}

export const NO_REQUEST = { requestId: "test", ip: null, userAgent: null } as const;
