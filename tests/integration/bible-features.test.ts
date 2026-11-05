import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  addNote,
  deleteNote,
  editNote,
  recordReadingPosition,
  removeBookmark,
  removeHighlight,
  setHighlight,
  toggleBookmark,
  updateReaderPrefs,
} from "@/features/bible/server/annotations";
import { activateVersionOptions, scheduleDailyVerseOptions, deleteDailyVerseOptions, setPublishedOptions } from "@/features/bible/server/admin-options";
import { ensureAutomaticDailyVerse, isoDay, resolveDailyVerse, utcDay } from "@/features/bible/server/daily-verse";
import {
  findCatalog,
  findChapterAnnotations,
  findPublishedTranslation,
  findReadingState,
  findSimilarBookIds,
  listBookmarks,
  listHighlights,
  listNotes,
} from "@/features/bible/server/repository";
import { searchBible } from "@/features/bible/server/search";
import type { CatalogBook, TranslationInfo } from "@/features/bible/types";
import { runAdminAction, type AdminSessionInfo } from "@/server/actions/admin-action-core";
import { db } from "@/server/db";
import type { Actor } from "@/server/policies";
import { ensureSampleBible } from "../../scripts/bible/ensure-sample";
import { createImportClient } from "../../scripts/bible/repository";
import { NO_REQUEST, createTestUser } from "../factories/db-users";
import { resetDatabase } from "../support/db";
import { testOwnerUrl } from "../support/integration-env";

const owner = createImportClient(testOwnerUrl());
let translation: TranslationInfo;
let books: CatalogBook[];

beforeAll(async () => {
  await ensureSampleBible(owner);
  const found = await findPublishedTranslation("lsg");
  if (!found) throw new Error("LSG non publiée dans eparole_test");
  translation = found;
  books = await findCatalog(found.versionId);
});

afterAll(async () => {
  await owner.$disconnect();
});

beforeEach(async () => {
  await resetDatabase();
});

const JOHN_3_16 = { bookId: "JHN", chapter: 3 };
const range = (verseStart: number, verseEnd = verseStart) => ({ verseStart, verseEnd });
const search = (query: string, extra: { testament?: "OT" | "NT"; bookId?: string; cursor?: string } = {}) => searchBible(translation, books, { query, ...extra });
const plain = (segments: readonly { text: string }[]): string => segments.map((segment) => segment.text).join("");

