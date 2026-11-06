import type { UploadPurpose, VariantFormat } from "./constants";

export interface MediaVariant {
  width: number;
  height: number;
  format: VariantFormat;
  key: string;
  bytes: number;
}

/** Image prête à afficher : jamais d'URL de stockage, uniquement l'identifiant servi par /api/media. */
export interface MediaImage {
  assetId: string;
  width: number;
  height: number;
  dominantColor: string | null;
  variants: readonly Pick<MediaVariant, "width" | "format" | "bytes">[];
}

export type MediaStatusName = "PENDING" | "PROCESSING" | "READY" | "REJECTED";

export interface UploadTicket {
  assetId: string;
  uploadUrl: string;
  /** En-têtes à renvoyer tels quels avec le PUT (ils font partie de la signature). */
  headers: Readonly<Record<string, string>>;
  expiresInSeconds: number;
}

export interface AssetStatus {
  assetId: string;
  status: MediaStatusName;
  errorCode: string | null;
  image: MediaImage | null;
}

export interface UploadRequest {
  purpose: UploadPurpose;
  mime: string;
  size: number;
}
