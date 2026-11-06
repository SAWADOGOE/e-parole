"use client";

import { PenLine } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

/** La feuille et le composer (les îlots les plus lourds) ne sont téléchargés qu'au premier signe d'intention. */
const load = () => import("./composer-sheet");
const ComposerSheet = dynamic(load, { ssr: false });

/** Sans JavaScript, le lien mène à /publier ; avec JavaScript, le composer s'ouvre par-dessus le fil. */
export function ComposerLauncher({ label, isMinor, className }: { label: string; isMinor: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  return (
    <>
      <a
        href="/publier"
        aria-haspopup="dialog"
        onPointerEnter={() => void load()}
        onFocus={() => void load()}
        onClick={(event) => {
          event.preventDefault();
          setRequested(true);
          setOpen(true);
        }}
        className={`flex min-h-12 items-center gap-3 rounded-lg border border-border-strong bg-bg-elevated px-4 text-left text-base text-muted hover:bg-bg-subtle hover:text-fg ${className ?? ""}`}
      >
        <PenLine aria-hidden="true" className="size-5 text-accent" />
        {label}
      </a>
      {requested ? <ComposerSheet open={open} onOpenChange={setOpen} isMinor={isMinor} /> : null}
    </>
  );
}