describe("recherche plein texte", () => {
  it("« grace » sans accent trouve « grâce »", async () => {
    const page = await search("grace");
    expect(page.total).toBeGreaterThan(0);
    expect(page.hits.some((hit) => hit.segments.some((s) => s.match && /gr[aâ]ce/i.test(s.text)))).toBe(true);
  });

  it("la casse et les accents de la requête n'ont pas d'effet", async () => {
    const [a, b] = await Promise.all([search("grâce"), search("GRACE")]);
    expect(a.total).toBe(b.total);
  });

  it("cherche une expression exacte entre guillemets", async () => {
    const page = await search('"bon berger"');
    expect(page.hits.map((hit) => hit.reference)).toContain("Jean 10:11");
    expect(page.hits.length).toBeGreaterThan(0);
    for (const hit of page.hits) expect(plain(hit.segments)).toMatch(/bons? bergers?/i);
  });

  it("une expression dans le désordre ne correspond pas", async () => {
    const page = await search('"berger bon"');
    expect(page.hits.map((hit) => hit.reference)).not.toContain("Jean 10:11");
  });

  it("exclut un mot avec le signe moins", async () => {
    const page = await search("berger -bon");
    expect(page.hits.length).toBeGreaterThan(0);
    for (const hit of page.hits) expect(plain(hit.segments)).not.toMatch(/\bbon\b/i);
  });

  it("filtre par testament et par livre", async () => {
    const nt = await search("Dieu", { testament: "NT" });
    expect(nt.hits.length).toBeGreaterThan(0);
    expect(nt.facets.every((facet) => books.find((book) => book.id === facet.bookId)?.testament === "NT")).toBe(true);
    const john = await search("Dieu", { bookId: "JHN" });
    expect(john.hits.every((hit) => hit.bookId === "JHN")).toBe(true);
    expect(john.total).toBe(john.facets.find((facet) => facet.bookId === "JHN")?.count);
  });

  it("calcule des facettes cohérentes avec le total", async () => {
    const page = await search("Dieu");
    expect(page.facets.reduce((sum, facet) => sum + facet.count, 0)).toBe(page.total);
    expect(page.facets.length).toBeGreaterThan(1);
  });

  it("parcourt toutes les pages par curseur sans doublon ni trou", async () => {
    const seen = new Set<number>();
    let cursor: string | undefined;
    let total = 0;
    let pages = 0;
    do {
      const page = await search("Dieu", { bookId: "JHN", ...(cursor ? { cursor } : {}) });
      total = page.total;
      for (const hit of page.hits) {
        expect(seen.has(hit.id)).toBe(false);
        seen.add(hit.id);
      }
      cursor = page.nextCursor ?? undefined;
      pages += 1;
    } while (cursor && pages < 50);
    expect(pages).toBeGreaterThan(1);
    expect(seen.size).toBe(total);
  });

  it("un curseur forgé revient à la première page", async () => {
    const [first, forged] = await Promise.all([search("Dieu"), search("Dieu", { cursor: "pas-un-curseur" })]);
    expect(forged.hits[0]?.id).toBe(first.hits[0]?.id);
  });

  it("signale des mots trop courants et une absence de résultat", async () => {
    expect((await search("le de la")).tooCommon).toBe(true);
    const none = await search("xyzzyqwerty");
    expect(none.total).toBe(0);
    expect(none.tooCommon).toBe(false);
  });

  it("un curseur hors limites des types PostgreSQL revient à la première page", async () => {
    const [first, huge] = await Promise.all([search("Dieu"), search("Dieu", { cursor: Buffer.from("1e999:1").toString("base64url") })]);
    expect(huge.hits[0]?.id).toBe(first.hits[0]?.id);
  });

  it("traite une saisie hostile comme du texte", async () => {
    for (const query of ["'; DROP TABLE bible_verse; --", "<script>alert(1)</script>", '"""', "& | ! ( ) :*"]) {
      await expect(search(query)).resolves.toBeDefined();
    }
    expect((await search("Dieu")).total).toBeGreaterThan(0);
  });

  it("propose des livres proches par trigrammes, sans tenir compte des accents", async () => {
    expect(await findSimilarBookIds("Genese", 3)).toContain("GEN");
    expect(await findSimilarBookIds("Romins", 3)).toContain("ROM");
  });
});

