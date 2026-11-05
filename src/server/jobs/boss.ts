import { PgBoss } from "pg-boss";
import { logger } from "../logger";
import { QUEUES } from "./queues";

const globalForBoss = globalThis as unknown as { eparoleBoss?: Promise<PgBoss> };

/** Les jobs email contiennent une adresse et un lien à jeton : conservés 1 h au plus après traitement. */
const QUEUE_OPTIONS = {
  retryLimit: 5,
  retryDelay: 30,
  retryBackoff: true,
  expireInSeconds: 300,
  retentionSeconds: 3600,
  deleteAfterSeconds: 3600,
} as const;

async function createBoss(role: "producer" | "worker"): Promise<PgBoss> {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) throw new Error("DATABASE_URL manquant");
  const boss = new PgBoss({
    connectionString,
    schema: "pgboss",
    createSchema: false,
    migrate: role === "worker",
    supervise: role === "worker",
    schedule: role === "worker",
    max: role === "worker" ? 5 : 2,
  });
  boss.on("error", (error: unknown) => {
    logger.error({ err: error }, "pg-boss error");
  });
  await boss.start();
  if (role === "worker") {
    for (const name of Object.values(QUEUES)) {
      await boss.createQueue(name, QUEUE_OPTIONS);
    }
  }
  return boss;
}

/** Instance « productrice » du processus web : envoie des jobs, ne les exécute pas. */
export function getProducer(): Promise<PgBoss> {
  globalForBoss.eparoleBoss ??= createBoss("producer");
  return globalForBoss.eparoleBoss;
}

export function startWorkerBoss(): Promise<PgBoss> {
  return createBoss("worker");
}
