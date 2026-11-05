import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseSource } from "../../scripts/bible/lib/run-import";
import { activateVersion, createImportClient, stageVersion, verifyStoredVersion } from "../../scripts/bible/repository";
import { queryAsApp } from "../support/db";
import { testOwnerUrl } from "../support/integration-env";

const SAMPLE = "tests/fixtures/bible/lsg-sample.usfx.xml";
const CODE = "test-sample";
const TRANSLATION = {
  code: CODE,
  name: "Échantillon de test",
  language: "fr",
  licenseType: "PUBLIC_DOMAIN",
  licenseUrl: "https://exemple.test/licence",
  attribution: "Échantillon",
  sourceUrl: "https://exemple.test/source",
} as const;

const db = createImportClient(testOwnerUrl());

async function ownerQuery(sql: string): Promise<pg.QueryResult> {
  const client = new pg.Client({ connectionString: testOwnerUrl() });
  await client.connect();
  try {
    return await client.query(sql);
  } finally {
    await client.end();
  }
}

/** Le propriétaire (superutilisateur local) nettoie la traduction de test : aucun rôle applicatif ne le pourrait. */
async function removeSample(): Promise<void> {
  await ownerQuery(`
    UPDATE "bible_translation" SET "activeVersionId" = NULL WHERE "code" = '${CODE}';
    DELETE FROM "bible_verse" WHERE "versionId" IN (SELECT v.id FROM "bible_translation_version" v JOIN "bible_translation" t ON t.id = v."translationId" WHERE t."code" = '${CODE}');
    DELETE FROM "bible_chapter_meta" WHERE "versionId" IN (SELECT v.id FROM "bible_translation_version" v JOIN "bible_translation" t ON t.id = v."translationId" WHERE t."code" = '${CODE}');
    DELETE FROM "bible_translation_version" WHERE "translationId" IN (SELECT id FROM "bible_translation" WHERE "code" = '${CODE}');
    DELETE FROM "bible_translation" WHERE "code" = '${CODE}';`);
}

async function stage() {
  const parsed = await parseSource("ebible", SAMPLE, { partial: true });
  const { versionId } = await stageVersion(db, {
    translation: TRANSLATION,
    sourceProvider: parsed.provider.id,
    sourceSha256: parsed.sourceSha256,
    sourceRetrievedAt: new Date("2026-11-05T00:00:00Z"),
    licenseEvidence: "test",
    importedBy: "test",
    verses: parsed.verses,
    integrity: parsed.integrity,
    ignored: parsed.ignored,
  });
  return { versionId, parsed };
}

describe("import contrôlé", () => {
  let versionId: number;
  let verseCount: number;

  beforeAll(async () => {
    await removeSample();
    const staged = await stage();
    versionId = staged.versionId;
    verseCount = staged.parsed.verses.length;
  });

  afterAll(async () => {
    await removeSample();
    await db.$disconnect();
  });

  it("l'échantillon est intègre", async () => {
    const parsed = await parseSource("ebible", SAMPLE, { partial: true });
    expect(parsed.integrity.errors).toEqual([]);
    expect(parsed.verses.find((v) => v.book === "JHN" && v.chapter === 3 && v.verse === 16)?.text).toMatch(/^Car Dieu a tant aimé le monde/);
  });

  it("crée une version STAGED non visible, avec checksums vérifiés et audit", async () => {
    const version = await db.bibleTranslationVersion.findUniqueOrThrow({ where: { id: versionId }, include: { translation: true } });
    expect(version.status).toBe("STAGED");
    expect(version.verseCount).toBe(verseCount);
    expect(version.translation.isPublished).toBe(false);
    expect(version.translation.activeVersionId).toBeNull();

    const parsed = await parseSource("ebible", SAMPLE, { partial: true });
    expect(await verifyStoredVersion(db, versionId, parsed.verses)).toEqual({ verseCount, checksumMismatches: 0 });
    expect(await db.auditLog.count({ where: { action: "bible.import.staged", targetId: String(versionId) } })).toBe(1);
  });

  it("refuse d'importer deux fois le même texte", async () => {
    await expect(stage()).rejects.toThrow(/identique/);
  });

  it("une écriture interrompue ne laisse aucune version partielle", async () => {
    const before = await db.bibleTranslationVersion.count();
    const parsed = await parseSource("ebible", SAMPLE, { partial: true });
    const broken = [...parsed.verses, { book: "ZZZ", chapter: 1, verse: 1, text: "hors canon" }];
    await expect(
      stageVersion(db, {
        translation: TRANSLATION,
        sourceProvider: "test",
        sourceSha256: "0".repeat(64),
        sourceRetrievedAt: new Date(),
        licenseEvidence: "test",
        importedBy: "test",
        verses: broken,
        integrity: { ...parsed.integrity, checksum: "1".repeat(64) },
        ignored: {},
      }),
    ).rejects.toThrow();
    expect(await db.bibleTranslationVersion.count()).toBe(before);
  });

  it("active explicitement, une seule fois, et audite", async () => {
    await activateVersion(db, versionId, { publish: true, operator: "test" });
    const translation = await db.bibleTranslation.findUniqueOrThrow({ where: { code: CODE } });
    expect(translation.activeVersionId).toBe(versionId);
    expect(translation.isPublished).toBe(true);
    await expect(activateVersion(db, versionId, { publish: false, operator: "test" })).rejects.toThrow(/non activable/);
    expect(await db.auditLog.count({ where: { action: "bible.version.activated", targetId: String(versionId) } })).toBe(1);
  });
});

