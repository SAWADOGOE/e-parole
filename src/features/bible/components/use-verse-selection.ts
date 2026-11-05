"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const verseElements = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>("#verses [data-v]"));
const verseNumber = (element: HTMLElement): number => Number(element.dataset["v"]);

function moveFocus(from: HTMLElement, to: HTMLElement | undefined): void {
  if (!to) return;
  from.tabIndex = -1;
  to.tabIndex = 0;
  to.focus();
}

export interface VerseSelection {
  selected: ReadonlySet<number>;
  clear: () => void;
}

/**
 * Sélection au toucher et au clavier sur le texte rendu par le serveur : motif listbox multisélection,
 * posé après hydratation pour que la lecture sans JavaScript reste un simple article.
 */
export function useVerseSelection(): VerseSelection {
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const anchor = useRef<number | null>(null);

  const toggle = useCallback((verse: number, extend: boolean) => {
    const from = anchor.current;
    setSelected((current) => {
      const next = new Set(current);
      if (extend && from !== null) {
        for (let v = Math.min(from, verse); v <= Math.max(from, verse); v += 1) next.add(v);
      } else if (next.has(verse)) {
        next.delete(verse);
      } else {
        next.add(verse);
      }
      return next;
    });
    if (!extend) anchor.current = verse;
  }, []);

  const clear = useCallback(() => {
    setSelected(new Set());
    anchor.current = null;
  }, []);

  useEffect(() => {
    const list = document.getElementById("verses");
    if (!list) return;
    const verses = verseElements();
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-multiselectable", "true");
    verses.forEach((element, index) => {
      element.setAttribute("role", "option");
      element.setAttribute("aria-selected", "false");
      element.tabIndex = index === 0 ? 0 : -1;
    });

    const onClick = (event: MouseEvent): void => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-v]") : null;
      // Un glissé de sélection de texte natif reste une sélection de texte.
      if (!target || !window.getSelection()?.isCollapsed) return;
      for (const element of verses) element.tabIndex = -1;
      target.tabIndex = 0;
      toggle(verseNumber(target), event.shiftKey);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      const current = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>("[data-v]") : null;
      if (!current) return;
      const index = verses.indexOf(current);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const next = verses[index + (event.key === "ArrowDown" ? 1 : -1)];
        moveFocus(current, next);
        if (event.shiftKey && next) {
          anchor.current ??= verseNumber(current);
          toggle(verseNumber(next), true);
        }
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        moveFocus(current, event.key === "Home" ? verses[0] : verses.at(-1));
      } else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        toggle(verseNumber(current), event.shiftKey);
      }
    };

    list.addEventListener("click", onClick);
    list.addEventListener("keydown", onKeyDown);
    return () => {
      list.removeEventListener("click", onClick);
      list.removeEventListener("keydown", onKeyDown);
    };
  }, [toggle]);

  useEffect(() => {
    for (const element of verseElements()) element.setAttribute("aria-selected", String(selected.has(verseNumber(element))));
    if (selected.size > 0) document.documentElement.dataset["readerSelecting"] = "";
    else delete document.documentElement.dataset["readerSelecting"];
  }, [selected]);

  return { selected, clear };
}
