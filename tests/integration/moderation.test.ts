import { beforeEach, describe, expect, it } from "vitest";
import { moderationCase, moderationQueue } from "@/features/moderation";
import { assignOptions, decisionOptions } from "@/features/moderation/server/decisions";
import { expireDueSuspensions } from "@/features/moderation/server/maintenance";
import { createReport } from "@/features/moderation/server/reports";
import { caseListQuerySchema } from "@/features/moderation/schemas";
import { notificationsFor } from "@/features/notifications";
import { feedPage, getPost } from "@/features/social";
import { runAdminAction, type AdminSessionInfo } from "@/server/actions/admin-action-core";
import { db } from "@/server/db";
import type { Actor } from "@/server/policies";
import { createTestUser, NO_REQUEST } from "../factories/db-users";
import { commentAs, postAs } from "../factories/social";
import { resetDatabase } from "../support/db";

beforeEach(async () => {
  await resetDatabase();
});

const OLD = new Date(Date.now() - 30 * 86_400_000);
const SECRET = "[Test] contenu sensible à ne jamais journaliser";

function adminSession(actor: Actor, sessionId: string, reauth = true): AdminSessionInfo {
  return { sessionId, reauthenticatedAt: reauth ? new Date() : null, actor };
}

async function decide(
  moderator: { actor: Actor; session: { id: string } },
  input: { caseId: string; decision: "DISMISS" | "WARN" | "HIDE" | "REMOVE" | "SUSPEND" | "BAN"; durationDays?: number | null; confirmHandle?: string },
  reauth = true,
) {
  return runAdminAction(
    decisionOptions(input.decision),
    adminSession(moderator.actor, moderator.session.id, reauth),
    { publicReason: "Règle 2 : respect", internalNote: SECRET, durationDays: null, ...input },
    NO_REQUEST,
  );
}

async function handleOf(userId: string): Promise<string> {
  return (await db.profile.findUniqueOrThrow({ where: { userId } })).handle;
}