describe("surlignages, favoris et état de lecture", () => {
  const scopeOf = (actor: Actor) => ({ userId: actor.userId, translationId: translation.id, ...JOHN_3_16 });

  it("surligne, découpe et retire", async () => {
    const { actor } = await createTestUser();
    await setHighlight(actor, { ...JOHN_3_16, ranges: [range(14, 18)], color: "YELLOW" });
    await setHighlight(actor, { ...JOHN_3_16, ranges: [range(16)], color: "BLUE" });
    const { highlights } = await findChapterAnnotations(scopeOf(actor));
    expect(highlights.map(({ verseStart, verseEnd, color }) => [verseStart, verseEnd, color])).toEqual([
      [14, 15, "YELLOW"],
      [16, 16, "BLUE"],
      [17, 18, "YELLOW"],
    ]);
    await setHighlight(actor, { ...JOHN_3_16, ranges: [range(14, 18)], color: null });
    expect((await findChapterAnnotations(scopeOf(actor))).highlights).toEqual([]);
  });

  it("le surlignage d'un utilisateur n'affecte pas celui d'un autre", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    await setHighlight(a.actor, { ...JOHN_3_16, ranges: [range(16)], color: "GREEN" });
    await setHighlight(b.actor, { ...JOHN_3_16, ranges: [range(16)], color: null });
    expect((await findChapterAnnotations(scopeOf(a.actor))).highlights).toHaveLength(1);
    expect((await findChapterAnnotations(scopeOf(b.actor))).highlights).toHaveLength(0);
  });

  it("le favori bascule", async () => {
    const { actor } = await createTestUser();
    expect(await toggleBookmark(actor, { ...JOHN_3_16, ranges: [range(16)] })).toEqual({ added: true });
    expect((await findChapterAnnotations(scopeOf(actor))).bookmarks).toHaveLength(1);
    expect(await toggleBookmark(actor, { ...JOHN_3_16, ranges: [range(16)] })).toEqual({ added: false });
    expect((await findChapterAnnotations(scopeOf(actor))).bookmarks).toHaveLength(0);
  });

  it("deux écritures simultanées sur un chapitre ne perdent aucun surlignage", async () => {
    const { actor } = await createTestUser();
    await Promise.all([1, 3, 5, 7, 9].map((verse) => setHighlight(actor, { ...JOHN_3_16, ranges: [range(verse)], color: "GREEN" })));
    const { highlights } = await findChapterAnnotations(scopeOf(actor));
    expect(highlights.map((mark) => mark.verseStart)).toEqual([1, 3, 5, 7, 9]);
  });

  it("un geste ne recrée pas les surlignages qu'il ne touche pas", async () => {
    const { actor } = await createTestUser();
    await setHighlight(actor, { ...JOHN_3_16, ranges: [range(1)], color: "GREEN" });
    const [before] = (await findChapterAnnotations(scopeOf(actor))).highlights;
    await setHighlight(actor, { ...JOHN_3_16, ranges: [range(9)], color: "BLUE" });
    expect((await findChapterAnnotations(scopeOf(actor))).highlights.map((mark) => mark.id)).toContain(before?.id);
  });

  it("le favori raisonne par verset : retirer le verset 2 d'une plage 1-3 la découpe", async () => {
    const { actor } = await createTestUser();
    await toggleBookmark(actor, { ...JOHN_3_16, ranges: [range(1, 3)] });
    expect(await toggleBookmark(actor, { ...JOHN_3_16, ranges: [range(2)] })).toEqual({ added: false });
    const { bookmarks } = await findChapterAnnotations(scopeOf(actor));
    expect(bookmarks.map(({ verseStart, verseEnd }) => [verseStart, verseEnd])).toEqual([
      [1, 1],
      [3, 3],
    ]);
  });

  it("refuse des coordonnées qui n'existent pas dans le texte", async () => {
    const { actor } = await createTestUser();
    await expect(setHighlight(actor, { ...JOHN_3_16, ranges: [range(99)], color: "PINK" })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(setHighlight(actor, { bookId: "JHN", chapter: 99, ranges: [range(1)], color: "PINK" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(recordReadingPosition(actor, { bookId: "JHN", chapter: 99 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuse toute écriture à un email non vérifié et à un compte suspendu", async () => {
    const { actor } = await createTestUser();
    const unverified: Actor = { ...actor, emailVerified: false };
    const suspended: Actor = { ...actor, status: "SUSPENDED" };
    const note = { ...JOHN_3_16, range: range(16), body: "texte" };
    await expect(setHighlight(unverified, { ...JOHN_3_16, ranges: [range(16)], color: "PINK" })).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    await expect(toggleBookmark(unverified, { ...JOHN_3_16, ranges: [range(16)] })).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    await expect(addNote(unverified, note)).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    await expect(recordReadingPosition(unverified, JOHN_3_16)).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    await expect(addNote(suspended, note)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("la seule position de lecture ne vaut pas choix de réglages", async () => {
    const { actor } = await createTestUser();
    await recordReadingPosition(actor, JOHN_3_16);
    expect((await findReadingState(actor.userId))?.prefsSetAt).toBeNull();
    await updateReaderPrefs(actor, { fontSize: 24, lineHeight: 1.9, theme: "SEPIA", font: "SANS", showVerseNumbers: false });
    expect((await findReadingState(actor.userId))?.prefsSetAt).toBeInstanceOf(Date);
  });

  it("enregistre position et réglages dans le même état", async () => {
    const { actor } = await createTestUser();
    await recordReadingPosition(actor, JOHN_3_16);
    await updateReaderPrefs(actor, { fontSize: 24, lineHeight: 1.9, theme: "SEPIA", font: "SANS", showVerseNumbers: false });
    expect(await findReadingState(actor.userId)).toMatchObject({ bookId: "JHN", chapter: 3, fontSize: 24, theme: "SEPIA", font: "SANS", showVerseNumbers: false });
  });
});

describe("notes bibliques : strictement privées", () => {
  const SECRET = "Confidence personnelle sur ma vie de prière";

  async function noteOf(actor: Actor) {
    return addNote(actor, { ...JOHN_3_16, range: range(16), body: SECRET });
  }

  it("un autre utilisateur ne lit pas la note", async () => {
    const author = await createTestUser();
    const other = await createTestUser();
    await noteOf(author.actor);
    expect(await listNotes(other.user.id, undefined, 20)).toEqual([]);
    const scope = { userId: other.user.id, translationId: translation.id, ...JOHN_3_16 };
    expect((await findChapterAnnotations(scope)).notes).toEqual([]);
    expect((await listNotes(author.user.id, undefined, 20)).map((note) => note.body)).toEqual([SECRET]);
  });

  it("un autre utilisateur ne modifie ni ne supprime la note : 404, pas 403", async () => {
    const author = await createTestUser();
    const other = await createTestUser();
    const { id } = await noteOf(author.actor);
    await expect(editNote(other.actor, { id, body: "piraté" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteNote(other.actor, { id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await listNotes(author.user.id, undefined, 20))[0]?.body).toBe(SECRET);
  });

  it("une note absente et la note d'autrui répondent à l'identique", async () => {
    const author = await createTestUser();
    const other = await createTestUser();
    const { id } = await noteOf(author.actor);
    const foreign = await editNote(other.actor, { id, body: "x" }).catch((error: unknown) => error);
    const missing = await editNote(other.actor, { id: "inexistante", body: "x" }).catch((error: unknown) => error);
    expect(foreign).toEqual(missing);
  });

  it.each(["SUPER_ADMIN", "ADMIN", "MODERATOR", "CONTENT_EDITOR"] as const)("%s n'a aucun accès à la note d'un membre", async (role) => {
    const author = await createTestUser();
    const staff = await createTestUser({ roles: [role] });
    const { id } = await noteOf(author.actor);
    expect(await listNotes(staff.user.id, undefined, 20)).toEqual([]);
    await expect(editNote(staff.actor, { id, body: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteNote(staff.actor, { id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("le même isolement vaut pour surlignages et favoris", async () => {
    const author = await createTestUser();
    const other = await createTestUser();
    await setHighlight(author.actor, { ...JOHN_3_16, ranges: [range(16)], color: "YELLOW" });
    await toggleBookmark(author.actor, { ...JOHN_3_16, ranges: [range(16)] });
    const [highlight] = await listHighlights(author.user.id, undefined, 20);
    const [bookmark] = await listBookmarks(author.user.id, undefined, 20);
    await expect(removeHighlight(other.actor, { id: highlight!.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(removeBookmark(other.actor, { id: bookmark!.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await removeHighlight(author.actor, { id: highlight!.id });
    await removeBookmark(author.actor, { id: bookmark!.id });
    expect(await listHighlights(author.user.id, undefined, 20)).toEqual([]);
  });

  it("l'auteur modifie et supprime sa note", async () => {
    const { actor, user } = await createTestUser();
    const { id } = await noteOf(actor);
    await editNote(actor, { id, body: "Nouvelle réflexion" });
    expect((await listNotes(user.id, undefined, 20))[0]?.body).toBe("Nouvelle réflexion");
    await deleteNote(actor, { id });
    expect(await listNotes(user.id, undefined, 20)).toEqual([]);
  });

  it("aucune note n'apparaît dans le journal d'audit", async () => {
    const { actor } = await createTestUser();
    const { id } = await noteOf(actor);
    await editNote(actor, { id, body: SECRET });
    const entries = await db.auditLog.findMany();
    expect(JSON.stringify(entries)).not.toContain(SECRET);
  });

  it("la pagination par curseur reste limitée au propriétaire", async () => {
    const author = await createTestUser();
    const other = await createTestUser();
    const { id } = await noteOf(author.actor);
    await addNote(other.actor, { ...JOHN_3_16, range: range(17), body: "autre" });
    expect((await listNotes(other.user.id, undefined, 20)).map((note) => note.body)).toEqual(["autre"]);
    expect((await listNotes(other.user.id, id, 20)).map((note) => note.body)).not.toContain(SECRET);
  });
});

function adminSession(actor: Actor, reauthenticatedAt: Date | null = null, sessionId = "session"): AdminSessionInfo {
  return { sessionId, reauthenticatedAt, actor };
}

describe("verset du jour", () => {
  const inDays = (days: number): string => isoDay(new Date(utcDay(new Date()).getTime() + days * 86_400_000));
  const schedule = (actor: Actor, input: Record<string, unknown>) => runAdminAction(scheduleDailyVerseOptions(), adminSession(actor), input, NO_REQUEST);

  it("un éditeur programme un verset, avec audit dans la même transaction", async () => {
    const { actor } = await createTestUser({ roles: ["CONTENT_EDITOR"] });
    await schedule(actor, { date: inDays(3), reference: "Jean 3:16", reflection: "Pour méditer." });
    const row = await db.dailyVerse.findFirstOrThrow();
    expect(row).toMatchObject({ bookId: "JHN", chapter: 3, verseStart: 16, verseEnd: 16, reflection: "Pour méditer.", isAutomatic: false, scheduledById: actor.userId });
    const audit = await db.auditLog.findFirstOrThrow({ where: { action: "daily_verse.scheduled" } });
    expect(audit.targetId).toBe(row.id);
    expect(JSON.stringify(audit.metadata)).not.toContain("méditer");
  });

  it.each([[[]], [["MODERATOR"]]] as const)("refuse la programmation aux rôles %j", async (roles) => {
    const { actor } = await createTestUser({ roles: [...roles] });
    await expect(schedule(actor, { date: inDays(1), reference: "Jean 3:16" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.dailyVerse.count()).toBe(0);
  });

  it("alerte sur un doublon à moins de 30 jours, puis accepte la confirmation", async () => {
    const { actor } = await createTestUser({ roles: ["CONTENT_EDITOR"] });
    await schedule(actor, { date: inDays(1), reference: "Jean 3:16" });
    await expect(schedule(actor, { date: inDays(10), reference: "Jean 3:16" })).rejects.toMatchObject({
      code: "CONFLICT",
      fieldErrors: { reference: [inDays(1)] },
    });
    expect(await db.dailyVerse.count()).toBe(1);
    await schedule(actor, { date: inDays(10), reference: "Jean 3:16", acknowledgeDuplicate: true });
    expect(await db.dailyVerse.count()).toBe(2);
  });

  it("reprogrammer un même jour avec le même verset n'est pas un doublon, et un doublon futur est détecté", async () => {
    const { actor } = await createTestUser({ roles: ["CONTENT_EDITOR"] });
    await schedule(actor, { date: inDays(5), reference: "Jean 3:16" });
    await expect(schedule(actor, { date: inDays(5), reference: "Jean 3:16", reflection: "Corrigé." })).resolves.toBeDefined();
    await expect(schedule(actor, { date: inDays(1), reference: "Jean 3:16" })).rejects.toMatchObject({ code: "CONFLICT", fieldErrors: { reference: [inDays(5)] } });
  });

  it("une plage qui chevauche compte comme doublon, un autre verset non", async () => {
    const { actor } = await createTestUser({ roles: ["CONTENT_EDITOR"] });
    await schedule(actor, { date: inDays(1), reference: "Jean 3:16" });
    await expect(schedule(actor, { date: inDays(2), reference: "Jean 3:15-17" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(schedule(actor, { date: inDays(2), reference: "Jean 3:17" })).resolves.toBeDefined();
  });

  it("refuse une date passée ou au-delà de 90 jours, et accepte 90 jours", async () => {
    const { actor } = await createTestUser({ roles: ["CONTENT_EDITOR"] });
    await expect(schedule(actor, { date: inDays(-1), reference: "Jean 3:16" })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(schedule(actor, { date: inDays(91), reference: "Jean 3:16" })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(schedule(actor, { date: inDays(90), reference: "Jean 3:16" })).resolves.toEqual({ date: inDays(90) });
  });

  it("refuse une référence sans verset, ou hors du texte", async () => {
    const { actor } = await createTestUser({ roles: ["CONTENT_EDITOR"] });
    for (const reference of ["Jean 3", "Jean 3:99", "Bonjour"]) {
      await expect(schedule(actor, { date: inDays(1), reference })).rejects.toMatchObject({ code: "VALIDATION" });
    }
  });

  it("reprogrammer un jour remplace et audite une mise à jour, supprimer aussi", async () => {
    const { actor } = await createTestUser({ roles: ["CONTENT_EDITOR"] });
    await schedule(actor, { date: inDays(1), reference: "Jean 3:16" });
    await schedule(actor, { date: inDays(1), reference: "Jean 3:17" });
    expect(await db.dailyVerse.count()).toBe(1);
    expect(await db.auditLog.count({ where: { action: "daily_verse.updated" } })).toBe(1);
    await runAdminAction(deleteDailyVerseOptions(), adminSession(actor), { date: inDays(1) }, NO_REQUEST);
    expect(await db.dailyVerse.count()).toBe(0);
    expect(await db.auditLog.count({ where: { action: "daily_verse.deleted" } })).toBe(1);
  });

  it("un jour passé ne se supprime pas", async () => {
    const { actor } = await createTestUser({ roles: ["CONTENT_EDITOR"] });
    await db.dailyVerse.create({ data: { date: new Date(`${inDays(-2)}T00:00:00Z`), translationId: translation.id, bookId: "JHN", chapter: 3, verseStart: 16, verseEnd: 16 } });
    await expect(runAdminAction(deleteDailyVerseOptions(), adminSession(actor), { date: inDays(-2) }, NO_REQUEST)).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await db.dailyVerse.count()).toBe(1);
  });

  it("la sélection automatique n'écrase jamais une programmation", async () => {
    const { actor } = await createTestUser({ roles: ["CONTENT_EDITOR"] });
    await schedule(actor, { date: inDays(0), reference: "Jean 3:16" });
    expect(await ensureAutomaticDailyVerse(new Date())).toBe(false);
    expect((await db.dailyVerse.findFirstOrThrow()).isAutomatic).toBe(false);
  });

  it("un jour non programmé reçoit une sélection automatique, consignée une seule fois", async () => {
    const preview = await resolveDailyVerse(utcDay(new Date()));
    expect(preview?.isAutomatic).toBe(true);
    expect(await db.dailyVerse.count()).toBe(0);
    expect(await ensureAutomaticDailyVerse(new Date())).toBe(true);
    expect(await ensureAutomaticDailyVerse(new Date())).toBe(false);
    const row = await db.dailyVerse.findFirstOrThrow();
    expect(row).toMatchObject({ isAutomatic: true, scheduledById: null });
    expect({ bookId: row.bookId, chapter: row.chapter, verseStart: row.verseStart }).toMatchObject({
      bookId: preview?.ref.bookId,
      chapter: preview?.ref.chapter,
      verseStart: preview?.ref.verseStart,
    });
  });
});

describe("administration des traductions", () => {
  const FRESH = new Date();

  it.each(["ADMIN", "CONTENT_EDITOR", "MODERATOR"] as const)("%s ne peut ni activer ni publier", async (role) => {
    const { actor } = await createTestUser({ roles: [role] });
    await expect(runAdminAction(activateVersionOptions(), adminSession(actor, FRESH), { versionId: translation.versionId }, NO_REQUEST)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      runAdminAction(setPublishedOptions(), adminSession(actor, FRESH), { translationId: translation.id, published: false }, NO_REQUEST),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await findPublishedTranslation("lsg")).not.toBeNull();
  });

  it("SUPER_ADMIN doit s'être ré-authentifié", async () => {
    const { actor } = await createTestUser({ roles: ["SUPER_ADMIN"] });
    await expect(runAdminAction(activateVersionOptions(), adminSession(actor, null), { versionId: translation.versionId }, NO_REQUEST)).rejects.toMatchObject({ code: "REAUTH_REQUIRED" });
    await expect(
      runAdminAction(setPublishedOptions(), adminSession(actor, null), { translationId: translation.id, published: false }, NO_REQUEST),
    ).rejects.toMatchObject({ code: "REAUTH_REQUIRED" });
  });

  it("une version déjà active n'est pas réactivable", async () => {
    const { actor } = await createTestUser({ roles: ["SUPER_ADMIN"] });
    await expect(runAdminAction(activateVersionOptions(), adminSession(actor, FRESH), { versionId: translation.versionId }, NO_REQUEST)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.auditLog.count({ where: { action: "bible.version.activated" } })).toBe(0);
  });

  it("dépublier puis republier est audité et passe par la seule fonction autorisée", async () => {
    const { actor } = await createTestUser({ roles: ["SUPER_ADMIN"] });
    const run = (published: boolean) => runAdminAction(setPublishedOptions(), adminSession(actor, FRESH), { translationId: translation.id, published }, NO_REQUEST);
    await run(false);
    expect(await findPublishedTranslation("lsg")).toBeNull();
    await run(true);
    expect(await findPublishedTranslation("lsg")).not.toBeNull();
    expect(await db.auditLog.count({ where: { action: { in: ["bible.translation.published", "bible.translation.unpublished"] } } })).toBe(2);
  });
});
