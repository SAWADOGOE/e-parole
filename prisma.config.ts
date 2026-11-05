import "dotenv/config";
import { defineConfig } from "prisma/config";

// La CLI Prisma (migrate, seed, studio) utilise le rôle propriétaire.
// L'application et le worker utilisent DATABASE_URL (rôle sans SUPERUSER) via @prisma/adapter-pg.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed/index.ts",
  },
  datasource: {
    url: process.env["MIGRATION_DATABASE_URL"] ?? "",
  },
});
