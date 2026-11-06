import { beforeEach, describe, expect, it } from "vitest";
import { notificationsFor, unreadCountFor } from "@/features/notifications";
import { bookmarkedPosts, feedPage, getPost, getProfile, postComments, profilePosts, relationList, searchPeople } from "@/features/social";
import { createComment } from "@/features/social/server/comments";
import { createPost, toggleBookmark } from "@/features/social/server/posts";
import { searchMentions } from "@/features/social/server/profiles";
import { react } from "@/features/social/server/reactions";
import { block, follow, mute } from "@/features/social/server/relations";
import { canViewAsset } from "@/features/social";
import { db } from "@/server/db";
import { createTestUser } from "../factories/db-users";
import { commentAs, postAs } from "../factories/social";
import { resetDatabase } from "../support/db";

beforeEach(async () => {
  await resetDatabase();
});

async function handleOf(userId: string): Promise<string> {
  const profile = await db.profile.findUniqueOrThrow({ where: { userId }, select: { handle: true } });
  return profile.handle;
}

const ids = (page: { items: { id: string }[] }) => page.items.map((item) => item.id);

/**
 * US-14 : « un utilisateur bloqué ne voit plus rien et n'est pas notifié ».
 * Chaque surface est testée dans les deux sens : A bloque B, puis on vérifie ce que voit B ET ce que voit A.
 */
