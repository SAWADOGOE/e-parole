process.env["EPAROLE_PROCESS"] ??= "worker";

import "dotenv/config";
import { deliverEmail } from "./server/email/mailer";
import { startWorkerBoss } from "./server/jobs/boss";
import { emailJobSchema, QUEUES } from "./server/jobs/queues";
import { logger } from "./server/logger";

async function main(): Promise<void> {
  const boss = await startWorkerBoss();

  await boss.work(QUEUES.emailSend, async (jobs) => {
    for (const job of jobs) {
      const data = emailJobSchema.parse(job.data);
      await deliverEmail(data.to, data.template, { url: data.url });
      logger.info({ jobId: job.id, template: data.template }, "email envoyé");
    }
  });

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
