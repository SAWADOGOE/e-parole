import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "../env";

/**
 * Accès au stockage objet compatible S3 (SeaweedFS en dev, ADR-004).
 * Deux clients : l'un parle au stockage depuis le serveur, l'autre signe des URL avec l'adresse vue par le navigateur.
 */
interface Clients {
  internal: S3Client;
  presign: S3Client;
  bucket: string;
}

const globalForS3 = globalThis as unknown as { eparoleS3?: Clients };

function makeClient(endpoint: string): S3Client {
  const env = getEnv();
  return new S3Client({
    endpoint,
    region: env.S3_REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
    // Les checksums CRC32 ajoutés par défaut casseraient les URL présignées pour un navigateur.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

function clients(): Clients {
  if (globalForS3.eparoleS3) return globalForS3.eparoleS3;
  const env = getEnv();
  globalForS3.eparoleS3 = {
    internal: makeClient(env.S3_ENDPOINT),
    presign: makeClient(env.S3_PUBLIC_ENDPOINT ?? env.S3_ENDPOINT),
    bucket: env.S3_BUCKET_PRIVATE,
  };
  return globalForS3.eparoleS3;
}

export function privateBucket(): string {
  return clients().bucket;
}

/** Origine du stockage pour la CSP (connect-src) : le navigateur y envoie les fichiers. */
export function storageOrigin(): string {
  const env = getEnv();
  return new URL(env.S3_PUBLIC_ENDPOINT ?? env.S3_ENDPOINT).origin;
}

/** URL PUT présignée : type et taille exacts signés, le stockage refuse tout autre envoi. */
export async function presignPut(key: string, contentType: string, contentLength: number, expiresIn: number): Promise<string> {
  const { presign, bucket } = clients();
  return getSignedUrl(presign, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: contentLength }), {
    expiresIn,
    signableHeaders: new Set(["content-type", "content-length"]),
  });
}

/** Taille réelle d'un objet, ou null s'il n'existe pas. */
export async function headObjectSize(key: string): Promise<number | null> {
  const { internal, bucket } = clients();
  try {
    const head = await internal.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return head.ContentLength ?? null;
  } catch (error: unknown) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return null;
    throw error;
  }
}

export async function getObjectBytes(key: string): Promise<Uint8Array> {
  const { internal, bucket } = clients();
  const result = await internal.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) throw new Error("objet vide");
  return result.Body.transformToByteArray();
}

export async function getObjectStream(key: string): Promise<{ body: ReadableStream; length: number | null } | null> {
  const { internal, bucket } = clients();
  try {
    const result = await internal.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!result.Body) return null;
    return { body: result.Body.transformToWebStream(), length: result.ContentLength ?? null };
  } catch (error: unknown) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return null;
    throw error;
  }
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const { internal, bucket } = clients();
  await internal.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function deleteObjects(keys: readonly string[]): Promise<void> {
  if (keys.length === 0) return;
  const { internal, bucket } = clients();
  for (let index = 0; index < keys.length; index += 500) {
    const batch = keys.slice(index, index + 500).map((Key) => ({ Key }));
    await internal.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch, Quiet: true } }));
  }
}
