import { beforeEach, describe, expect, it } from "vitest";
import { findMembership } from "@/features/communities/server/repository";
import { recordAudit } from "@/server/audit/audit";
import { createProfileForUser } from "@/server/auth/profile-bootstrap";
import { db } from "@/server/db";
import { evaluateCommunity } from "@/server/policies";
import { consumeRateLimit, refundRateLimit } from "@/server/rate-limit/rate-limit";
import { queryAsApp, resetDatabase } from "../support/db";
import { createTestUser } from "../factories/db-users";

describe("garde-fous PostgreSQL", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("le journal d'audit est en append-only pour le rôle applicatif", async () => {
    const { actor } = await createTestUser();
    await recordAudit({ actor, action: "role.grant", targetType: "user", targetId: actor.userId });
    await expect(queryAsApp(`UPDATE "audit_log" SET "action" = 'falsifié'`)).rejects.toThrow(/permission denied/i);
    await expect(queryAsApp(`DELETE FROM "audit_log"`)).rejects.toThrow(/permission denied/i);
    expect(await db.auditLog.count()).toBe(1);
  });

  it("le rôle applicatif ne peut ni supprimer physiquement un compte ni toucher à l'historique des migrations", async () => {
    await createTestUser();
    await expect(queryAsApp(`DELETE FROM "user"`)).rejects.toThrow(/permission denied/i);
    await expect(queryAsApp(`DELETE FROM "_prisma_migrations"`)).rejects.toThrow(/permission denied/i);
  });

  it("le rôle applicatif n'est pas superutilisateur", async () => {
    const { rows } = await queryAsApp("SELECT rolsuper FROM pg_roles WHERE rolname = current_user");
    expect(rows[0]).toEqual({ rolsuper: false });
  });

  it("le handle est unique", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    await db.profile.update({ where: { userId: a.user.id }, data: { handle: "frere_paul" } });
    await expect(db.profile.update({ where: { userId: b.user.id }, data: { handle: "frere_paul" } })).rejects.toThrow();
  });

  it("refuse un handle au format invalide (contrainte CHECK)", async () => {
    const { user } = await createTestUser();
    await expect(db.profile.update({ where: { userId: user.id }, data: { handle: "Avec Espace" } })).rejects.toThrow();
  });

  it("crée un profil avec un handle valide dérivé du nom", async () => {
    const user = await db.user.create({ data: { email: "nouveau@exemple.test", name: "Aïcha Ouédraogo", birthYear: 2004 } });
    await createProfileForUser(user.id, user.name, 2004);
    const profile = await db.profile.findUniqueOrThrow({ where: { userId: user.id } });
    expect(profile.handle).toMatch(/^aicha_ouedraogo_\d{4,5}$/);
    expect(profile.displayName).toBe("Aïcha Ouédraogo");
    expect(profile.isDiscoverable).toBe(true);
  });

  it("un mineur n'est pas découvrable par défaut", async () => {
    const birthYear = new Date().getUTCFullYear() - 15;
    const user = await db.user.create({ data: { email: "jeune@exemple.test", name: "Jeune Test", birthYear } });
    await createProfileForUser(user.id, user.name, birthYear);
    expect((await db.profile.findUniqueOrThrow({ where: { userId: user.id } })).isDiscoverable).toBe(false);
  });

  it("un créneau rendu (connexion réussie) libère une place", async () => {
    for (let i = 0; i < 5; i += 1) await consumeRateLimit("account.reauth", "sujet-refund");
    expect((await consumeRateLimit("account.reauth", "sujet-refund")).allowed).toBe(false);
    await refundRateLimit("account.reauth", "sujet-refund");
    await refundRateLimit("account.reauth", "sujet-refund");
    expect((await consumeRateLimit("account.reauth", "sujet-refund")).allowed).toBe(true);
  });

  it("la limite de débit est atomique : exactement `max` requêtes passent", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => consumeRateLimit("account.reauth", "sujet-test")));
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
    expect(results.find((r) => !r.allowed)?.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("isolation entre communautés", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("un responsable de A n'a aucun accès à la communauté B", async () => {
    const { user, actor } = await createTestUser();
    const a = await db.community.create({ data: { slug: "eglise-a", name: "Église A" } });
    const b = await db.community.create({ data: { slug: "eglise-b", name: "Église B", isPrivate: true } });
    await db.communityMember.create({ data: { communityId: a.id, userId: user.id, role: "OWNER", status: "ACTIVE" } });

    const inA = await findMembership(a.id, user.id);
    const inB = await findMembership(b.id, user.id);
    expect(evaluateCommunity(actor, inA, "community:manage:access").allowed).toBe(true);
    expect(inB).toBeNull();
    expect(evaluateCommunity(actor, inB, "community:manage:access").allowed).toBe(false);
    expect(evaluateCommunity(actor, inB, "community:read").allowed).toBe(false);
  });

  it("un SUPER_ADMIN global n'obtient aucun droit local sans adhésion", async () => {
    const { user, actor } = await createTestUser({ roles: ["SUPER_ADMIN"] });
    const c = await db.community.create({ data: { slug: "jeunesse", name: "Jeunesse" } });
    expect(evaluateCommunity(actor, await findMembership(c.id, user.id), "community:settings:update").allowed).toBe(false);
  });

  it("une communauté supprimée n'accorde plus aucun accès", async () => {
    const { user, actor } = await createTestUser();
    const c = await db.community.create({ data: { slug: "supprimee", name: "Supprimée", deletedAt: new Date() } });
    await db.communityMember.create({ data: { communityId: c.id, userId: user.id, role: "OWNER", status: "ACTIVE" } });
    expect(evaluateCommunity(actor, await findMembership(c.id, user.id), "community:read").allowed).toBe(false);
  });

  it("un seul propriétaire actif par communauté (index partiel unique)", async () => {
    const one = await createTestUser();
    const two = await createTestUser();
    const c = await db.community.create({ data: { slug: "chorale", name: "Chorale" } });
    await db.communityMember.create({ data: { communityId: c.id, userId: one.user.id, role: "OWNER", status: "ACTIVE" } });
    await expect(
      db.communityMember.create({ data: { communityId: c.id, userId: two.user.id, role: "OWNER", status: "ACTIVE" } }),
    ).rejects.toThrow();
  });
});
