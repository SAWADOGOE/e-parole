import { z } from "zod";
import { ACCEPTED_IMAGE_MIMES, MAX_UPLOAD_BYTES, MEDIA_PURPOSES, VARIANT_FORMATS } from "./constants";

export const assetIdSchema = z.string().min(1).max(64).regex(/^[a-z0-9]+$/);

export const uploadRequestSchema = z.object({
  purpose: z.enum(MEDIA_PURPOSES),
  mime: z.enum(ACCEPTED_IMAGE_MIMES),
  size: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
});

export const assetRefSchema = z.object({ assetId: assetIdSchema });

/** Segment d'URL d'une variante : « 640.avif ». */
export const variantFileSchema = z
  .string()
  .regex(/^(\d{3,4})\.(avif|webp)$/)
  .transform((value) => {
    const [width, format] = value.split(".");
    return { width: Number(width), format: z.enum(VARIANT_FORMATS).parse(format) };
  });

export const storedVariantsSchema = z.array(
  z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    format: z.enum(VARIANT_FORMATS),
    key: z.string().min(1),
    bytes: z.number().int().positive(),
  }),
);
