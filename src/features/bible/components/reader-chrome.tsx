"use client";

import type { Route } from "next";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { notify } from "@/lib/notify";
import { errorKey } from "@/lib/error-key";
import { READER_STORAGE_KEY } from "../constants";
import { formatCopy, formatFocus, formatSelectionReference, toRanges } from "../lib/format";
import { applyReaderPrefs, clearReaderPrefs, DEFAULT_READER_PREFS, parseStoredPrefs } from "../lib/reader-prefs";
import { addNoteAction, recordReadingAction, saveReaderPrefsAction, setHighlightAction, toggleBookmarkAction } from "../server/actions";
import type { HighlightColorName, ReaderPrefs } from "../types";
import { ChapterSkeleton } from "./chapter-skeleton";
import { ReaderHeader } from "./reader-header";
import { useVerseSelection } from "./use-verse-selection";

const SelectorSheet = dynamic(() => import("./selector-sheet"), { ssr: false });
const SettingsSheet = dynamic(() => import("./settings-sheet"), { ssr: false });
const NoteSheet = dynamic(() => import("./note-sheet"), { ssr: false });
const ReaderActionBar = dynamic(() => import("./reader-action-bar"), { ssr: false });

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
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code: string } };

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

function storedPrefs(): ReaderPrefs | null {
  try {
    return parseStoredPrefs(localStorage.getItem(READER_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Îlot client du lecteur. Il agit sur le texte rendu par le serveur sans le re-rendre ; les panneaux se chargent à la demande. */
export function ReaderChrome(props: ReaderChromeProps) {
  const { bookId, bookName, bookSlug, chapter, translationShortName, translationName, previousHref, nextHref, isSignedIn, canPersist, serverPrefs } = props;
  const t = useTranslations("bible");
  const tErrors = useTranslations("errors.codes");
  const router = useRouter();
  const pathname = usePathname();
  const { selected, clear } = useVerseSelection();
  const [panel, setPanel] = useState<Panel>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => serverPrefs ?? DEFAULT_READER_PREFS);
  const [busy, setBusy] = useState(false);
  const [navigating, startNavigation] = useTransition();

  useEffect(() => {
    const initial = serverPrefs ?? storedPrefs();
    if (initial) {
      // localStorage n'existe pas au rendu serveur : la valeur du visiteur ne peut être lue qu'après montage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrefs(initial);
      applyReaderPrefs(initial);
    }
    return clearReaderPrefs;
  }, [serverPrefs]);

  useEffect(() => {
    if (canPersist) void recordReadingAction({ bookId, chapter });
  }, [canPersist, bookId, chapter]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (panel !== null || isEditable(event.target)) return;
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (modifier && key === "k") {
        event.preventDefault();
        setPanel("selector");
      } else if (modifier || event.altKey) {
        return;
      } else if (event.key === "Escape") {
        clear();
      } else if (event.key === "ArrowLeft" && previousHref) {
        startNavigation(() => router.push(previousHref));
      } else if (event.key === "ArrowRight" && nextHref) {
        startNavigation(() => router.push(nextHref));
      } else if (key === "g") {
        event.preventDefault();
        setPanel("selector");
      } else if (key === "f") {
        setFocusMode((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [panel, previousHref, nextHref, router, clear]);

  useEffect(() => {
    if (focusMode) document.documentElement.dataset["readerFocus"] = "";
    else delete document.documentElement.dataset["readerFocus"];
  }, [focusMode]);

  const selection = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);
  const ranges = useMemo(() => toRanges(selection), [selection]);
  const reference = `${bookName} ${chapter}`;
  const selectionReference = selection.length > 0 ? formatSelectionReference(bookName, chapter, selection) : reference;
  const first = selection[0];
  const last = selection.at(-1);

  function requireAccount(): boolean {
    if (isSignedIn) return true;
    notify(t("actions.signInRequired"));
    router.push(`/connexion?retour=${encodeURIComponent(pathname)}` as Route);
    return false;
  }

  async function run<T>(call: () => Promise<ActionResult<T>>, done: (data: T) => string): Promise<void> {
    setBusy(true);
    const result = await call().finally(() => setBusy(false));
    if (!result.ok) {
      notify(tErrors(errorKey(result.error.code)));
      return;
    }
    notify(done(result.data));
    clear();
    router.refresh();
  }

  async function writeClipboard(text: string, success: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      notify(success);
    } catch {
      notify(t("actions.copyFailed"));
    }
  }

  function copy(): void {
    const texts = selection.map((verse) => document.querySelector(`#v${verse} .verse-text`)?.textContent ?? "");
    void writeClipboard(formatCopy(texts, selectionReference, translationName), t("actions.copied"));
  }

  async function share(): Promise<void> {
    const query = first === undefined ? "" : `?v=${formatFocus(first, last)}#v${first}`;
    const url = `${window.location.origin}/bible/lsg/${bookSlug}/${chapter}${query}`;
    if (typeof navigator.share !== "function") {
      await writeClipboard(url, t("actions.linkCopied"));
      return;
    }
    try {
      await navigator.share({ title: selectionReference, url });
    } catch {
      // Partage annulé par l'utilisateur : rien à signaler.
    }
  }

  function highlight(color: HighlightColorName | null): void {
    if (requireAccount()) {
      void run(
        () => setHighlightAction({ bookId, chapter, ranges, color }),
        () => t(color ? "actions.highlighted" : "actions.highlightRemoved"),
      );
    }
  }

  function bookmark(): void {
    if (requireAccount()) {
      void run(
        () => toggleBookmarkAction({ bookId, chapter, ranges }),
        ({ added }) => t(added ? "actions.bookmarkAdded" : "actions.bookmarkRemoved"),
      );
    }
  }

  function changePrefs(next: ReaderPrefs): void {
    setPrefs(next);
    applyReaderPrefs(next);
    try {
      localStorage.setItem(READER_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Stockage indisponible : le réglage vaut pour cette page.
    }
    if (canPersist) void saveReaderPrefsAction(next);
  }

  return (
    <>
      <ReaderHeader
        reference={reference}
        translationShortName={translationShortName}
        focusMode={focusMode}
        onToggleFocus={() => setFocusMode((value) => !value)}
        onOpenSelector={() => setPanel("selector")}
        onOpenSettings={() => setPanel("settings")}
      />
      {navigating ? <ChapterSkeleton /> : null}
      <p role="status" aria-live="polite" className="sr-only">
        {selected.size > 0 ? t("actions.selected", { count: selected.size }) : ""}
      </p>
      {selected.size > 0 ? (
        <ReaderActionBar
          reference={selectionReference}
          busy={busy}
          onClear={clear}
          onCopy={copy}
          onHighlight={highlight}
          onNote={() => {
            if (requireAccount()) setPanel("note");
          }}
          onBookmark={bookmark}
          onShare={() => void share()}
        />
      ) : null}
      {panel === "selector" ? <SelectorSheet currentBookId={bookId} onClose={() => setPanel(null)} /> : null}
      {panel === "settings" ? <SettingsSheet prefs={prefs} persisted={canPersist} onChange={changePrefs} onClose={() => setPanel(null)} /> : null}
      {panel === "note" && first !== undefined && last !== undefined ? (
        <NoteSheet
          reference={formatSelectionReference(bookName, chapter, first === last ? [first] : Array.from({ length: last - first + 1 }, (_, index) => first + index))}
          onClose={() => setPanel(null)}
          onSubmit={(body) => addNoteAction({ bookId, chapter, range: { verseStart: first, verseEnd: last }, body })}
          onSaved={() => {
            clear();
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
