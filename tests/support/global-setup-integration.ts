import { execSync } from "node:child_process";
import { testOwnerUrl } from "./integration-env";

/** Applique les migrations sur la base de test avant la suite d'intégration. */
export default function setup(): void {
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, MIGRATION_DATABASE_URL: testOwnerUrl(), CHECKPOINT_DISABLE: "1" },
  });
}
