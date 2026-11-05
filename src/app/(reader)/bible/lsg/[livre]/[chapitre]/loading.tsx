import { Skeleton } from "@/components/ui/skeleton";

const LINE_WIDTHS = ["w-full", "w-11/12", "w-full", "w-10/12", "w-full", "w-9/12", "w-full", "w-11/12", "w-full", "w-10/12", "w-full", "w-8/12"];

/** Squelette de 12 lignes de largeurs variables (docs/bible/BIBLE-READER-UX.md, États). */
export default function ChapterLoading() {
  return (
    <main id="contenu" tabIndex={-1} className="mx-auto max-w-[38rem] px-4 pt-[calc(var(--header-height)+24px)]">
      <Skeleton className="mb-6 h-9 w-40" />
      <div className="flex flex-col gap-3">
        {LINE_WIDTHS.map((width, index) => (
          <Skeleton key={index} className={`h-5 ${width}`} />
        ))}
      </div>
    </main>
  );
}
