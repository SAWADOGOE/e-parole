/** Pipeline d'images (ADR-004, ADR-012, docs/19-SECURITY.md). */

/** Formats acceptés à l'envoi. HEIC exclu : les binaires précompilés de sharp ne le décodent pas (iOS convertit en JPEG). */
export const ACCEPTED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedImageMime = (typeof ACCEPTED_IMAGE_MIMES)[number];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** Durée de validité de l'URL présignée PUT. */
export const UPLOAD_URL_TTL_SECONDS = 60;
/** Au-delà, la demande d'URL est refusée tant que les envois en cours ne sont pas terminés. */
export const MAX_PENDING_UPLOADS = 8;
/** Quota de stockage par membre (variantes conservées). */
export const STORAGE_QUOTA_BYTES = 300 * 1024 * 1024;
/** Image décodée au-delà de ce nombre de pixels : refusée (bombe de décompression). */
export const MAX_INPUT_PIXELS = 40_000_000;

export const MEDIA_PURPOSES = ["AVATAR", "BANNER", "POST_IMAGE"] as const;
export type UploadPurpose = (typeof MEDIA_PURPOSES)[number];

/** Largeurs produites (docs/17). Une image n'est jamais agrandie. */
export const VARIANT_WIDTHS: Readonly<Record<UploadPurpose, readonly number[]>> = {
  AVATAR: [320],
  BANNER: [640, 960, 1280],
  POST_IMAGE: [320, 640, 960, 1280],
};

export const VARIANT_FORMATS = ["avif", "webp"] as const;
export type VariantFormat = (typeof VARIANT_FORMATS)[number];

/** Qualités choisies pour tenir ≤ 200 Ko en mobile et ≤ 60 Ko en économie de données (mesurées, voir docs/29). */
export const VARIANT_QUALITY: Readonly<Record<VariantFormat, number>> = { avif: 50, webp: 72 };

/** Recadrage carré de l'avatar ; bannière 3:1. */
export const ASPECT: Readonly<Partial<Record<UploadPurpose, number>>> = { AVATAR: 1, BANNER: 3 };

/** Nettoyage (job media.cleanup). */
export const PENDING_TTL_HOURS = 24;
export const UNREFERENCED_TTL_DAYS = 7;

export const MEDIA_ERROR_CODES = [
  "NOT_UPLOADED",
  "TOO_LARGE",
  "MAGIC_MISMATCH",
  "UNSUPPORTED_FORMAT",
  "DECODE_FAILED",
  "TOO_MANY_PIXELS",
] as const;
export type MediaErrorCode = (typeof MEDIA_ERROR_CODES)[number];
