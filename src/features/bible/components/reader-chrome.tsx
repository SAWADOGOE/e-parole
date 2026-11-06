"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useStoredPreference } from "@/hooks/use-stored-preference";
import { ACTIONS_SLOT_ID, READER_SHORTCUTS_KEY } from "../constants";
import { focusFallback } from "../lib/focus";
import { formatSelectionReference } from "../lib/format";
import { addNoteAction, recordReadingAction } from "../server/actions";
import type { ReaderPrefs } from "../types";
import { ChapterSkeleton } from "./chapter-skeleton";
import { ReaderHeader } from "./reader-header";
import { useReaderPrefs } from "./use-reader-prefs";
import { useReaderShortcuts } from "./use-reader-shortcuts";
import { useSelectionActions } from "./use-selection-actions";
import { useVerseSelection } from "./use-verse-selection";

const SelectorSheet = dynamic(() => import("./selector-sheet"), { ssr: false });
const SettingsSheet = dynamic(() => import("./settings-sheet"), { ssr: false });
const NoteSheet = dynamic(() => import("./note-sheet"), { ssr: false });
const ReaderActionBar = dynamic(() => import("./reader-action-bar"), { ssr: false });

const HELP_ID = "verses-help";

interface ReaderChromeProps {
  bookId: string;
  bookName: string;
  bookSlug: string;
  chapter: number;
  translationShortName: string;
  translationName: string;
  previousHref: string | null;
  nextHref: string | null;
  isSignedIn: boolean;
  /** Connecté avec email vérifié : réglages et annotations sont enregistrés côté serveur. */
  canPersist: boolean;
  serverPrefs: ReaderPrefs | null;
}

type Panel = "selector" | "settings" | "note" | null;

/** Dernier chapitre monté : le premier affichage ne déplace pas le focus, une navigation client si. */
let lastChapter: string | null = null;

/** Îlot client du lecteur. Il agit sur le texte rendu par le serveur sans le re-rendre ; les panneaux se chargent à la demande. */
export function ReaderChrome(props: ReaderChromeProps) {
  const { bookId, bookName, bookSlug, chapter, translationShortName, translationName, previousHref, nextHref, isSignedIn, canPersist, serverPrefs } = props;
  const t = useTranslations("bible");
  const router = useRouter();
  const reference = `${bookName} ${chapter}`;
  const { selected, hasSelected, clear } = useVerseSelection(HELP_ID);
  const { prefs, changePrefs } = useReaderPrefs(serverPrefs, canPersist);
  const [storedShortcuts, setStoredShortcuts] = useStoredPreference(READER_SHORTCUTS_KEY);
  const [panel, setPanel] = useState<Panel>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const singleKeyEnabled = storedShortcuts !== "off";

  useEffect(() => {
    if (canPersist) void recordReadingAction({ bookId, chapter });
  }, [canPersist, bookId, chapter]);

  // Après une navigation client, le focus resterait sur <body> : il rejoint le titre du nouveau chapitre.
  useEffect(() => {
    const key = `${bookId}-${chapter}`;
    if (lastChapter !== null && lastChapter !== key && !window.location.hash) document.querySelector<HTMLElement>("#contenu h1")?.focus({ preventScroll: true });
    lastChapter = key;
  }, [bookId, chapter]);

  useEffect(() => {
    if (focusMode) document.documentElement.dataset["readerFocus"] = "";
    else delete document.documentElement.dataset["readerFocus"];
  }, [focusMode]);

  /** Le démontage de la barre emporterait le focus : il revient d'abord au verset actif. */
  const clearSelection = useCallback(() => {
    const inBar = document.querySelector("[data-reader-actions]")?.contains(document.activeElement) ?? false;
    clear();
    if (inBar) focusFallback();
  }, [clear]);

  const openSelector = useCallback(() => setPanel("selector"), []);
  const toggleFocus = useCallback(() => setFocusMode((value) => !value), []);
  const goTo = useCallback((href: string) => startNavigation(() => router.push(href)), [router]);
  const goPrevious = useMemo(() => (previousHref ? () => goTo(previousHref) : null), [goTo, previousHref]);
  const goNext = useMemo(() => (nextHref ? () => goTo(nextHref) : null), [goTo, nextHref]);

  useReaderShortcuts({ disabled: panel !== null, singleKeyEnabled, onEscape: clearSelection, onOpenSelector: openSelector, onToggleFocus: toggleFocus, onPrevious: goPrevious, onNext: goNext });

  const selection = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);
  const selectionReference = selection.length > 0 ? formatSelectionReference(bookName, chapter, selection) : reference;
  const { busy, copy, share, highlight, bookmark, publish, requireAccount } = useSelectionActions({
    bookId,
    bookSlug,
    chapter,
    translationName,
    selection,
    selectionReference,
    isSignedIn,
    onDone: clearSelection,
  });

  const first = selection[0];
  const last = selection.at(-1);
  const slot = selected.size > 0 ? document.getElementById(ACTIONS_SLOT_ID) : null;
  const status = selected.size > 0 ? t("actions.selected", { count: selected.size }) : hasSelected ? t("actions.cleared") : "";

  return (
    <>
      <ReaderHeader
        reference={reference}
        translationShortName={translationShortName}
        focusMode={focusMode}
        onToggleFocus={toggleFocus}
        onOpenSelector={openSelector}
        onOpenSettings={() => setPanel("settings")}
      />
      {navigating ? <ChapterSkeleton /> : null}
      <p id={HELP_ID} className="sr-only">
        {t("actions.help")}
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
      {slot
        ? createPortal(
            <ReaderActionBar
              reference={selectionReference}
              busy={busy}
              onClear={clearSelection}
              onCopy={copy}
              onHighlight={highlight}
              onNote={() => {
                if (requireAccount()) setPanel("note");
              }}
              onBookmark={bookmark}
              onShare={() => void share()}
              onPublish={publish}
            />,
            slot,
          )
        : null}
      {panel === "selector" ? <SelectorSheet currentBookId={bookId} onClose={() => setPanel(null)} /> : null}
      {panel === "settings" ? (
        <SettingsSheet
          prefs={prefs}
          persisted={canPersist}
          onChange={changePrefs}
          shortcutsEnabled={singleKeyEnabled}
          onShortcutsChange={(enabled) => setStoredShortcuts(enabled ? null : "off")}
          onClose={() => setPanel(null)}
        />
      ) : null}
      {panel === "note" && first !== undefined && last !== undefined ? (
        <NoteSheet
          reference={formatSelectionReference(bookName, chapter, Array.from({ length: last - first + 1 }, (_, index) => first + index))}
          onClose={() => setPanel(null)}
          onSubmit={(body) => addNoteAction({ bookId, chapter, range: { verseStart: first, verseEnd: last }, body })}
          onSaved={() => {
            clearSelection();
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
