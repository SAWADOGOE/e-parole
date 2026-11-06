import "server-only";
import { getObjectStream } from "@/server/storage/s3";
import type { VariantFormat } from "../constants";
import { findAsset } from "./repository";

/** Flux d'une variante d'image prête. Le contrôle d'accès (qui peut voir cet asset) est fait par l'appelant. */
export async function openVariant(
  assetId: string,
  width: number,
  format: VariantFormat,
): Promise<{ body: ReadableStream; length: number | null; contentType: string } | null> {
  const asset = await findAsset(assetId);
  if (asset?.status !== "READY") return null;
  const variant = asset.variants.find((candidate) => candidate.width === width && candidate.format === format);
  if (!variant) return null;
  const object = await getObjectStream(variant.key);
  return object ? { ...object, contentType: `image/${format}` } : null;
}
