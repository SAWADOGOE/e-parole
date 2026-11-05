"use client";

import { useEffect } from "react";

interface ReaderShortcuts {
  /** Un panneau est ouvert : il gère lui-même son clavier. */
  disabled: boolean;
  /** Réglage « Raccourcis à une touche » : WCAG 2.1.4 exige de pouvoir les désactiver. */
  singleKeyEnabled: boolean;
  onEscape: () => void;
  onOpenSelector: () => void;
  onToggleFocus: () => void;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
}

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

function isControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("a, button") !== null;
}

export function useReaderShortcuts(options: ReaderShortcuts): void {
  const { disabled, singleKeyEnabled, onEscape, onOpenSelector, onToggleFocus, onPrevious, onNext } = options;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      // Échap déjà traité par un panneau (Radix fait preventDefault) : il ne doit pas aussi effacer la sélection.
      if (disabled || event.defaultPrevented || isEditable(event.target)) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        onOpenSelector();
      } else if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return;
      } else if (event.key === "Escape") {
        onEscape();
      } else if (event.key === "ArrowLeft" && !isControl(event.target)) {
        onPrevious?.();
      } else if (event.key === "ArrowRight" && !isControl(event.target)) {
        onNext?.();
      } else if (singleKeyEnabled && key === "g") {
        event.preventDefault();
        onOpenSelector();
      } else if (singleKeyEnabled && key === "f") {
        onToggleFocus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [disabled, singleKeyEnabled, onEscape, onOpenSelector, onToggleFocus, onPrevious, onNext]);
}
