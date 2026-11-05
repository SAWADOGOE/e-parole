import type { PrismaClient } from "../../generated/prisma/client";
import { seedBibleCatalog } from "../../prisma/seed/bible-catalog";
import { parseSource } from "./lib/run-import";
import { TRANSLATIONS } from "./lib/translations";
import { activateVersion, stageVersion } from "./repository";

const SAMPLE_FILE = "tests/fixtures/bible/lsg-sample.usfx.xml";

/**
 * Bases de test : garantit une LSG active. L'import complet local est conservé s'il existe ;
 * sinon (CI) l'échantillon versionné est importé par le même chemin que la production.
 */
export async function ensureSampleBible(db: PrismaClient): Promise<void> {
  await seedBibleCatalog(db);
  const translation = TRANSLATIONS["lsg"];
  if (!translation) throw new Error("Fiche LSG absente");
  const existing = await db.bibleTranslation.findUnique({
    where: { code: translation.code },
    select: { isPublished: true, activeVersionId: true },
  });
  if (existing?.activeVersionId != null && existing.isPublished) return;

  const parsed = await parseSource("ebible", SAMPLE_FILE, { partial: true });
  const { versionId } = await stageVersion(db, {
    translation,
    sourceProvider: parsed.provider.id,
    sourceSha256: parsed.sourceSha256,
    sourceRetrievedAt: new Date("2026-11-05T00:00:00Z"),
    licenseEvidence: "échantillon de test",
    importedBy: "test",
    verses: parsed.verses,
    integrity: parsed.integrity,
    ignored: parsed.ignored,
  });
  await activateVersion(db, versionId, { publish: true, operator: "test" });
}
