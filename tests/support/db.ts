import pg from "pg";
import { testAppUrl, testOwnerUrl } from "./integration-env";

const TABLES = [
  "audit_log",
  "community_member",
  "community",
  "user_role",
  "two_factor",
  "session",
  "account",
  "verification",
  "profile",
  "media_asset",
  "platform_setting",
  "feature_flag",
  "rate_limit",
  "user",
];

/** Vide les tables métier entre deux tests (connexion propriétaire, jamais en dehors de eparole_test). */
export async function resetDatabase(): Promise<void> {
  const client = new pg.Client({ connectionString: testOwnerUrl() });
  await client.connect();
  try {
    await client.query(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
  } finally {
    await client.end();
  }
}

/** Exécute une requête avec le rôle applicatif (pour tester les droits PostgreSQL). */
export async function queryAsApp(sql: string, params: unknown[] = []): Promise<pg.QueryResult> {
  const client = new pg.Client({ connectionString: testAppUrl() });
  await client.connect();
  try {
    return await client.query(sql, params);
  } finally {
    await client.end();
  }
}
