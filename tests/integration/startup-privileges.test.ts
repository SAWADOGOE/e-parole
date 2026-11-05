import pg from "pg";
import { describe, expect, it } from "vitest";
import { findExcessPrivileges } from "@/server/db/privileges";
import { testOwnerUrl } from "../support/integration-env";

async function asOwner(sql: string): Promise<void> {
  const client = new pg.Client({ connectionString: testOwnerUrl() });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

describe("contrôle des droits au démarrage", () => {
  it("le rôle applicatif n'a aucun droit interdit", async () => {
    expect(await findExcessPrivileges()).toEqual([]);
  });

  it("un droit d'écriture sur la Bible ou sur l'audit est détecté", async () => {
    await asOwner(`GRANT UPDATE ON "bible_verse" TO eparole_app; GRANT DELETE ON "audit_log" TO eparole_app`);
    try {
      expect((await findExcessPrivileges()).sort()).toEqual(["audit_log", "bible_verse"]);
    } finally {
      await asOwner(`REVOKE UPDATE ON "bible_verse" FROM eparole_app; REVOKE DELETE ON "audit_log" FROM eparole_app`);
    }
    expect(await findExcessPrivileges()).toEqual([]);
  });
});
