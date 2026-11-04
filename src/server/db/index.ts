import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@generated/prisma/client";

export { Prisma } from "@generated/prisma/client";
export type { PrismaClient } from "@generated/prisma/client";
export * from "@generated/prisma/enums";

const globalForPrisma = globalThis as unknown as { eparolePrisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL manquant");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Instance unique par processus (réutilisée en dev malgré le rechargement à chaud). */
export const db: PrismaClient = globalForPrisma.eparolePrisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.eparolePrisma = db;
}

export type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
