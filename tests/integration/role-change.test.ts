import { beforeEach, describe, expect, it } from "vitest";
import { roleChangeOptions } from "@/features/administration/server/role-change";
import { runAdminAction } from "@/server/actions/admin-action-core";
import { db } from "@/server/db";
import { AppError } from "@/server/errors/app-error";
import { resetDatabase } from "../support/db";
import { createTestUser, NO_REQUEST } from "../factories/db-users";

async function expectCode(promise: Promise<unknown>, code: AppError["code"]): Promise<void> {
  await expect(promise).rejects.toSatisfy((error: unknown) => error instanceof AppError && error.code === code);
}

describe("attribution des rôles globaux (runAdminAction + PostgreSQL)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("refuse à un ADMIN d'attribuer SUPER_ADMIN, sans rien écrire en base", async () => {
    const admin = await createTestUser({ roles: ["ADMIN"] });
    const target = await createTestUser();
    const session = { sessionId: admin.session.id, reauthenticatedAt: new Date(), actor: admin.actor };

    await expectCode(
      runAdminAction(roleChangeOptions("grant", "SUPER_ADMIN"), session, { userId: target.user.id, role: "SUPER_ADMIN" }, NO_REQUEST),
      "FORBIDDEN",
    );
    expect(await db.userRole.count({ where: { userId: target.user.id } })).toBe(0);
    expect(await db.auditLog.count({ where: { action: "role.grant" } })).toBe(0);
  });

  it("refuse à un ADMIN de retirer un rôle à un autre ADMIN (hiérarchie)", async () => {
    const admin = await createTestUser({ roles: ["ADMIN"] });
    const other = await createTestUser({ roles: ["ADMIN"] });
    const session = { sessionId: admin.session.id, reauthenticatedAt: new Date(), actor: admin.actor };
    await expectCode(
      runAdminAction(roleChangeOptions("grant", "MODERATOR"), session, { userId: other.user.id, role: "MODERATOR" }, NO_REQUEST),
      "FORBIDDEN",
    );
  });

  it("exige une ré-authentification récente pour attribuer un rôle", async () => {
    const superAdmin = await createTestUser({ roles: ["SUPER_ADMIN"] });
    const target = await createTestUser();
    const stale = { sessionId: superAdmin.session.id, reauthenticatedAt: new Date(Date.now() - 11 * 60_000), actor: superAdmin.actor };
    await expectCode(
      runAdminAction(roleChangeOptions("grant", "MODERATOR"), stale, { userId: target.user.id, role: "MODERATOR" }, NO_REQUEST),
      "REAUTH_REQUIRED",
    );
    expect(await db.userRole.count({ where: { userId: target.user.id } })).toBe(0);
  });

  it("attribue le rôle, journalise l'action et révoque les sessions de la cible", async () => {
    const superAdmin = await createTestUser({ roles: ["SUPER_ADMIN"] });
    const target = await createTestUser();
    const session = { sessionId: superAdmin.session.id, reauthenticatedAt: new Date(), actor: superAdmin.actor };

    await runAdminAction(roleChangeOptions("grant", "MODERATOR"), session, { userId: target.user.id, role: "MODERATOR" }, NO_REQUEST);

    expect(await db.userRole.findMany({ where: { userId: target.user.id }, select: { role: true } })).toEqual([{ role: "MODERATOR" }]);
    expect(await db.session.count({ where: { userId: target.user.id } })).toBe(0);
    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "role.grant" } });
    expect(audit).toMatchObject({ actorId: superAdmin.user.id, targetType: "user", targetId: target.user.id });
    expect(audit.metadata).toMatchObject({ role: "MODERATOR", permission: "role:grant:moderator" });
  });

  it("interdit de s'attribuer un rôle à soi-même", async () => {
    const superAdmin = await createTestUser({ roles: ["SUPER_ADMIN"] });
    const session = { sessionId: superAdmin.session.id, reauthenticatedAt: new Date(), actor: superAdmin.actor };
    await expectCode(
      runAdminAction(roleChangeOptions("grant", "ADMIN"), session, { userId: superAdmin.user.id, role: "ADMIN" }, NO_REQUEST),
      "FORBIDDEN",
    );
  });

  it("renvoie NOT_FOUND pour un utilisateur inexistant", async () => {
    const superAdmin = await createTestUser({ roles: ["SUPER_ADMIN"] });
    const session = { sessionId: superAdmin.session.id, reauthenticatedAt: new Date(), actor: superAdmin.actor };
    await expectCode(
      runAdminAction(roleChangeOptions("grant", "MODERATOR"), session, { userId: "inexistant", role: "MODERATOR" }, NO_REQUEST),
      "NOT_FOUND",
    );
  });

  it("rejette une entrée invalide (rôle inconnu)", async () => {
    const superAdmin = await createTestUser({ roles: ["SUPER_ADMIN"] });
    const session = { sessionId: superAdmin.session.id, reauthenticatedAt: new Date(), actor: superAdmin.actor };
    await expectCode(
      runAdminAction(roleChangeOptions("grant", "MODERATOR"), session, { userId: "x", role: "PAPE" }, NO_REQUEST),
      "VALIDATION",
    );
  });
});
