"use client";

import { ChevronDown, ChevronLeft, Maximize, Minimize, Search, Type } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const SCROLL_DELTA = 8;
const HIDE_AFTER_PX = 80;
const ICON = "inline-flex size-11 items-center justify-center rounded-md hover:bg-bg-subtle";

interface ReaderHeaderProps {
  reference: string;
  translationShortName: string;
  focusMode: boolean;
  onToggleFocus: () => void;
  onOpenSelector: () => void;
  onOpenSettings: () => void;
}

/** En-tête compact : il se masque en descendant, revient en remontant, et reste affiché tant qu'il contient le focus. */
export function ReaderHeader({ reference, translationShortName, focusMode, onToggleFocus, onOpenSelector, onOpenSettings }: ReaderHeaderProps) {
  const t = useTranslations("bible");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = (): void => {
      const y = window.scrollY;
      if (Math.abs(y - last) < SCROLL_DELTA) return;
      setHidden(y > last && y > HIDE_AFTER_PX);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header data-reader-header="" data-hidden={hidden} className="sticky top-0 z-30 border-b bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-(--header-height) max-w-3xl items-center gap-1 px-2 sm:px-4">
        <Link href="/" aria-label={t("backHome")} className={`${ICON} shrink-0`}>
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Link>
        <button
          type="button"
          aria-label={t("openSelector", { reference })}
          aria-haspopup="dialog"
          onClick={onOpenSelector}
          className="inline-flex h-11 min-w-0 items-center gap-1 rounded-md px-2 font-serif text-lg text-fg hover:bg-bg-subtle"
        >
          <span className="truncate">{reference}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
        </button>
        <span className="ml-1 hidden rounded-full border px-2 text-xs font-semibold text-muted min-[400px]:inline">{translationShortName}</span>
        <div className="ml-auto flex shrink-0 items-center">
          <Link href="/bible/recherche" aria-label={t("openSearch")} className={ICON}>
            <Search aria-hidden="true" className="size-5" />
          </Link>
          <button type="button" aria-pressed={focusMode} aria-label={t(focusMode ? "exitFocusMode" : "focusMode")} onClick={onToggleFocus} className={`${ICON} max-[359px]:hidden`}>
            {focusMode ? <Minimize aria-hidden="true" className="size-5" /> : <Maximize aria-hidden="true" className="size-5" />}
          </button>
          <button type="button" aria-label={t("openSettings")} aria-haspopup="dialog" onClick={onOpenSettings} className={ICON}>
            <Type aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
