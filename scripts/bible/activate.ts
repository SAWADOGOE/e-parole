/**
 * Activation explicite d'une version STAGED.
 *   pnpm bible:activate --translation lsg [--version <id>] [--publish]
 * Sans --version, la dernière version STAGED est retenue. Le même geste existe dans /admin/bible/translations.
 */
import "dotenv/config";
import { userInfo } from "node:os";
import { parseArgs } from "node:util";
import { activateVersion, createImportClient, findLatestStagedVersion } from "./repository";

const { values } = parseArgs({
  options: {
    translation: { type: "string" },
    version: { type: "string" },
    publish: { type: "boolean", default: false },
  },
});

async function main(): Promise<void> {
  const code = values.translation;
  if (!code) throw new Error("Option requise : --translation");
  const connectionString = process.env["MIGRATION_DATABASE_URL"];
  if (!connectionString) throw new Error("MIGRATION_DATABASE_URL manquant");
  const db = createImportClient(connectionString);
  try {
    const versionId = values.version ? Number(values.version) : await findLatestStagedVersion(db, code);
    if (versionId === null || !Number.isInteger(versionId)) throw new Error("Aucune version STAGED à activer");
    await activateVersion(db, versionId, { publish: values.publish, operator: userInfo().username });
    console.log(`Version ${versionId} activée${values.publish ? " et publiée" : ""}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
