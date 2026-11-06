import { getProducer } from "./boss";
import { emailJobSchema, mediaJobSchema, QUEUES, type EmailJob, type MediaJob } from "./queues";

/** Met un email en file ; l'envoi est fait par le worker (src/worker.ts). */
export async function enqueueEmail(job: EmailJob): Promise<void> {
  const data = emailJobSchema.parse(job);
  const boss = await getProducer();
  await boss.send(QUEUES.emailSend, data);
}

/** Traitement d'une image envoyée (vérification, ré-encodage) par le worker. */
export async function enqueueMediaProcessing(job: MediaJob): Promise<void> {
  const data = mediaJobSchema.parse(job);
  const boss = await getProducer();
  await boss.send(QUEUES.mediaProcess, data, { singletonKey: data.assetId });
}
