"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComposerVerse } from "./composer/verse-field";

/** Le brouillon vit dans le stockage de l'appareil : le composer est rendu côté client seulement (pas d'écart d'hydratation). */
const Composer = dynamic(() => import("./composer/composer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <Skeleton className="h-11 w-2/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-11 w-1/2" />
    </div>
  ),
});

export function ComposerPage({ isMinor, initialVerse }: { isMinor: boolean; initialVerse: ComposerVerse | null }) {
  return <Composer isMinor={isMinor} initialVerse={initialVerse} />;
}
