import "dotenv/config";
import { ensureAutomaticDailyVerse } from "./features/bible/server/daily-verse";
import { cleanupExpiredMedia } from "./features/media/server/cleanup";
import { processAsset } from "./features/media/server/process";
import { expireDueSuspensions } from "./features/moderation/server/maintenance";
import { purgeExpiredSessions } from "./server/auth/session-repository";
import { purgeExpiredRateLimits } from "./server/rate-limit/rate-limit";
import { deliverEmail } from "./server/email/mailer";
import { verifyDatabaseRoles } from "./server/db/startup-check";
import { startWorkerBoss } from "./server/jobs/boss";
import { emailJobSchema, mediaJobSchema, QUEUES } from "./server/jobs/queues";
import { logger as baseLogger } from "./server/logger";

const logger = baseLogger.child({ service: "worker" });

async function main(): Promise<void> {
  await verifyDatabaseRoles("worker");
  const boss = await startWorkerBoss();

  await boss.work(QUEUES.emailSend, async (jobs) => {
    for (const job of jobs) {
      const data = emailJobSchema.parse(job.data);
      await deliverEmail(data.to, data.template, { url: data.url });
      logger.info({ jobId: job.id, template: data.template }, "email envoyé");
    }
  });

  await boss.work(QUEUES.dailyVerseEnsure, async () => {
    const created = await ensureAutomaticDailyVerse(new Date());
    logger.info({ created }, "verset du jour automatique vérifié");
  });
  // Juste après minuit (fuseau Africa/Ouagadougou = UTC) : consigne la sélection automatique dans l'historique.
  await boss.schedule(QUEUES.dailyVerseEnsure, "5 0 * * *", null, { tz: "UTC" });

  await boss.work(QUEUES.mediaProcess, async (jobs) => {
    for (const job of jobs) {
      const { assetId } = mediaJobSchema.parse(job.data);
      const outcome = await processAsset(assetId);
      logger.info({ jobId: job.id, assetId, outcome: outcome.status, ...("errorCode" in outcome ? { errorCode: outcome.errorCode } : {}) }, "image traitée");
    }
  });

  await boss.work(QUEUES.mediaCleanup, async () => {
    logger.info({ removed: await cleanupExpiredMedia() }, "médias expirés supprimés");
  });
  await boss.schedule(QUEUES.mediaCleanup, "30 3 * * *", null, { tz: "UTC" });

  // Fenêtres anti-abus expirées (dont les clés Better Auth contenant une IP) et sessions expirées : l'IP n'est
  // pas conservée au-delà du nécessaire (docs/19, dette Phase 2).
  await boss.work(QUEUES.maintenancePurge, async () => {
    const [rateLimits, sessions] = [await purgeExpiredRateLimits(), await purgeExpiredSessions()];
    logger.info({ rateLimits, sessions }, "purge des clés anti-abus et des sessions expirées");
  });
  await boss.schedule(QUEUES.maintenancePurge, "15 * * * *", null, { tz: "UTC" });

  await boss.work(QUEUES.sanctionsExpire, async () => {
    logger.info({ reactivated: await expireDueSuspensions() }, "suspensions échues levées");
  });
  await boss.schedule(QUEUES.sanctionsExpire, "*/10 * * * *", null, { tz: "UTC" });

  logger.info({ queues: Object.values(QUEUES) }, "worker démarré");

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "arrêt du worker");
    await boss.stop({ graceful: true, timeout: 20_000 });
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  logger.fatal({ err: error }, "échec du démarrage du worker");
  process.exit(1);
});
