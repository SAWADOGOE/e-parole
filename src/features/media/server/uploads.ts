import "server-only";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { AppError } from "@/server/errors/app-error";
import { enqueueMediaProcessing } from "@/server/jobs/enqueue";
import { authorize, type Actor } from "@/server/policies";
import { presignPut, privateBucket } from "@/server/storage/s3";
import { MAX_PENDING_UPLOADS, STORAGE_QUOTA_BYTES, UPLOAD_URL_TTL_SECONDS } from "../constants";
import type { assetRefSchema, uploadRequestSchema } from "../schemas";
import type { AssetStatus, UploadTicket } from "../types";
import { createPendingAsset, findAsset, markUploaded, toMediaImage, usageFor } from "./repository";

/** Clé aléatoire non devinable, distincte de l'identifiant exposé au client. */
function originalKey(ownerId: string): string {
  return `originals/${ownerId}/${randomUUID()}`;
}

/** Étape 1 (ADR-004) : contrôles (permission, quotas, MIME, taille) puis URL PUT présignée de 60 s. */
export async function requestUpload(actor: Actor, input: z.infer<typeof uploadRequestSchema>): Promise<UploadTicket> {
  authorize(actor, "media:upload");
  const usage = await usageFor(actor.userId);
  if (usage.pending >= MAX_PENDING_UPLOADS) throw new AppError("RATE_LIMITED", { retryAfterSeconds: UPLOAD_URL_TTL_SECONDS });
  if (usage.storedBytes + input.size > STORAGE_QUOTA_BYTES) {
    throw new AppError("VALIDATION", { fieldErrors: { file: ["quotaExceeded"] } });
  }
  const key = originalKey(actor.userId);
  const assetId = await createPendingAsset({ ownerId: actor.userId, purpose: input.purpose, bucket: privateBucket(), key, mime: input.mime, size: input.size });
  const uploadUrl = await presignPut(key, input.mime, input.size, UPLOAD_URL_TTL_SECONDS);
  return { assetId, uploadUrl, headers: { "Content-Type": input.mime }, expiresInSeconds: UPLOAD_URL_TTL_SECONDS };
}

/** Étape 2 : le client confirme l'envoi ; le worker vérifie et ré-encode. L'asset d'autrui se comporte comme absent. */
export async function completeUpload(actor: Actor, input: z.infer<typeof assetRefSchema>): Promise<AssetStatus> {
  authorize(actor, "media:upload");
  const asset = await findAsset(input.assetId);
  if (!asset || asset.ownerId !== actor.userId) throw new AppError("NOT_FOUND");
  if ((await markUploaded(asset.id, actor.userId)) === 1) await enqueueMediaProcessing({ assetId: asset.id });
  return getAssetStatus(actor, input);
}

/** État d'un envoi, pour que le client attende READY avant d'afficher l'image. */
export async function getAssetStatus(actor: Actor, input: z.infer<typeof assetRefSchema>): Promise<AssetStatus> {
  const asset = await findAsset(input.assetId);
  if (!asset || asset.ownerId !== actor.userId) throw new AppError("NOT_FOUND");
  return {
    assetId: asset.id,
    status: asset.status,
    errorCode: asset.errorCode,
    image: asset.status === "READY" ? toMediaImage(asset) : null,
  };
}
