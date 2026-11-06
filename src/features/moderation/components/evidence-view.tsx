import { getTranslations } from "next-intl/server";
import { MediaPicture } from "@/features/media/components/media-picture";
import type { MediaImage } from "@/features/media";

/** Champs textuels d'une copie figée, rendus comme texte (jamais de HTML). */
export async function EvidenceView({ data, images }: { data: Readonly<Record<string, unknown>> | null; images: readonly MediaImage[] }) {
  const t = await getTranslations("admin");
  if (!data) return <p className="text-muted">—</p>;
  const text = (key: string): string | null => (typeof data[key] === "string" ? (data[key]) : null);
  const handle = text("handle");
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
          {images.map((image) => (
            <li key={image.assetId}>
              <MediaPicture image={image} alt={t("snapshotTitle")} sizes="240px" />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
