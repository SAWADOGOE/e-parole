import { getTranslations } from "next-intl/server";
import { MediaPicture } from "@/features/media/components/media-picture";
import type { MediaImage } from "@/features/media";

/** Champs textuels d'une copie figée, rendus comme texte (jamais de HTML). */
export async function EvidenceView({ data, images }: { data: Readonly<Record<string, unknown>> | null; images: readonly MediaImage[] }) {
  const t = await getTranslations("admin");
  if (!data) return <p className="text-muted">—</p>;
  const text = (key: string): string | null => (typeof data[key] === "string" ? (data[key]) : null);
  const handle = text("handle");
  const media = Array.isArray(data["media"]) ? (data["media"] as unknown[]) : [];
  /** Texte alternatif saisi par l'auteur, s'il existe dans la copie figée. */
  const altOf = (assetId: string): string | null => {
    for (const entry of media) {
      if (typeof entry === "object" && entry !== null && "assetId" in entry && entry.assetId === assetId && "altText" in entry && typeof entry.altText === "string" && entry.altText) {
        return entry.altText;
      }
    }
    return null;
  };
  return (
    <div className="flex flex-col gap-3">
      {handle ? (
        <p className="text-sm text-muted">
          {text("displayName")} · @{handle}
        </p>
      ) : null}
      {text("body") ? <p className="break-words whitespace-pre-line text-fg">{text("body")}</p> : null}
      {text("bio") ? <p className="break-words whitespace-pre-line text-fg">{text("bio")}</p> : null}
      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2">
          {images.map((image, index) => (
            <li key={image.assetId}>
              <MediaPicture image={image} alt={altOf(image.assetId) ?? t("evidenceImage", { index: index + 1, total: images.length })} sizes="240px" />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
