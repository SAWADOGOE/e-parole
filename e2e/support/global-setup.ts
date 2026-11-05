import { execFileSync } from "node:child_process";
import pg from "pg";
import { ensureSampleBible } from "../../scripts/bible/ensure-sample";
import { createImportClient } from "../../scripts/bible/repository";
import { e2eEnv, MAILPIT_URL } from "./env";

const TABLES = [
  "audit_log", "community_member", "community", "user_role", "two_factor", "session", "account",
  "verification", "profile", "media_asset", "platform_setting", "feature_flag", "rate_limit", "user",
];

/** Base de test migrée, vidée, puis seedée (SUPER_ADMIN E2E) ; boîte Mailpit vidée. */
export default async function globalSetup(): Promise<void> {
  const env = e2eEnv();
  const ownerUrl = env["MIGRATION_DATABASE_URL"];
  if (!ownerUrl?.includes("/eparole_test")) throw new Error("Les E2E doivent cibler eparole_test");

  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  execFileSync(pnpm, ["exec", "prisma", "migrate", "deploy"], { env, stdio: "inherit", shell: process.platform === "win32" });

  const client = new pg.Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    await client.query(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
  } finally {
    await client.end();
  }

  execFileSync(pnpm, ["exec", "tsx", "prisma/seed/index.ts"], {
    env: { ...env, NODE_ENV: "test" },
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  const bibleClient = createImportClient(ownerUrl);
  try {
    await ensureSampleBible(bibleClient);
  } finally {
    await bibleClient.$disconnect();
  }

  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" });
}
