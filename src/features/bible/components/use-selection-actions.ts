"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { errorKey } from "@/lib/error-key";
import { notify, notifyError } from "@/lib/notify";
import { formatCopy, formatFocus, toRanges } from "../lib/format";
import { setHighlightAction, toggleBookmarkAction } from "../server/actions";
import type { HighlightColorName } from "../types";

interface SelectionContext {
  bookId: string;
  bookSlug: string;
  chapter: number;
  translationName: string;
  selection: readonly number[];
  selectionReference: string;
  isSignedIn: boolean;
  onDone: () => void;
}

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code: string } };

/** Actions de la barre de sélection : copier, partager, surligner, favori. */
export function useSelectionActions(context: SelectionContext) {
  const { bookId, bookSlug, chapter, translationName, selection, selectionReference, isSignedIn, onDone } = context;
  const t = useTranslations("bible");
  const tErrors = useTranslations("errors.codes");
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const ranges = useMemo(() => toRanges(selection), [selection]);

  function requireAccount(): boolean {
    if (isSignedIn) return true;
    notify(t("actions.signInRequired"));
    router.push(`/connexion?retour=${encodeURIComponent(pathname)}` as Route);
    return false;
  }

  async function run<T>(call: () => Promise<ActionResult<T>>, done: (data: T) => string): Promise<void> {
    setBusy(true);
    try {
      const result = await call();
      if (!result.ok) {
        notifyError(tErrors(errorKey(result.error.code)));
        return;
      }
      notify(done(result.data));
      onDone();
      router.refresh();
    } catch {
      // Une Server Action rejette si le réseau tombe : cas courant sur la 3G de nos lecteurs.
      notifyError(tErrors("INTERNAL"));
    } finally {
      setBusy(false);
    }
  }

  async function writeClipboard(text: string, success: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      notify(success);
    } catch {
      notifyError(t("actions.copyFailed"));
    }
  }

  function copy(): void {
    const texts = selection.map((verse) => document.querySelector(`#v${verse} .verse-text`)?.textContent ?? "");
    void writeClipboard(formatCopy(texts, selectionReference, translationName), t("actions.copied"));
  }

  async function share(): Promise<void> {
    const first = selection[0];
    const query = first === undefined ? "" : `?v=${formatFocus(first, selection.at(-1))}#v${first}`;
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
    if (!requireAccount()) return;
    void run(
      () => setHighlightAction({ bookId, chapter, ranges, color }),
      () => t(color ? "actions.highlighted" : "actions.highlightRemoved"),
    );
  }

  function bookmark(): void {
    if (!requireAccount()) return;
    void run(
      () => toggleBookmarkAction({ bookId, chapter, ranges }),
      ({ added }) => t(added ? "actions.bookmarkAdded" : "actions.bookmarkRemoved"),
    );
  }

  return { busy, copy, share, highlight, bookmark, requireAccount };
}