describe("blocage — chaque surface, dans les deux sens", () => {
  async function blockedPair() {
    const a = await createTestUser();
    const b = await createTestUser();
    const postA = await postAs(a.actor, "[Test] publication de A");
    const postB = await postAs(b.actor, "[Test] publication de B");
    await block(a.actor, { userId: b.actor.userId, active: true });
    return { a, b, postA, postB };
  }

  it("fil Découvrir : aucun des deux ne voit les publications de l'autre", async () => {
    const { a, b, postA, postB } = await blockedPair();
    expect(ids(await feedPage(b.actor, "discover", undefined))).not.toContain(postA);
    expect(ids(await feedPage(a.actor, "discover", undefined))).not.toContain(postB);
  });

  it("fil Abonnements : le blocage retire l'abonnement dans les deux sens", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    await follow(a.actor, { userId: b.actor.userId, active: true });
    await follow(b.actor, { userId: a.actor.userId, active: true });
    const postA = await postAs(a.actor);
    const postB = await postAs(b.actor);
    expect(ids(await feedPage(b.actor, "following", undefined))).toContain(postA);
    await block(a.actor, { userId: b.actor.userId, active: true });
    expect(await db.follow.count()).toBe(0);
    expect(ids(await feedPage(b.actor, "following", undefined))).not.toContain(postA);
    expect(ids(await feedPage(a.actor, "following", undefined))).not.toContain(postB);
  });

  it("profil : 404 (null) dans les deux sens, y compris pour la liste de publications", async () => {
    const { a, b } = await blockedPair();
    expect(await getProfile(b.actor, await handleOf(a.actor.userId))).toBeNull();
    expect(await getProfile(a.actor, await handleOf(b.actor.userId))).toBeNull();
    expect(await profilePosts(b.actor, a.actor.userId, undefined)).toBeNull();
    expect(await relationList(b.actor, a.actor.userId, "followers", undefined)).toBeNull();
  });

  it("publication par URL directe : introuvable dans les deux sens", async () => {
    const { a, b, postA, postB } = await blockedPair();
    expect(await getPost(b.actor, postA)).toBeNull();
    expect(await getPost(a.actor, postB)).toBeNull();
    expect(await postComments(b.actor, postA, undefined)).toBeNull();
  });

  it("commentaire et réaction : refus NOT_FOUND pour le bloqué comme pour celui qui bloque", async () => {
    const { a, b, postA, postB } = await blockedPair();
    await expect(createComment(b.actor, { postId: postA, parentId: null, body: "[Test] x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(react(b.actor, { target: "post", targetId: postA, kind: "AMEN" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(createComment(a.actor, { postId: postB, parentId: null, body: "[Test] x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(react(a.actor, { target: "post", targetId: postB, kind: "LOVE" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("commentaires existants : masqués entre les deux personnes, visibles des autres", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const c = await createTestUser();
    const postC = await postAs(c.actor);
    const commentB = await commentAs(b.actor, postC);
    await block(a.actor, { userId: b.actor.userId, active: true });
    expect((await postComments(a.actor, postC, undefined))?.items.map((x) => x.id)).not.toContain(commentB);
    expect((await postComments(c.actor, postC, undefined))?.items.map((x) => x.id)).toContain(commentB);
    await expect(react(a.actor, { target: "comment", targetId: commentB, kind: "AMEN" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(createComment(a.actor, { postId: postC, parentId: commentB, body: "[Test] réponse" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("suivre : impossible dans les deux sens", async () => {
    const { a, b } = await blockedPair();
    await expect(follow(b.actor, { userId: a.actor.userId, active: true })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(follow(a.actor, { userId: b.actor.userId, active: true })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("mention : ni autocomplétion ni mention résolue, aucune notification", async () => {
    const { a, b } = await blockedPair();
    const handleA = await handleOf(a.actor.userId);
    expect(await searchMentions(b.actor, { query: handleA.slice(0, 6) })).toEqual([]);
    const postId = await postAs(b.actor, `[Test] bonjour @${handleA}`);
    expect(await db.mention.count({ where: { postId } })).toBe(0);
    expect(await unreadCountFor(a.actor)).toBe(0);
  });

  it("notifications : rien de la personne bloquée, même un événement antérieur au blocage", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const postA = await postAs(a.actor);
    await react(b.actor, { target: "post", targetId: postA, kind: "AMEN" });
    await follow(b.actor, { userId: a.actor.userId, active: true });
    expect(await unreadCountFor(a.actor)).toBe(2);
    await block(a.actor, { userId: b.actor.userId, active: true });
    expect(await unreadCountFor(a.actor)).toBe(0);
    expect((await notificationsFor(a.actor, undefined)).items).toEqual([]);
    expect(await unreadCountFor(b.actor)).toBe(0);
  });

  it("le bloqué n'est jamais notifié du blocage", async () => {
    const { b } = await blockedPair();
    expect(await unreadCountFor(b.actor)).toBe(0);
    expect(await db.notification.count({ where: { recipientId: b.actor.userId } })).toBe(0);
  });

  it("favoris : une publication enregistrée disparaît après un blocage, et ne peut plus être ajoutée", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const postA = await postAs(a.actor);
    await toggleBookmark(b.actor, { postId: postA, saved: true });
    expect(ids(await bookmarkedPosts(b.actor, undefined))).toEqual([postA]);
    await block(a.actor, { userId: b.actor.userId, active: true });
    expect(ids(await bookmarkedPosts(b.actor, undefined))).toEqual([]);
    await expect(toggleBookmark(b.actor, { postId: postA, saved: true })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("recherche de profils : absent dans les deux sens", async () => {
    const { a, b } = await blockedPair();
    await db.profile.update({ where: { userId: a.actor.userId }, data: { displayName: "Ruth Bloquante" } });
    await db.profile.update({ where: { userId: b.actor.userId }, data: { displayName: "Ruth Bloquee" } });
    const c = await createTestUser();
    expect((await searchPeople(c.actor, "Ruth", undefined)).items).toHaveLength(2);
    expect((await searchPeople(b.actor, "Ruth", undefined)).items.map((p) => p.userId)).not.toContain(a.actor.userId);
    expect((await searchPeople(a.actor, "Ruth", undefined)).items.map((p) => p.userId)).not.toContain(b.actor.userId);
  });

  it("images : une image de publication n'est pas servie à la personne bloquée", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const asset = await db.mediaAsset.create({
      data: { ownerId: a.actor.userId, purpose: "POST_IMAGE", bucket: "t", key: `k_${a.actor.userId}`, mime: "image/jpeg", size: 10, status: "READY", width: 10, height: 10 },
    });
    const { id: postId } = await createPost(a.actor, { type: "TEXT", body: "[Test]", verse: null, images: [{ assetId: asset.id, altText: "" }] });
    expect(postId).toBeTruthy();
    expect(await canViewAsset(b.actor.userId, asset.id)).toBe(true);
    await block(b.actor, { userId: a.actor.userId, active: true });
    expect(await canViewAsset(b.actor.userId, asset.id)).toBe(false);
  });

  it("débloquer rétablit la visibilité, sans recréer d'abonnement", async () => {
    const { a, b, postA } = await blockedPair();
    await block(a.actor, { userId: b.actor.userId, active: false });
    expect(await getPost(b.actor, postA)).not.toBeNull();
    expect(await db.follow.count()).toBe(0);
  });
});

describe("sourdine", () => {
  it("retire des fils et des notifications du membre qui la pose, sans rien changer pour l'autre", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    const postB = await postAs(b.actor);
    const postA = await postAs(a.actor);
    await mute(a.actor, { userId: b.actor.userId, active: true });
    expect(ids(await feedPage(a.actor, "discover", undefined))).not.toContain(postB);
    expect(await getPost(a.actor, postB)).not.toBeNull();
    await react(b.actor, { target: "post", targetId: postA, kind: "AMEN" });
    expect(await unreadCountFor(a.actor)).toBe(0);
    expect(ids(await feedPage(b.actor, "discover", undefined))).toContain(postA);
  });
});

describe("découvrabilité et mineurs", () => {
  it("un profil non découvrable n'apparaît ni dans la recherche ni dans l'autocomplétion, sauf s'il suit l'auteur", async () => {
    const minor = await createTestUser({ birthYear: new Date().getUTCFullYear() - 15, discoverable: false });
    const adult = await createTestUser();
    const handle = await handleOf(minor.actor.userId);
    await db.profile.update({ where: { userId: minor.actor.userId }, data: { displayName: "Junior Demo" } });
    expect((await searchPeople(adult.actor, "Junior", undefined)).items).toEqual([]);
    expect(await searchMentions(adult.actor, { query: handle.slice(0, 8) })).toEqual([]);
    await follow(minor.actor, { userId: adult.actor.userId, active: true });
    expect((await searchMentions(adult.actor, { query: handle.slice(0, 8) })).map((s) => s.handle)).toContain(handle);
  });

  it("ville et pays d'un mineur ne sont jamais montrés à autrui, même réglés « public »", async () => {
    const minor = await createTestUser({ birthYear: new Date().getUTCFullYear() - 15 });
    await db.profile.update({ where: { userId: minor.actor.userId }, data: { city: "Ouagadougou", locationVisibility: "PUBLIC", churchName: "[Test] Église", churchVisibility: "PUBLIC" } });
    const other = await createTestUser();
    const view = await getProfile(other.actor, await handleOf(minor.actor.userId));
    expect(view?.fields.city).toBeUndefined();
    expect(view?.fields.church?.value).toBe("[Test] Église");
  });
});
