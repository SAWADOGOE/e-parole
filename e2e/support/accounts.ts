import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";
import { e2eEnv } from "./env";

export const MEMBER_PASSWORD = "e2e-mot-de-passe-membre";

export interface TestMember {
  id: string;
  email: string;
  handle: string;
  name: string;
}

/** Compte vérifié créé directement dans eparole_test (données de test uniquement), avec un compte âgé si demandé. */
export async function createMember(name: string, options: { role?: "MODERATOR" | "ADMIN"; ageDays?: number; birthYear?: number } = {}): Promise<TestMember> {
  const ownerUrl = e2eEnv()["MIGRATION_DATABASE_URL"];
  if (!ownerUrl?.includes("/eparole_test")) throw new Error("E2E : base de test uniquement");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
  const id = `e2e${suffix}${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const handle = `${name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}_${suffix}`;
  const email = `${handle}@exemple.test`;
  const createdAt = new Date(Date.now() - (options.ageDays ?? 30) * 86_400_000);
  const client = new pg.Client({ connectionString: ownerUrl });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", "birthYear", "createdAt", "updatedAt") VALUES ($1, $2, $3, true, $4, $5, now())`,
      [id, name, email, options.birthYear ?? 1990, createdAt],
    );
    await client.query(`INSERT INTO "profile" ("userId", handle, "displayName", "isDiscoverable", "updatedAt") VALUES ($1, $2, $3, $4, now())`, [
      id,
      handle,
      name,
      new Date().getUTCFullYear() - (options.birthYear ?? 1990) >= 18,
    ]);
    await client.query(`INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "updatedAt") VALUES ($1, $2, 'credential', $2, $3, now())`, [
      `acc${id}`,
      id,
      await hashPassword(MEMBER_PASSWORD),
    ]);
    if (options.role) await client.query(`INSERT INTO "user_role" ("userId", role) VALUES ($1, $2)`, [id, options.role]);
    await client.query("COMMIT");
  } finally {
    await client.end();
  }
  return { id, email, handle, name };
}

/** Lecture de contrôle dans la base de test (jamais d'écriture de contenu). */
export async function queryTest<T extends pg.QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: e2eEnv()["MIGRATION_DATABASE_URL"] });
  await client.connect();
  try {
    return (await client.query<T>(sql, params)).rows;
  } finally {
    await client.end();
  }
}