describe("signalements", () => {
  it("un seul signalement par personne et par cible ; plusieurs personnes = un seul dossier", async () => {
    const author = await createTestUser();
    const r1 = await createTestUser();
    const r2 = await createTestUser();
    const postId = await postAs(author.actor, SECRET);
    const { caseId } = await createReport(r1.actor, { targetType: "POST", targetId: postId, reason: "SPAM", details: "" });
    await expect(createReport(r1.actor, { targetType: "POST", targetId: postId, reason: "HATE", details: "" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await createReport(r2.actor, { targetType: "POST", targetId: postId, reason: "HATE", details: "x" })).caseId).toBe(caseId);
    const found = await db.moderationCase.findUniqueOrThrow({ where: { id: caseId } });
    expect(found.reportCount).toBe(2);
    expect(found.priority).toBe(1);
  });

  it("copie figée : le dossier garde le texte d'origine même après modification", async () => {
    const author = await createTestUser();
    const reporter = await createTestUser();
    const postId = await postAs(author.actor, "[Test] texte d'origine");
    const { caseId } = await createReport(reporter.actor, { targetType: "POST", targetId: postId, reason: "OTHER", details: "" });
    await db.post.update({ where: { id: postId }, data: { body: "[Test] modifié" } });
    const moderator = await createTestUser({ roles: ["MODERATOR"] });
    const detail = await moderationCase(moderator.actor, caseId);
    expect(detail?.snapshot?.["body"]).toBe("[Test] texte d'origine");
    expect(detail?.state.current?.["body"]).toBe("[Test] modifié");
  });

  it("priorités : SELF_HARM 0, FRAUD 1, SPAM 2, OTHER 3 ; un contenu de mineur passe en priorité 1", async () => {
    const author = await createTestUser();
    const minor = await createTestUser({ birthYear: new Date().getUTCFullYear() - 15 });
    const reporter = await createTestUser();
    const cases = [];
    for (const reason of ["SELF_HARM", "FRAUD_FINANCIAL", "SPAM", "OTHER"] as const) {
      cases.push(await createReport(reporter.actor, { targetType: "POST", targetId: await postAs(author.actor), reason, details: "" }));
    }
    const priorities = await Promise.all(cases.map(async ({ caseId }) => (await db.moderationCase.findUniqueOrThrow({ where: { id: caseId } })).priority));
    expect(priorities).toEqual([0, 1, 2, 3]);
    const minorCase = await createReport(reporter.actor, { targetType: "POST", targetId: await postAs(minor.actor), reason: "SPAM", details: "" });
    expect((await db.moderationCase.findUniqueOrThrow({ where: { id: minorCase.caseId } })).priority).toBe(1);
  });

  it("masquage provisoire à 5 signalements de comptes de plus de 7 jours (pas avec des comptes récents)", async () => {
    const author = await createTestUser();
    const postId = await postAs(author.actor);
    const commentId = await commentAs(author.actor, postId);
    for (let i = 0; i < 6; i += 1) {
      const fresh = await createTestUser();
      await createReport(fresh.actor, { targetType: "COMMENT", targetId: commentId, reason: "SPAM", details: "" });
    }
    expect((await db.comment.findUniqueOrThrow({ where: { id: commentId } })).isHidden).toBe(false);
    for (let i = 0; i < 4; i += 1) {
      const trusted = await createTestUser({ createdAt: OLD });
      await createReport(trusted.actor, { targetType: "POST", targetId: postId, reason: "SPAM", details: "" });
    }
    expect((await db.post.findUniqueOrThrow({ where: { id: postId } })).isHidden).toBe(false);
    const fifth = await createTestUser({ createdAt: OLD });
    await createReport(fifth.actor, { targetType: "POST", targetId: postId, reason: "SPAM", details: "" });
    expect((await db.post.findUniqueOrThrow({ where: { id: postId } })).isHidden).toBe(true);
    expect(await getPost(fifth.actor, postId)).toBeNull();
    expect((await getPost(author.actor, postId))?.isHidden).toBe(true);
    expect(await db.auditLog.count({ where: { action: "moderation.auto_hide" } })).toBe(1);
  });

  it("on ne signale pas son propre contenu ni un contenu invisible (bloqué)", async () => {
    const author = await createTestUser();
    const other = await createTestUser();
    const postId = await postAs(author.actor);
    await expect(createReport(author.actor, { targetType: "POST", targetId: postId, reason: "SPAM", details: "" })).rejects.toMatchObject({ code: "VALIDATION" });
    await db.block.create({ data: { blockerId: author.actor.userId, blockedId: other.actor.userId } });
    await expect(createReport(other.actor, { targetType: "POST", targetId: postId, reason: "SPAM", details: "" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("décisions", () => {
  async function reportedPost() {
    const author = await createTestUser();
    const reporter = await createTestUser();
    const moderator = await createTestUser({ roles: ["MODERATOR"] });
    const postId = await postAs(author.actor, SECRET);
    const { caseId } = await createReport(reporter.actor, { targetType: "POST", targetId: postId, reason: "HARASSMENT", details: SECRET });
    return { author, reporter, moderator, postId, caseId };
  }

  it("Masquer : contenu caché à tous sauf l'auteur, auteur et signaleur notifiés, audit sans contenu", async () => {
    const { author, reporter, moderator, postId, caseId } = await reportedPost();
    await decide(moderator, { caseId, decision: "HIDE" });
    expect(await getPost(reporter.actor, postId)).toBeNull();
    expect((await getPost(author.actor, postId))?.isHidden).toBe(true);
    expect((await notificationsFor(author.actor, undefined)).items.map((n) => n.type)).toContain("MODERATION");
    expect((await notificationsFor(reporter.actor, undefined)).items.map((n) => n.type)).toEqual(["REPORT_REVIEWED"]);
    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "moderation.decision" } });
    expect(JSON.stringify(audit)).not.toContain("sensible");
    expect(JSON.stringify(audit)).not.toContain("Règle 2");
    expect(audit.metadata).toMatchObject({ decision: "HIDE", caseTargetType: "POST" });
    expect((await db.moderationCase.findUniqueOrThrow({ where: { id: caseId } })).status).toBe("RESOLVED");
  });

  it("Retirer : suppression logique marquée modération ; Ignorer lève un masquage provisoire", async () => {
    const { moderator, postId, caseId } = await reportedPost();
    await decide(moderator, { caseId, decision: "REMOVE" });
    const post = await db.post.findUniqueOrThrow({ where: { id: postId } });
    expect(post.deletedAt).not.toBeNull();
    expect(post.removedByModeration).toBe(true);

    const second = await reportedPost();
    await db.post.update({ where: { id: second.postId }, data: { isHidden: true } });
    await db.moderationCase.update({ where: { id: second.caseId }, data: { autoHiddenAt: new Date() } });
    await decide(second.moderator, { caseId: second.caseId, decision: "DISMISS" });
    expect((await db.post.findUniqueOrThrow({ where: { id: second.postId } })).isHidden).toBe(false);
    expect((await db.moderationCase.findUniqueOrThrow({ where: { id: second.caseId } })).status).toBe("DISMISSED");
  });

  it("un dossier déjà traité ne peut pas l'être deux fois", async () => {
    const { moderator, caseId } = await reportedPost();
    await decide(moderator, { caseId, decision: "WARN" });
    await expect(decide(moderator, { caseId, decision: "HIDE" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.sanction.count({ where: { kind: "WARNING" } })).toBe(1);
  });

  it("plafond MODERATOR : suspension ≤ 30 jours, au-delà refusée ; ADMIN peut 60 jours", async () => {
    const { author, moderator, caseId } = await reportedPost();
    const handle = await handleOf(author.actor.userId);
    await expect(decide(moderator, { caseId, decision: "SUSPEND", durationDays: 31, confirmHandle: handle })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await decide(moderator, { caseId, decision: "SUSPEND", durationDays: 30, confirmHandle: handle });
    const user = await db.user.findUniqueOrThrow({ where: { id: author.actor.userId } });
    expect(user.status).toBe("SUSPENDED");
    expect(await db.session.count({ where: { userId: author.actor.userId } })).toBe(0);

    const other = await reportedPost();
    const admin = await createTestUser({ roles: ["ADMIN"] });
    await decide(admin, { caseId: other.caseId, decision: "SUSPEND", durationDays: 60, confirmHandle: await handleOf(other.author.actor.userId) });
    expect((await db.user.findUniqueOrThrow({ where: { id: other.author.actor.userId } })).status).toBe("SUSPENDED");
  });

  it("suspendre exige une ré-authentification récente et la saisie du @handle", async () => {
    const { author, moderator, caseId } = await reportedPost();
    await expect(decide(moderator, { caseId, decision: "SUSPEND", durationDays: 3, confirmHandle: await handleOf(author.actor.userId) }, false)).rejects.toMatchObject({ code: "REAUTH_REQUIRED" });
    await expect(decide(moderator, { caseId, decision: "SUSPEND", durationDays: 3, confirmHandle: "quelquun_dautre" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("bannir est réservé à ADMIN+ ; la hiérarchie empêche un MODERATOR de sanctionner un ADMIN", async () => {
    const { author, moderator, caseId } = await reportedPost();
    await expect(decide(moderator, { caseId, decision: "BAN", confirmHandle: await handleOf(author.actor.userId) })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const adminAuthor = await createTestUser({ roles: ["ADMIN"] });
    const reporter = await createTestUser();
    const postId = await postAs(adminAuthor.actor);
    const report = await createReport(reporter.actor, { targetType: "POST", targetId: postId, reason: "SPAM", details: "" });
    await expect(decide(moderator, { caseId: report.caseId, decision: "WARN" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("un membre ou un éditeur ne peut ni lire la file ni décider", async () => {
    const { caseId } = await reportedPost();
    const member = await createTestUser();
    const editor = await createTestUser({ roles: ["CONTENT_EDITOR"] });
    for (const who of [member, editor]) {
      await expect(moderationQueue(who.actor, caseListQuerySchema.parse({}))).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(decide(who, { caseId, decision: "DISMISS" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("un modérateur ne décide pas d'un dossier qui vise son propre contenu", async () => {
    const moderator = await createTestUser({ roles: ["MODERATOR"] });
    const reporter = await createTestUser();
    const postId = await postAs(moderator.actor);
    const { caseId } = await createReport(reporter.actor, { targetType: "POST", targetId: postId, reason: "SPAM", details: "" });
    await expect(decide(moderator, { caseId, decision: "DISMISS" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("file triée par priorité puis ancienneté ; s'assigner un dossier est audité", async () => {
    const author = await createTestUser();
    const reporter = await createTestUser();
    const moderator = await createTestUser({ roles: ["MODERATOR"] });
    const low = await createReport(reporter.actor, { targetType: "POST", targetId: await postAs(author.actor), reason: "OTHER", details: "" });
    const high = await createReport(reporter.actor, { targetType: "POST", targetId: await postAs(author.actor), reason: "SELF_HARM", details: "" });
    const queue = await moderationQueue(moderator.actor, caseListQuerySchema.parse({}));
    expect(queue.rows.map((r) => r.id)).toEqual([high.caseId, low.caseId]);
    await runAdminAction(assignOptions, adminSession(moderator.actor, moderator.session.id), { caseId: low.caseId }, NO_REQUEST);
    const mine = await moderationQueue(moderator.actor, caseListQuerySchema.parse({ assigne: "moi" }));
    expect(mine.rows.map((r) => r.id)).toEqual([low.caseId]);
    expect(await db.auditLog.count({ where: { action: "moderation.case.assign" } })).toBe(1);
  });

  it("le dossier ne montre jamais les notes bibliques ni l'email de l'auteur", async () => {
    const { author, moderator, caseId } = await reportedPost();
    await db.user.update({ where: { id: author.actor.userId }, data: { email: "prive.auteur@exemple.test" } });
    const detail = await moderationCase(moderator.actor, caseId);
    const serialized = JSON.stringify(detail);
    expect(serialized).not.toContain("prive.auteur");
    expect(Object.keys(detail?.author ?? {})).not.toContain("email");
  });

  it("une suspension ne lève jamais un bannissement et ne raccourcit jamais une suspension en cours", async () => {
    const first = await reportedPost();
    const handle = await handleOf(first.author.actor.userId);
    const admin = await createTestUser({ roles: ["ADMIN"] });
    await decide(admin, { caseId: first.caseId, decision: "SUSPEND", durationDays: 60, confirmHandle: handle });
    const longUntil = (await db.user.findUniqueOrThrow({ where: { id: first.author.actor.userId } })).suspendedUntil;

    const reporter = await createTestUser();
    const second = await createReport(reporter.actor, { targetType: "PROFILE", targetId: first.author.actor.userId, reason: "SPAM", details: "" });
    await decide(first.moderator, { caseId: second.caseId, decision: "SUSPEND", durationDays: 3, confirmHandle: handle });
    expect((await db.user.findUniqueOrThrow({ where: { id: first.author.actor.userId } })).suspendedUntil).toEqual(longUntil);

    // Dossier ouvert pendant que le compte était encore visible, puis bannissement par une autre décision.
    const postId = await db.post.findFirstOrThrow({ where: { authorId: first.author.actor.userId }, select: { id: true } });
    await db.user.update({ where: { id: first.author.actor.userId }, data: { status: "ACTIVE", suspendedUntil: null } });
    const third = await createReport((await createTestUser()).actor, { targetType: "COMMENT", targetId: await commentAs(first.author.actor, postId.id), reason: "HATE", details: "" });
    await db.user.update({ where: { id: first.author.actor.userId }, data: { status: "BANNED" } });
    await expect(decide(admin, { caseId: third.caseId, decision: "SUSPEND", durationDays: 1, confirmHandle: handle })).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await db.user.findUniqueOrThrow({ where: { id: first.author.actor.userId } })).status).toBe("BANNED");
  });

  it("une suspension échue est levée par le job", async () => {
    const { author } = await reportedPost();
    await db.user.update({ where: { id: author.actor.userId }, data: { status: "SUSPENDED", suspendedUntil: new Date(Date.now() - 1000) } });
    expect(await expireDueSuspensions()).toBe(1);
    expect((await db.user.findUniqueOrThrow({ where: { id: author.actor.userId } })).status).toBe("ACTIVE");
  });

  it("le contenu d'un compte banni disparaît des fils", async () => {
    const { author, reporter, caseId, postId } = await reportedPost();
    const admin = await createTestUser({ roles: ["ADMIN"] });
    await decide(admin, { caseId, decision: "BAN", confirmHandle: await handleOf(author.actor.userId) });
    expect((await feedPage(reporter.actor, "discover", undefined)).items.map((p) => p.id)).not.toContain(postId);
  });
});
