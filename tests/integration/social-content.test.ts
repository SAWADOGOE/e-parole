import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { feedPage, getPost, postComments, quotedPassages } from "@/features/social";
import { createComment, deleteComment, hideComment, updateComment } from "@/features/social/server/comments";
import { createPost, deletePost, lockComments, updatePost } from "@/features/social/server/posts";
import { editProfile } from "@/features/social/server/profiles";
import { react } from "@/features/social/server/reactions";
import { follow } from "@/features/social/server/relations";
import { createPostSchema } from "@/features/social/schemas";
import { notificationsFor, unreadCountFor } from "@/features/notifications";
import { db } from "@/server/db";
import { ensureSampleBible } from "../../scripts/bible/ensure-sample";
import { createImportClient } from "../../scripts/bible/repository";
import { createTestUser } from "../factories/db-users";
import { commentAs, postAs } from "../factories/social";
import { resetDatabase } from "../support/db";
import { testOwnerUrl } from "../support/integration-env";

const owner = createImportClient(testOwnerUrl());
/** Compte de plus de 7 jours : limite de publication normale (60/h). */
const OLD_ACCOUNT = new Date(Date.now() - 30 * 86_400_000);

beforeAll(async () => {
  await ensureSampleBible(owner);
});
afterAll(async () => {
  await owner.$disconnect();
});
beforeEach(async () => {
  await resetDatabase();
});

