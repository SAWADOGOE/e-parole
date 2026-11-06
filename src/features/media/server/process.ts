import { createHash } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { deleteObjects, getObjectBytes, headObjectSize, putObject } from "@/server/storage/s3";
import {
  ASPECT,
  MAX_INPUT_PIXELS,
  MAX_UPLOAD_BYTES,
  VARIANT_FORMATS,
  VARIANT_QUALITY,
  VARIANT_WIDTHS,
  type MediaErrorCode,
  type UploadPurpose,
  type VariantFormat,
} from "../constants";
import { detectImageFormat } from "../lib/magic-bytes";
import type { MediaVariant } from "../types";
import { findAsset, markReady, markRejected } from "./repository";

export type ProcessOutcome = { status: "READY"; variants: number } | { status: "REJECTED"; errorCode: MediaErrorCode } | { status: "SKIPPED" };

class MediaRejection extends Error {
  constructor(readonly code: MediaErrorCode) {
    super(code);
  }
}

function variantKey(assetId: string, width: number, format: VariantFormat): string {
  return `media/${assetId}/${width}.${format}`;
}

/** Largeurs à produire : jamais d'agrandissement, au moins une variante (à la largeur d'origine si l'image est petite). */
export function targetWidths(purpose: UploadPurpose, sourceWidth: number): number[] {
  const widths = VARIANT_WIDTHS[purpose].filter((width) => width <= sourceWidth);
  return widths.length > 0 ? widths : [sourceWidth];
}

function toHex(channel: number): string {
  return Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0");
}

/** `written` reçoit chaque clé écrite, pour nettoyer le stockage si une variante suivante échoue. */
async function encodeVariants(assetId: string, purpose: UploadPurpose, source: Buffer, sourceWidth: number, written: string[]): Promise<MediaVariant[]> {
  const aspect = ASPECT[purpose];
  const variants: MediaVariant[] = [];
  for (const width of targetWidths(purpose, sourceWidth)) {
    for (const format of VARIANT_FORMATS) {
      // rotate() applique l'orientation EXIF ; la sortie sharp ne conserve aucune métadonnée (EXIF, GPS, XMP, ICC).
      let pipeline = sharp(source, { limitInputPixels: MAX_INPUT_PIXELS }).rotate();
      pipeline = aspect
        ? pipeline.resize({ width, height: Math.round(width / aspect), fit: "cover", position: "attention" })
        : pipeline.resize({ width, withoutEnlargement: true });
      pipeline = format === "avif" ? pipeline.avif({ quality: VARIANT_QUALITY.avif, effort: 4 }) : pipeline.webp({ quality: VARIANT_QUALITY.webp });
      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      const key = variantKey(assetId, width, format);
      await putObject(key, data, `image/${format}`);
      written.push(key);
      variants.push({ width, height: info.height, format, key, bytes: info.size });
    }
  }
  return variants;
}

/**
 * Job media.process (ADR-004) : taille réelle, magic bytes, refus SVG/GIF/HEIC, décodage borné,
 * ré-encodage AVIF/WebP sans métadonnées aux tailles prévues, suppression de l'original.
 * Idempotent : un asset qui n'est plus PROCESSING est ignoré.
 */
export async function processAsset(assetId: string): Promise<ProcessOutcome> {
  const asset = await findAsset(assetId);
  if (!asset || asset.status !== "PROCESSING") return { status: "SKIPPED" };
  if (asset.purpose !== "AVATAR" && asset.purpose !== "BANNER" && asset.purpose !== "POST_IMAGE") return { status: "SKIPPED" };
  const purpose = asset.purpose;
  const written: string[] = [];
  try {
    const size = await headObjectSize(asset.key);
    if (size === null) throw new MediaRejection("NOT_UPLOADED");
    if (size > MAX_UPLOAD_BYTES || size !== asset.size) throw new MediaRejection("TOO_LARGE");
    const bytes = await getObjectBytes(asset.key);
    const detected = detectImageFormat(bytes);
    if (detected !== "image/jpeg" && detected !== "image/png" && detected !== "image/webp") throw new MediaRejection("UNSUPPORTED_FORMAT");
    if (detected !== asset.mime) throw new MediaRejection("MAGIC_MISMATCH");

    const source = Buffer.from(bytes);
    let metadata: Metadata;
    try {
      metadata = await sharp(source, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    } catch (error: unknown) {
      throw new MediaRejection(error instanceof Error && /pixel limit/i.test(error.message) ? "TOO_MANY_PIXELS" : "DECODE_FAILED");
    }
    if (metadata.pages !== undefined && metadata.pages > 1) throw new MediaRejection("UNSUPPORTED_FORMAT");
    const orientedWidth = metadata.autoOrient.width;
    if (orientedWidth < 1) throw new MediaRejection("DECODE_FAILED");

    const variants = await encodeVariants(asset.id, purpose, source, orientedWidth, written);
    const { dominant } = await sharp(source, { limitInputPixels: MAX_INPUT_PIXELS }).stats();
    const largest = variants.reduce((best, variant) => (variant.width > best.width ? variant : best));
    await markReady(asset.id, {
      width: largest.width,
      height: largest.height,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      dominantColor: `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`,
      variants,
    });
    await deleteObjects([asset.key]);
    return { status: "READY", variants: variants.length };
  } catch (error: unknown) {
    if (!(error instanceof MediaRejection)) {
      if (error instanceof Error && /unsupported image format|Input buffer|corrupt|bad seek|VipsJpeg|premature/i.test(error.message)) {
        await reject(asset.id, asset.key, written, "DECODE_FAILED");
        return { status: "REJECTED", errorCode: "DECODE_FAILED" };
      }
      throw error;
    }
    await reject(asset.id, asset.key, written, error.code);
    return { status: "REJECTED", errorCode: error.code };
  }
}

async function reject(assetId: string, originalKey: string, written: readonly string[], code: MediaErrorCode): Promise<void> {
  await markRejected(assetId, code);
  await deleteObjects([originalKey, ...written]);
}
