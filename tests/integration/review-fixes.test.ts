import { beforeEach, describe, expect, it } from "vitest";
import { assignOptions, decisionOptions } from "@/features/moderation/server/decisions";
import { createReport } from "@/features/moderation/server/reports";
import { notificationsFor } from "@/features/notifications";
import { deleteComment, updateComment } from "@/features/social/server/comments";
import { updatePost } from "@/features/social/server/posts";
import { block } from "@/features/social/server/relations";
import { runAdminAction } from "@/server/actions/admin-action-core";
import { db } from "@/server/db";
import { readJson } from "@/server/http/route-handler";
import { createTestUser, NO_REQUEST } from "../factories/db-users";
import { commentAs, postAs } from "../factories/social";
import { resetDatabase } from "../support/db";

beforeEach(async () => {
  await resetDatabase();
});

async function handleOf(userId: string): Promise<string> {
  return (await db.profile.findUniqueOrThrow({ where: { userId } })).handle;
}

describe("corrections issues des revues de fin de phase", () => {
  it("une mention dans un commentaire ne vise jamais une personne bloquée par l'auteur de la publication", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const c = await createTestUser();
    const postId = await postAs(a.actor);
    await block(a.actor, { userId: b.actor.userId, active: true });
    const commentId = await commentAs(c.actor, postId, `[Test] Regarde @${await handleOf(b.actor.userId)}`);
    expect(await db.mention.count({ where: { commentId } })).toBe(0);
    expect((await notificationsFor(b.actor, undefined)).items).toEqual([]);
  });

  it("un membre bloqué par l'auteur de la publication peut encore modifier et retirer son propre commentaire", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const postId = await postAs(a.actor);
    const commentId = await commentAs(b.actor, postId, "[Test] avant");
    await block(a.actor, { userId: b.actor.userId, active: true });
    await updateComment(b.actor, { commentId, body: "[Test] après" });
    expect((await db.comment.findUniqueOrThrow({ where: { id: commentId } })).body).toBe("[Test] après");
    await deleteComment(b.actor, { commentId });
    expect((await db.comment.findUniqueOrThrow({ where: { id: commentId } })).deletedAt).not.toBeNull();
    expect((await db.post.findUniqueOrThrow({ where: { id: postId } })).commentCount).toBe(0);
  });

  it("un contenu masqué par la modération ne peut plus être modifié par son auteur", async () => {
    const a = await createTestUser();
    const postId = await postAs(a.actor);
    await db.post.update({ where: { id: postId }, data: { isHidden: true } });
    await expect(updatePost(a.actor, { postId, type: "TEXT", body: "[Test] réécrit" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("un modérateur qui a signalé ne décide pas du dossier ; il ne prend pas le dossier d'un autre", async () => {
    const author = await createTestUser();
    const mod1 = await createTestUser({ roles: ["MODERATOR"] });
    const mod2 = await createTestUser({ roles: ["MODERATOR"] });
    const postId = await postAs(author.actor);
    const { caseId } = await createReport(mod1.actor, { targetType: "POST", targetId: postId, reason: "SPAM", details: "" });
    const session = (m: typeof mod1) => ({ sessionId: m.session.id, reauthenticatedAt: new Date(), actor: m.actor });
    await expect(
      runAdminAction(decisionOptions("HIDE"), session(mod1), { caseId, decision: "HIDE", publicReason: "x", internalNote: "", durationDays: null }, NO_REQUEST),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await runAdminAction(assignOptions, session(mod2), { caseId }, NO_REQUEST);
    await expect(runAdminAction(assignOptions, session(mod1), { caseId }, NO_REQUEST)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await db.moderationCase.findUniqueOrThrow({ where: { id: caseId } })).assigneeId).toBe(mod2.actor.userId);
  });

  it("un MODERATOR ne masque pas le contenu d'un ADMIN, même sans sanction", async () => {
    const admin = await createTestUser({ roles: ["ADMIN"] });
    const mod = await createTestUser({ roles: ["MODERATOR"] });
    const reporter = await createTestUser();
    const postId = await postAs(admin.actor);
    const { caseId } = await createReport(reporter.actor, { targetType: "POST", targetId: postId, reason: "SPAM", details: "" });
    await expect(
      runAdminAction(decisionOptions("HIDE"), { sessionId: mod.session.id, reauthenticatedAt: new Date(), actor: mod.actor }, { caseId, decision: "HIDE", publicReason: "x", internalNote: "", durationDays: null }, NO_REQUEST),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("readJson (corps des Route Handlers)", () => {
  it("refuse un Content-Length annoncé trop grand sans lire le corps", async () => {
    const request = new Request("http://localhost/x", { method: "POST", headers: { "content-length": "999999" }, body: "{}" });
    await expect(readJson(request, 100)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("coupe un corps sans longueur annoncée dès qu'il dépasse la limite", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < 10; i += 1) controller.enqueue(new TextEncoder().encode("x".repeat(50)));
        controller.close();
      },
    });
    const request = new Request("http://localhost/x", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    await expect(readJson(request, 100)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("refuse un JSON invalide et accepte un JSON valide", async () => {
    await expect(readJson(new Request("http://localhost/x", { method: "POST", body: "{pas du json" }))).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await readJson(new Request("http://localhost/x", { method: "POST", body: '{"a":1}' }))).toEqual({ a: 1 });
  });
});

describe("preuves de modération : correspondance structurée", () => {
  it("un identifiant d'image écrit dans le texte d'une publication n'ouvre pas l'accès modérateur", async () => {
    const { isAssetInEvidence } = await import("@/features/moderation");
    const owner = await createTestUser();
    const author = await createTestUser();
    const reporter = await createTestUser();
    const privateDraft = await db.mediaAsset.create({ data: { ownerId: owner.actor.userId, purpose: "POST_IMAGE", bucket: "b", key: "k-draft", mime: "image/jpeg", size: 1, status: "READY" } });
    const postId = await postAs(author.actor, `[Test] "${privateDraft.id}"`);
    await createReport(reporter.actor, { targetType: "POST", targetId: postId, reason: "SPAM", details: "" });
    expect(await isAssetInEvidence(privateDraft.id)).toBe(false);

    const attached = await db.mediaAsset.create({ data: { ownerId: author.actor.userId, purpose: "POST_IMAGE", bucket: "b", key: "k-attached", mime: "image/jpeg", size: 1, status: "READY", width: 10, height: 10 } });
    const { createPost } = await import("@/features/social/server/posts");
    const { id: withImage } = await createPost(author.actor, { type: "TEXT", body: "[Test]", verse: null, images: [{ assetId: attached.id, altText: "" }] });
    await createReport(reporter.actor, { targetType: "POST", targetId: withImage, reason: "SPAM", details: "" });
    expect(await isAssetInEvidence(attached.id)).toBe(true);
  });
});
