"use client";

import { Bookmark, Copy, Highlighter, NotebookPen, PenLine, Share2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { HIGHLIGHT_COLORS } from "../constants";
import type { HighlightColorName } from "../types";

interface ReaderActionBarProps {
  reference: string;
  busy: boolean;
  onClear: () => void;
  onCopy: () => void;
  onHighlight: (color: HighlightColorName | null) => void;
  onNote: () => void;
  onBookmark: () => void;
  onShare: () => void;
  /** Ouvre le composer pré-rempli avec la référence sélectionnée (US-5). */
  onPublish: () => void;
}

const ACTION = "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 text-center text-xs font-medium [overflow-wrap:anywhere] text-fg hover:bg-bg-subtle disabled:opacity-50";

/** Barre d'actions de la sélection : au-dessus de la navigation sur mobile, libellés toujours visibles. */
export default function ReaderActionBar({ reference, busy, onClear, onCopy, onHighlight, onNote, onBookmark, onShare, onPublish }: ReaderActionBarProps) {
  const t = useTranslations("bible");
  const [colorsOpen, setColorsOpen] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  // Sa hauteur varie (couleurs, zoom) : le défilement doit la connaître pour qu'aucun élément focalisé ne passe dessous.
  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => root.style.setProperty("--reader-bar-height", `${element.offsetHeight}px`));
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--reader-bar-height");
    };
  }, []);

  return (
    <div
      ref={bar}
      role="group"
      aria-label={t("actions.toolbar")}
      data-reader-actions=""
      className="fixed inset-x-2 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+8px)] z-40 mx-auto max-h-[calc(100dvh-var(--bottom-nav-height)-16px)] max-w-lg overflow-y-auto rounded-lg border bg-bg-elevated p-1 font-sans shadow-lg md:bottom-4"
    >
      <p className="flex items-center justify-between gap-2 px-2 text-sm font-medium text-fg">
        <span className="min-w-0 truncate">{reference}</span>
        <button type="button" aria-label={t("actions.clear")} onClick={onClear} className="inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-bg-subtle">
          <X aria-hidden="true" className="size-5" />
        </button>
      </p>
      {colorsOpen ? (
        <div role="group" aria-label={t("actions.colorsLabel")} className="flex flex-wrap items-center justify-center gap-1 px-1 pb-1">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              disabled={busy}
              onClick={() => onHighlight(color)}
              className={`inline-flex h-11 min-w-11 items-center justify-center rounded-md border border-border-strong px-2 text-xs font-medium text-fg highlight-swatch-${color}`}
            >
              {t(`colors.${color}`)}
            </button>
          ))}
          <button type="button" disabled={busy} onClick={() => onHighlight(null)} className="inline-flex h-11 items-center justify-center rounded-md px-2 text-xs font-medium text-fg hover:bg-bg-subtle">
            {t("actions.removeHighlight")}
          </button>
        </div>
      ) : null}
      <div className="flex items-stretch gap-0.5">
        <button type="button" className={ACTION} onClick={onCopy}>
          <Copy aria-hidden="true" className="size-5" />
          {t("actions.copy")}
        </button>
        <button type="button" className={ACTION} aria-expanded={colorsOpen} onClick={() => setColorsOpen((value) => !value)}>
          <Highlighter aria-hidden="true" className="size-5" />
          {t("actions.highlight")}
        </button>
        <button type="button" className={ACTION} onClick={onNote}>
          <NotebookPen aria-hidden="true" className="size-5" />
          {t("actions.note")}
        </button>
        <button type="button" className={ACTION} disabled={busy} onClick={onBookmark}>
          <Bookmark aria-hidden="true" className="size-5" />
          {t("actions.bookmark")}
        </button>
        <button type="button" className={ACTION} onClick={onShare}>
          <Share2 aria-hidden="true" className="size-5" />
          {t("actions.share")}
        </button>
        <button type="button" className={ACTION} onClick={onPublish}>
          <PenLine aria-hidden="true" className="size-5" />
          {t("actions.publish")}
        </button>
      </div>
    </div>
  );
}
