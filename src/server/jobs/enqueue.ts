import { getProducer } from "./boss";
import { emailJobSchema, QUEUES, type EmailJob } from "./queues";

/** Met un email en file ; l'envoi est fait par le worker (src/worker.ts). */
export async function enqueueEmail(job: EmailJob): Promise<void> {
  const data = emailJobSchema.parse(job);
  const boss = await getProducer();
  await boss.send(QUEUES.emailSend, data);
}
