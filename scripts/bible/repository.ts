import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import type { IgnoredCounts, IntegrityReport, SourceVerse, TranslationRecord } from "./lib/types";
import { sha256 } from "./lib/normalize";

/** Le texte biblique s'écrit uniquement sous ce rôle (droits : migration 20261105090000_bible_module). */
const IMPORT_ROLE = "eparole_bible_import";
const INSERT_CHUNK = 2_000;
const TRANSACTION_TIMEOUT_MS = 300_000;

export function createImportClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export interface StageInput {
  translation: TranslationRecord;
  sourceProvider: string;
  sourceSha256: string;
  sourceRetrievedAt: Date;
  licenseEvidence: string;
  importedBy: string;
  verses: readonly SourceVerse[];
  integrity: IntegrityReport;
  ignored: IgnoredCounts;
}

/** Crée une version STAGED en une transaction : tout le texte est écrit, ou rien. */
export async function stageVersion(db: PrismaClient, input: StageInput): Promise<{ versionId: number }> {
  const { translation, integrity } = input;
  return db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${IMPORT_ROLE}`);

      const record = await tx.bibleTranslation.upsert({
        where: { code: translation.code },
        create: { ...translation, sourceRetrievedAt: input.sourceRetrievedAt, licenseEvidence: input.licenseEvidence },
        update: {
          name: translation.name,
          licenseType: translation.licenseType,
          licenseUrl: translation.licenseUrl,
          attribution: translation.attribution,
          sourceUrl: translation.sourceUrl,
          sourceRetrievedAt: input.sourceRetrievedAt,
          licenseEvidence: input.licenseEvidence,
        },
        select: { id: true },
      });

      const duplicate = await tx.bibleTranslationVersion.findFirst({
        where: { translationId: record.id, checksum: integrity.checksum },
        select: { id: true, status: true },
      });
      if (duplicate) throw new Error(`Texte identique déjà importé : version ${duplicate.id} (${duplicate.status})`);

      const version = await tx.bibleTranslationVersion.create({
        data: {
          translationId: record.id,
          sourceProvider: input.sourceProvider,
          sourceSha256: input.sourceSha256,
          sourceRetrievedAt: input.sourceRetrievedAt,
          checksum: integrity.checksum,
          bookCount: integrity.bookCount,
          chapterCount: integrity.chapterCount,
          verseCount: integrity.verseCount,
          importedBy: input.importedBy,
          report: { ignored: input.ignored, warnings: integrity.warnings },
        },
        select: { id: true },
      });

      await tx.bibleChapterMeta.createMany({
        data: integrity.chapters.map(({ book, chapter, verseCount }) => ({ versionId: version.id, bookId: book, chapter, verseCount })),
      });

      for (let start = 0; start < input.verses.length; start += INSERT_CHUNK) {
        await tx.bibleVerse.createMany({
          data: input.verses.slice(start, start + INSERT_CHUNK).map((v) => ({
            versionId: version.id,
            bookId: v.book,
            chapter: v.chapter,
            verse: v.verse,
            text: v.text,
            checksum: sha256(v.text),
          })),
        });
      }

      // L'audit s'écrit sous le rôle propriétaire : le rôle d'import n'a aucun droit sur audit_log.
      await tx.$executeRawUnsafe("RESET ROLE");
      await tx.auditLog.create({
        data: {
          action: "bible.import.staged",
          targetType: "bible_translation_version",
          targetId: String(version.id),
          metadata: {
            translation: translation.code,
            checksum: integrity.checksum,
            verseCount: integrity.verseCount,
            importedBy: input.importedBy,
          },
        },
      });
      return { versionId: version.id };
    },
    { timeout: TRANSACTION_TIMEOUT_MS, maxWait: 30_000 },
  );
}

export interface VerifyResult {
  verseCount: number;
  checksumMismatches: number;
}

/** Relit la base et recalcule chaque SHA-256 : prouve que le texte stocké est bien celui de la source. */
export async function verifyStoredVersion(db: PrismaClient, versionId: number, expected: readonly SourceVerse[]): Promise<VerifyResult> {
  const stored = await db.bibleVerse.findMany({
    where: { versionId },
    select: { bookId: true, chapter: true, verse: true, text: true, checksum: true },
  });
  const source = new Map(expected.map((v) => [`${v.book}.${v.chapter}.${v.verse}`, v.text]));
  let checksumMismatches = 0;
  for (const row of stored) {
    const text = source.get(`${row.bookId}.${row.chapter}.${row.verse}`);
    if (text !== row.text || sha256(row.text) !== row.checksum) checksumMismatches += 1;
  }
  return { verseCount: stored.length, checksumMismatches };
}

/** Bascule atomique STAGED → ACTIVE, publication facultative, audit dans la même transaction. */
export async function activateVersion(db: PrismaClient, versionId: number, options: { publish: boolean; operator: string }): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT public.bible_activate_version(${versionId}::integer)`;
    const version = await tx.bibleTranslationVersion.findUniqueOrThrow({
      where: { id: versionId },
      select: { translationId: true, checksum: true, translation: { select: { code: true } } },
    });
    await tx.auditLog.create({
      data: {
        action: "bible.version.activated",
        targetType: "bible_translation_version",
        targetId: String(versionId),
        metadata: { translation: version.translation.code, checksum: version.checksum, operator: options.operator },
      },
    });
    if (!options.publish) return;
    await tx.$executeRaw`SELECT public.bible_set_published(${version.translationId}::integer, true)`;
    await tx.auditLog.create({
      data: {
        action: "bible.translation.published",
        targetType: "bible_translation",
        targetId: String(version.translationId),
        metadata: { translation: version.translation.code, operator: options.operator },
      },
    });
  });
}

export async function findLatestStagedVersion(db: PrismaClient, code: string): Promise<number | null> {
  const version = await db.bibleTranslationVersion.findFirst({
    where: { status: "STAGED", translation: { code } },
    orderBy: { id: "desc" },
    select: { id: true },
  });
  return version?.id ?? null;
}
