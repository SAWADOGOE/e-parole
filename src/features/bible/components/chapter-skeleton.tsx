"use client";

import { useLinkStatus } from "next/link";

const LINE_WIDTHS = ["100%", "92%", "100%", "84%", "100%", "76%", "100%", "92%", "100%", "84%", "100%", "68%"];

/**
 * Squelette de 12 lignes pendant une navigation client (docs/bible/BIBLE-READER-UX.md, États).
 * Volontairement pas un loading.tsx : sa frontière Suspense cacherait le texte tant qu'un script ne l'a pas révélé,
 * et le lecteur doit rester lisible sans JavaScript (US-1).
 */
export function ChapterSkeleton() {
  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-(--header-height) bottom-0 z-20 bg-bg px-4 pt-6 md:left-[72px] lg:left-60">
      <div className="mx-auto flex max-w-[38rem] flex-col gap-3">
        <div className="mb-3 h-9 w-40 animate-pulse rounded-sm bg-bg-subtle" />
        {LINE_WIDTHS.map((width, index) => (
          <div key={index} style={{ width }} className="h-5 animate-pulse rounded-sm bg-bg-subtle" />
        ))}
      </div>
    </div>
  );
}

/** À placer dans un Link de chapitre : affiche le squelette tant que la navigation n'a pas abouti. */
export function ChapterLinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <ChapterSkeleton /> : null;
}
