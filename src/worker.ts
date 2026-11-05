import "dotenv/config";
import { ensureAutomaticDailyVerse } from "./features/bible/server/daily-verse";
import { deliverEmail } from "./server/email/mailer";
import { startWorkerBoss } from "./server/jobs/boss";
import { emailJobSchema, QUEUES } from "./server/jobs/queues";
import { logger as baseLogger } from "./server/logger";

const logger = baseLogger.child({ service: "worker" });

async function main(): Promise<void> {
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
