"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const verseElements = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>("#verses [data-v]"));
const verseNumber = (element: HTMLElement): number => Number(element.dataset["v"]);
const controlOf = (verse: HTMLElement): HTMLElement | null => verse.querySelector<HTMLElement>(".verse-number");

/** Un seul point d'entrée au clavier dans le chapitre : le bouton du verset actif. */
function setActive(verses: readonly HTMLElement[], target: HTMLElement): void {
  for (const verse of verses) {
    const control = controlOf(verse);
    if (control) control.tabIndex = verse === target ? 0 : -1;
  }
}

export interface VerseSelection {
  selected: ReadonlySet<number>;
  /** Une sélection a existé : permet d'annoncer son effacement. */
  hasSelected: boolean;
  clear: () => void;
}

/**
 * Sélection au toucher et au clavier sur le texte rendu par le serveur. Le chapitre reste un texte (un paragraphe par
 * verset) que les lecteurs d'écran lisent d'un trait ; seul le numéro de chaque verset devient un bouton bascule.
 * Le motif listbox, qui transformait tout le chapitre en liste de choix, a été écarté (revue d'accessibilité, E6).
 */
export function useVerseSelection(helpId: string): VerseSelection {
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [hasSelected, setHasSelected] = useState(false);
  const anchor = useRef<number | null>(null);
  /** Sélection hors de la plage en cours : Maj+flèche peut ainsi réduire la plage autant que l'étendre. */
  const base = useRef<ReadonlySet<number>>(new Set());

  const toggle = useCallback((verse: number) => {
    setHasSelected(true);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(verse)) next.delete(verse);
      else next.add(verse);
      base.current = next;
      return next;
    });
    anchor.current = verse;
  }, []);

  const extendTo = useCallback((verse: number, from: number) => {
    anchor.current ??= from;
    const start = anchor.current;
    setHasSelected(true);
    setSelected(() => {
      const next = new Set(base.current);
      for (let v = Math.min(start, verse); v <= Math.max(start, verse); v += 1) next.add(v);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelected(new Set());
    anchor.current = null;
    base.current = new Set();
  }, []);

  useEffect(() => {
    const list = document.getElementById("verses");
    if (!list) return;
    const verses = verseElements();
    list.dataset["selectable"] = "";
    for (const verse of verses) {
      const control = controlOf(verse);
      if (!control) continue;
      control.setAttribute("role", "button");
      control.setAttribute("aria-pressed", "false");
      control.setAttribute("aria-describedby", helpId);
    }
    const target = document.getElementById(window.location.hash.slice(1));
    const active = verses.find((verse) => verse === target) ?? verses[0];
    if (active) setActive(verses, active);

    const onMouseDown = (event: MouseEvent): void => {
      // Maj+clic étend la sélection de versets, pas la sélection de texte du navigateur.
      if (event.shiftKey) event.preventDefault();
    };

    // Un lecteur d'écran active le bouton par un clic simulé : ce même gestionnaire le traite.
    const onClick = (event: MouseEvent): void => {
      const verse = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-v]") : null;
      // Un glissé de sélection de texte natif reste une sélection de texte.
      if (!verse || !window.getSelection()?.isCollapsed) return;
      setActive(verses, verse);
      if (event.shiftKey && anchor.current !== null) extendTo(verseNumber(verse), anchor.current);
      else toggle(verseNumber(verse));
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.target instanceof HTMLElement) || !event.target.matches(".verse-number")) return;
      const current = event.target.closest<HTMLElement>("[data-v]");
      if (!current) return;
      const index = verses.indexOf(current);
      const moveTo = (next: HTMLElement | undefined): void => {
        if (!next) return;
        setActive(verses, next);
        controlOf(next)?.focus();
      };
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const next = verses[index + (event.key === "ArrowDown" ? 1 : -1)];
        moveTo(next);
        if (event.shiftKey && next) extendTo(verseNumber(next), verseNumber(current));
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        moveTo(event.key === "Home" ? verses[0] : verses.at(-1));
      } else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        toggle(verseNumber(current));
      }
    };

    list.addEventListener("mousedown", onMouseDown);
    list.addEventListener("click", onClick);
    list.addEventListener("keydown", onKeyDown);
    return () => {
      list.removeEventListener("mousedown", onMouseDown);
      list.removeEventListener("click", onClick);
      list.removeEventListener("keydown", onKeyDown);
    };
  }, [toggle, extendTo, helpId]);

  useEffect(() => {
    for (const verse of verseElements()) {
      const isSelected = selected.has(verseNumber(verse));
      if (isSelected) verse.dataset["selected"] = "";
      else delete verse.dataset["selected"];
      controlOf(verse)?.setAttribute("aria-pressed", String(isSelected));
    }
    if (selected.size > 0) document.documentElement.dataset["readerSelecting"] = "";
    else delete document.documentElement.dataset["readerSelecting"];
  }, [selected]);

  return { selected, hasSelected, clear };
}
