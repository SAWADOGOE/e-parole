import { MediaPicture } from "@/features/media/components/media-picture";
import type { MediaImage } from "@/features/media";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/initials";

const SIZES = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-20 text-xl" } as const;

/** Avatar décoratif (le nom est toujours écrit à côté) ; initiales en économie de données ou sans photo. */
export function Avatar({ name, image, size = "md", dataSaver = false }: { name: string; image: MediaImage | null; size?: keyof typeof SIZES; dataSaver?: boolean }) {
  if (image && !dataSaver) {
    return (
      <span className={cn("block shrink-0 overflow-hidden rounded-full border border-border", SIZES[size])} aria-hidden="true">
        <MediaPicture image={image} alt="" sizes={size === "lg" ? "80px" : "40px"} className="aspect-square h-full rounded-full" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center rounded-full border border-gold bg-accent-subtle font-semibold text-brand", SIZES[size])}>
      {initials(name) || "?"}
    </span>
  );
}
