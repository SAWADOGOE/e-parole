/**
 * Import contrôlé d'une traduction (docs/bible/BIBLE-MODULE.md).
 *   pnpm bible:import --source ebible --translation lsg --file <usfx> --retrieved-at <AAAA-MM-JJ> --license-evidence <archive> [--dry-run]
 * Le texte est écrit en version STAGED ; l'activation est une étape séparée (pnpm bible:activate).
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { userInfo } from "node:os";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import { seedBibleCatalog } from "../../prisma/seed/bible-catalog";
import { sha256 } from "./lib/normalize";
import { renderIntegrityReport } from "./lib/report";
import { parseSource } from "./lib/run-import";
import { TRANSLATIONS } from "./lib/translations";
import { createImportClient, stageVersion } from "./repository";

const REPORT_DIR = join("data", "bible-sources", "reports");

const { values } = parseArgs({
  options: {
    source: { type: "string", default: "ebible" },
    translation: { type: "string" },
    file: { type: "string" },
    "retrieved-at": { type: "string" },
    "license-evidence": { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Option requise : --${name}`);
  return value;
}

async function main(): Promise<void> {
  const code = required("translation", values.translation);
  const file = required("file", values.file);
  const retrievedAt = required("retrieved-at", values["retrieved-at"]);
  const evidencePath = required("license-evidence", values["license-evidence"]);
  const translation = TRANSLATIONS[code];
  if (!translation) throw new Error(`Traduction sans fiche de licence : ${code}`);
  if (!existsSync(evidencePath)) throw new Error(`Preuve de licence introuvable : ${evidencePath}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(retrievedAt)) throw new Error("--retrieved-at doit être au format AAAA-MM-JJ");

  const dryRun = values["dry-run"];
  const parsed = await parseSource(values.source, file);
  const { integrity, ignored, sourceSha256, provider, verses } = parsed;

  await mkdir(REPORT_DIR, { recursive: true });
  const reportPath = join(REPORT_DIR, `integrite-${code}-${dryRun ? "dry-run" : "import"}-${retrievedAt}.md`);
  await writeFile(
    reportPath,
    renderIntegrityReport({ translation, sourceFile: basename(file), sourceSha256, retrievedAt, integrity, ignored, dryRun }),
  );

  console.log(`Livres ${integrity.bookCount} · chapitres ${integrity.chapterCount} · versets ${integrity.verseCount}`);
  console.log(`SHA-256 global ${integrity.checksum}`);
  console.log(`Erreurs ${integrity.errors.length} · avertissements ${integrity.warnings.length} · rapport ${reportPath}`);
  if (integrity.errors.length > 0) {
    console.error(integrity.errors.slice(0, 20).join("\n"));
    process.exitCode = 1;
    return;
  }
  if (dryRun) {
    console.log("Dry-run terminé : aucune écriture.");
    return;
  }

  const connectionString = process.env["MIGRATION_DATABASE_URL"];
  if (!connectionString) throw new Error("MIGRATION_DATABASE_URL manquant");
  const db = createImportClient(connectionString);
  try {
    await seedBibleCatalog(db);
    const evidenceHash = sha256(await readFile(evidencePath));
    const { versionId, verified } = await stageVersion(db, {
      translation,
      sourceProvider: provider.id,
      sourceSha256,
      sourceRetrievedAt: new Date(`${retrievedAt}T00:00:00Z`),
      licenseEvidence: `${basename(evidencePath)} (sha256 ${evidenceHash})`,
      importedBy: userInfo().username,
      verses,
      integrity,
      ignored,
    });
    console.log(`Version ${versionId} créée (STAGED) · relus ${verified.verseCount} · écarts de checksum ${verified.checksumMismatches}`);
    console.log(`Activation : pnpm bible:activate --translation ${code} --version ${versionId}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