describe("immutabilité du texte biblique", () => {
  const REFERENCE_TABLES = ["bible_verse", "bible_translation_version", "bible_translation", "bible_book", "bible_book_name", "bible_chapter_meta", "daily_verse_pool"];

  it.each(REFERENCE_TABLES)("le rôle applicatif ne peut ni modifier, ni supprimer, ni vider %s", async (table) => {
    await expect(queryAsApp(`DELETE FROM "${table}"`)).rejects.toThrow(/permission denied/i);
    await expect(queryAsApp(`TRUNCATE "${table}" CASCADE`)).rejects.toThrow(/permission denied/i);
  });

  it("le rôle applicatif ne peut ni réécrire ni ajouter un verset", async () => {
    await expect(queryAsApp(`UPDATE "bible_verse" SET "text" = 'falsifié'`)).rejects.toThrow(/permission denied/i);
    await expect(
      queryAsApp(`INSERT INTO "bible_verse" ("versionId", "bookId", "chapter", "verse", "text", "checksum") VALUES (1, 'JHN', 99, 1, 'ajout', '${"0".repeat(64)}')`),
    ).rejects.toThrow(/permission denied/i);
  });

  it("le rôle applicatif ne peut pas falsifier un checksum ou un statut de version", async () => {
    await expect(queryAsApp(`UPDATE "bible_translation_version" SET "checksum" = 'x'`)).rejects.toThrow(/permission denied/i);
    await expect(queryAsApp(`UPDATE "bible_translation_version" SET "status" = 'ACTIVE'`)).rejects.toThrow(/permission denied/i);
  });

  it("le rôle applicatif conserve la lecture", async () => {
    const { rows } = await queryAsApp(`SELECT count(*)::int AS total FROM "bible_book"`);
    expect(rows[0]).toEqual({ total: 66 });
  });

  it("le rôle d'import ne peut ni réécrire ni supprimer un verset", async () => {
    for (const statement of [`UPDATE "bible_verse" SET "text" = 'falsifié'`, `DELETE FROM "bible_verse"`]) {
      await expect(ownerQuery(`BEGIN; SET LOCAL ROLE eparole_bible_import; ${statement}; ROLLBACK;`)).rejects.toThrow(/permission denied/i);
      await ownerQuery("ROLLBACK");
    }
  });

  it("le rôle d'import n'est pas connectable et n'a aucun droit sur les données utilisateur", async () => {
    const { rows } = await ownerQuery(`SELECT rolcanlogin, rolsuper FROM pg_roles WHERE rolname = 'eparole_bible_import'`);
    expect(rows[0]).toEqual({ rolcanlogin: false, rolsuper: false });
    await expect(ownerQuery(`BEGIN; SET LOCAL ROLE eparole_bible_import; SELECT * FROM "bible_note"; ROLLBACK;`)).rejects.toThrow(/permission denied/i);
    await ownerQuery("ROLLBACK");
  });

  it("les fonctions d'activation refusent une version inconnue, même appelées directement", async () => {
    await expect(queryAsApp("SELECT public.bible_activate_version(999999)")).rejects.toThrow(/introuvable/);
    await expect(queryAsApp("SELECT public.bible_set_published(999999, true)")).rejects.toThrow(/introuvable/);
  });
});