describe("publications toujours publiques", () => {
  it("toute publication créée est visible de tout membre connecté, sans abonnement", async () => {
    const author = await createTestUser();
    const stranger = await createTestUser();
    const postId = await postAs(author.actor);
    expect(await getPost(stranger.actor, postId)).not.toBeNull();
    expect((await feedPage(stranger.actor, "discover", undefined)).items.map((p) => p.id)).toContain(postId);
  });

  it("aucune autre visibilité n'est acceptée : le champ est refusé par le schéma", () => {
    for (const visibility of ["FOLLOWERS", "COMMUNITY", "PRIVATE", "PUBLIC"]) {
      const parsed = createPostSchema.safeParse({ type: "TEXT", body: "x", visibility });
      expect(parsed.success).toBe(false);
    }
    expect(createPostSchema.safeParse({ type: "TEXT", body: "x" }).success).toBe(true);
  });

  it("la table post n'a aucune colonne de visibilité", async () => {
    const rows = await db.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'post' AND column_name ILIKE '%visib%'`;
    expect(rows).toEqual([]);
  });

  it("écriture refusée si l'email n'est pas vérifié", async () => {
    const unverified = await createTestUser({ emailVerified: false });
    await expect(postAs(unverified.actor)).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  it("verset cité : stocké comme référence, texte rendu depuis la base avec l'attribution", async () => {
    const author = await createTestUser();
    const { id } = await createPost(author.actor, { type: "TESTIMONY", body: "", verse: { bookId: "JHN", chapter: 3, verseStart: 16, verseEnd: 16 }, images: [] });
    const row = await db.post.findUniqueOrThrow({ where: { id } });
    expect(row.body).toBe("");
    expect(row.verseBookId).toBe("JHN");
    const view = await getPost(author.actor, id);
    const passages = await quotedPassages([view?.verse ?? null]);
    const passage = [...passages.values()][0];
    expect(passage?.reference).toBe("Jean 3:16");
    expect(passage?.verses[0]?.text).toMatch(/Dieu a tant aimé le monde/);
    expect(passage?.attribution).toMatch(/Louis Segond/);
  });

  it("un verset inexistant est refusé", async () => {
    const author = await createTestUser();
    await expect(createPost(author.actor, { type: "TEXT", body: "x", verse: { bookId: "JHN", chapter: 3, verseStart: 99, verseEnd: 99 }, images: [] })).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("une image d'autrui ou pas encore prête ne peut pas être attachée", async () => {
    const author = await createTestUser();
    const other = await createTestUser();
    const foreign = await db.mediaAsset.create({ data: { ownerId: other.actor.userId, purpose: "POST_IMAGE", bucket: "t", key: "k1", mime: "image/jpeg", size: 1, status: "READY" } });
    const pending = await db.mediaAsset.create({ data: { ownerId: author.actor.userId, purpose: "POST_IMAGE", bucket: "t", key: "k2", mime: "image/jpeg", size: 1, status: "PROCESSING" } });
    for (const assetId of [foreign.id, pending.id]) {
      await expect(createPost(author.actor, { type: "TEXT", body: "x", verse: null, images: [{ assetId, altText: "" }] })).rejects.toMatchObject({ code: "VALIDATION" });
    }
  });
});

describe("IDOR : édition et suppression", () => {
  it("un membre ne modifie ni ne supprime la publication d'autrui", async () => {
    const author = await createTestUser();
    const intruder = await createTestUser();
    const postId = await postAs(author.actor, "[Test] original");
    await expect(updatePost(intruder.actor, { postId, type: "TEXT", body: "piraté" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(deletePost(intruder.actor, { postId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(lockComments(intruder.actor, { postId, locked: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const row = await db.post.findUniqueOrThrow({ where: { id: postId } });
    expect(row.body).toBe("[Test] original");
    expect(row.deletedAt).toBeNull();
  });

  it("un membre ne modifie ni ne supprime le commentaire d'autrui ; seul l'auteur de la publication masque", async () => {
    const author = await createTestUser();
    const commenter = await createTestUser();
    const intruder = await createTestUser();
    const postId = await postAs(author.actor);
    const commentId = await commentAs(commenter.actor, postId);
    await expect(updateComment(intruder.actor, { commentId, body: "x" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(deleteComment(intruder.actor, { commentId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(hideComment(intruder.actor, { commentId, hidden: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(hideComment(commenter.actor, { commentId, hidden: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await hideComment(author.actor, { commentId, hidden: true });
    expect((await postComments(intruder.actor, postId, undefined))?.items).toEqual([]);
    expect((await postComments(commenter.actor, postId, undefined))?.items[0]?.hiddenByPostAuthor).toBe(true);
  });

  it("une publication supprimée devient introuvable, y compris pour son auteur", async () => {
    const author = await createTestUser();
    const postId = await postAs(author.actor);
    await deletePost(author.actor, { postId });
    expect(await getPost(author.actor, postId)).toBeNull();
    await expect(updatePost(author.actor, { postId, type: "TEXT", body: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("commentaires (US-11)", () => {
  it("un seul niveau de réponse, refusé par le service et par la base", async () => {
    const a = await createTestUser();
    const postId = await postAs(a.actor);
    const top = await commentAs(a.actor, postId);
    const reply = await commentAs(a.actor, postId, "[Test] réponse", top);
    await expect(createComment(a.actor, { postId, parentId: reply, body: "[Test] trop profond" })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(db.comment.create({ data: { postId, authorId: a.actor.userId, parentId: reply, body: "x" } })).rejects.toThrow();
    const page = await postComments(a.actor, postId, undefined);
    expect(page?.items[0]?.replies.map((r) => r.id)).toEqual([reply]);
  });

  it("verrouillage : plus aucun commentaire possible", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const postId = await postAs(a.actor);
    await lockComments(a.actor, { postId, locked: true });
    await expect(commentAs(b.actor, postId)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("compteurs : création, réponse, masquage et suppression restent exacts", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const postId = await postAs(a.actor);
    const top = await commentAs(b.actor, postId);
    await commentAs(a.actor, postId, "[Test] r", top);
    const second = await commentAs(b.actor, postId);
    expect((await db.post.findUniqueOrThrow({ where: { id: postId } })).commentCount).toBe(3);
    await hideComment(a.actor, { commentId: second, hidden: true });
    expect((await db.post.findUniqueOrThrow({ where: { id: postId } })).commentCount).toBe(2);
    await hideComment(a.actor, { commentId: second, hidden: true });
    expect((await db.post.findUniqueOrThrow({ where: { id: postId } })).commentCount).toBe(2);
    await deleteComment(b.actor, { commentId: top });
    const post = await db.post.findUniqueOrThrow({ where: { id: postId } });
    expect(post.commentCount).toBe(1);
    const page = await postComments(a.actor, postId, undefined);
    expect(page?.items[0]?.deleted).toBe(true);
    expect(page?.items[0]?.body).toBe("");
  });

  it("notifie l'auteur de la publication (commentaire) et l'auteur du commentaire (réponse)", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const postId = await postAs(a.actor);
    const top = await commentAs(b.actor, postId);
    await commentAs(a.actor, postId, "[Test] merci", top);
    expect((await notificationsFor(a.actor, undefined)).items.map((n) => n.type)).toEqual(["COMMENT"]);
    expect((await notificationsFor(b.actor, undefined)).items.map((n) => n.type)).toEqual(["REPLY"]);
  });
});

describe("réactions (US-12)", () => {
  it("trois types, une seule par personne et par cible, modifiable et retirable", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const postId = await postAs(a.actor);
    expect((await react(b.actor, { target: "post", targetId: postId, kind: "AMEN" })).counts).toEqual({ AMEN: 1, LOVE: 0, ENCOURAGED: 0 });
    expect((await react(b.actor, { target: "post", targetId: postId, kind: "AMEN" })).counts).toEqual({ AMEN: 1, LOVE: 0, ENCOURAGED: 0 });
    expect((await react(b.actor, { target: "post", targetId: postId, kind: "ENCOURAGED" })).counts).toEqual({ AMEN: 0, LOVE: 0, ENCOURAGED: 1 });
    expect(await db.reaction.count()).toBe(1);
    expect((await react(b.actor, { target: "post", targetId: postId, kind: null })).counts).toEqual({ AMEN: 0, LOVE: 0, ENCOURAGED: 0 });
    expect(await db.reaction.count()).toBe(0);
    const commentId = await commentAs(a.actor, postId);
    expect((await react(b.actor, { target: "comment", targetId: commentId, kind: "LOVE" })).counts.LOVE).toBe(1);
  });

  it("la base refuse une seconde réaction de la même personne sur la même cible", async () => {
    const a = await createTestUser();
    const postId = await postAs(a.actor);
    await db.reaction.create({ data: { userId: a.actor.userId, postId, kind: "AMEN" } });
    await expect(db.reaction.create({ data: { userId: a.actor.userId, postId, kind: "LOVE" } })).rejects.toThrow();
  });

  it("compteurs exacts sous concurrence (20 membres, et un même membre qui clique vite)", async () => {
    const author = await createTestUser();
    const postId = await postAs(author.actor);
    const members = await Promise.all(Array.from({ length: 20 }, () => createTestUser()));
    await Promise.all(members.map((m, i) => react(m.actor, { target: "post", targetId: postId, kind: i % 2 === 0 ? "AMEN" : "LOVE" })));
    const hurried = members[0]!;
    await Promise.all(
      (["LOVE", "ENCOURAGED", "AMEN", null, "ENCOURAGED", "LOVE"] as const).map((kind) => react(hurried.actor, { target: "post", targetId: postId, kind })),
    );
    const post = await db.post.findUniqueOrThrow({ where: { id: postId } });
    const grouped = await db.reaction.groupBy({ by: ["kind"], where: { postId }, _count: true });
    const actual = Object.fromEntries(grouped.map((g) => [g.kind, g._count]));
    expect(post.amenCount).toBe(actual["AMEN"] ?? 0);
    expect(post.loveCount).toBe(actual["LOVE"] ?? 0);
    expect(post.encouragedCount).toBe(actual["ENCOURAGED"] ?? 0);
    expect(await db.reaction.count({ where: { postId, userId: hurried.actor.userId } })).toBeLessThanOrEqual(1);
  });

  it("notifications regroupées : « 5 personnes ont réagi » = un seul groupe, acteurs distincts", async () => {
    const author = await createTestUser();
    const postId = await postAs(author.actor);
    const members = await Promise.all(Array.from({ length: 5 }, () => createTestUser()));
    for (const m of members) await react(m.actor, { target: "post", targetId: postId, kind: "AMEN" });
    await react(members[0]!.actor, { target: "post", targetId: postId, kind: "LOVE" });
    const { items } = await notificationsFor(author.actor, undefined);
    expect(items).toHaveLength(1);
    expect(items[0]?.actorCount).toBe(5);
    expect(await unreadCountFor(author.actor)).toBe(1);
  });
});

describe("fils et performance", () => {
  it("pagination par curseur : 15 par page, sans doublon ni trou", async () => {
    const author = await createTestUser({ createdAt: OLD_ACCOUNT });
    const reader = await createTestUser();
    const created: string[] = [];
    for (let i = 0; i < 32; i += 1) created.push(await postAs(author.actor, `[Test] ${i}`));
    const seen: string[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await feedPage(reader.actor, "discover", cursor);
      expect(page.items.length).toBeLessThanOrEqual(15);
      seen.push(...page.items.map((p) => p.id));
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    expect(seen).toHaveLength(32);
    expect(new Set(seen).size).toBe(32);
    expect(new Set(seen)).toEqual(new Set(created));
  });

  it("fil Abonnements : publications des personnes suivies et les siennes, par ordre chronologique", async () => {
    const reader = await createTestUser();
    const followed = await createTestUser();
    const stranger = await createTestUser();
    const p1 = await postAs(followed.actor);
    await postAs(stranger.actor);
    const p2 = await postAs(reader.actor);
    await follow(reader.actor, { userId: followed.actor.userId, active: true });
    expect((await feedPage(reader.actor, "following", undefined)).items.map((p) => p.id)).toEqual([p2, p1]);
  });

  it("nombre de requêtes SQL constant par page de fil (aucun N+1)", async () => {
    const reader = await createTestUser();
    const author = await createTestUser({ createdAt: OLD_ACCOUNT });
    const spy = vi.spyOn(pg.Client.prototype, "query");
    async function countFor(): Promise<number> {
      spy.mockClear();
      const page = await feedPage(reader.actor, "discover", undefined);
      await quotedPassages(page.items.map((p) => p.verse));
      return spy.mock.calls.length;
    }
    const verse = { bookId: "JHN", chapter: 3, verseStart: 16, verseEnd: 16 };
    await createPost(author.actor, { type: "TEXT", body: "[Test] @x Jean 3:16", verse, images: [] });
    const small = await countFor();
    for (let i = 0; i < 14; i += 1) {
      const { id } = await createPost(author.actor, { type: "TEXT", body: `[Test] ${i}`, verse: { ...verse, verseStart: 1 + i, verseEnd: 1 + i }, images: [] });
      await react(reader.actor, { target: "post", targetId: id, kind: "AMEN" });
      await commentAs(reader.actor, id);
    }
    const large = await countFor();
    spy.mockRestore();
    expect(large).toBe(small);
    // Fil (1) + versets cités (1) + traduction et catalogue bibliques : servis par le cache de données en production,
    // lus en base ici car next/cache est transparent hors de Next.js.
    expect(large).toBeLessThanOrEqual(6);
  });
});

describe("profil", () => {
  it("handle unique insensible à la casse, réservé refusé", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const base = { displayName: "Test", bio: "", churchName: "", churchVisibility: "PRIVATE", city: "", locationVisibility: "PRIVATE", country: "", countryVisibility: "PRIVATE", denomination: "", denominationVisibility: "PRIVATE", isDiscoverable: true } as const;
    await editProfile(a.actor, { ...base, handle: "frere_paul" });
    await expect(editProfile(b.actor, { ...base, handle: "frere_paul" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(editProfile(b.actor, { ...base, handle: "admin" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("un mineur ne peut pas rendre sa ville publique", async () => {
    const minor = await createTestUser({ birthYear: new Date().getUTCFullYear() - 14 });
    const handle = (await db.profile.findUniqueOrThrow({ where: { userId: minor.actor.userId } })).handle;
    await editProfile(minor.actor, { displayName: "J", handle, bio: "", churchName: "", churchVisibility: "PRIVATE", city: "Bobo", locationVisibility: "PUBLIC", country: "BF", countryVisibility: "PUBLIC", denomination: "", denominationVisibility: "PRIVATE", isDiscoverable: false });
    const row = await db.profile.findUniqueOrThrow({ where: { userId: minor.actor.userId } });
    expect(row.locationVisibility).toBe("PRIVATE");
    expect(row.countryVisibility).toBe("PRIVATE");
  });
});
