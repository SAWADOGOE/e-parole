import { config } from "dotenv";

config({ quiet: true });

/** URL propriétaire de la base de test (migrations, nettoyage). */
export function testOwnerUrl(): string {
  const url = process.env["TEST_DATABASE_URL"];
  if (!url) throw new Error("TEST_DATABASE_URL manquant (voir .env.example)");
  if (!/\/eparole_test(\?|$)/.test(url)) throw new Error("TEST_DATABASE_URL doit cibler la base eparole_test");
  return url;
}

/** Même base de test, mais avec le rôle applicatif sans SUPERUSER (comme en production). */
export function testAppUrl(): string {
  const app = process.env["DATABASE_URL"];
  if (!app) throw new Error("DATABASE_URL manquant");
  const appUrl = new URL(app);
  appUrl.pathname = "/eparole_test";
  return appUrl.toString();
}
