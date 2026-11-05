import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@generated/prisma/client";

export { Prisma } from "@generated/prisma/client";
export type { PrismaClient } from "@generated/prisma/client";
export * from "@generated/prisma/enums";

const globalForPrisma = globalThis as unknown as { eparolePrisma?: PrismaClient };

function getClient(): PrismaClient {
  if (globalForPrisma.eparolePrisma) return globalForPrisma.eparolePrisma;
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) throw new Error("DATABASE_URL manquant");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  // Instance unique par processus (réutilisée en dev malgré le rechargement à chaud).
  globalForPrisma.eparolePrisma = client;
  return client;
}

/**
 * Client Prisma paresseux : la connexion n'est créée qu'au premier accès,
 * ce qui permet de construire l'application (next build) sans base de données.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value: unknown = Reflect.get(client, property, client);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

export type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
