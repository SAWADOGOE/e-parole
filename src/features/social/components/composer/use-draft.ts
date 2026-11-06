"use client";

import { useEffect, useRef } from "react";
import { z } from "zod";
import { POST_TYPES } from "../../constants";

const DRAFT_KEY = "eparole-brouillon-publication";

const draftSchema = z.object({
  type: z.enum(POST_TYPES),
  body: z.string().max(5000),
  verse: z.object({ bookId: z.string(), chapter: z.number(), verseStart: z.number(), verseEnd: z.number(), reference: z.string(), text: z.string(), attribution: z.string() }).nullable(),
  images: z.array(z.object({ assetId: z.string(), altText: z.string() })).max(4),
});

export type Draft = z.infer<typeof draftSchema>;

/** Le stockage peut être indisponible (navigation privée, quota) : chaque accès est protégé. */
export function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Stockage indisponible : rien à effacer.
  }
}

function isEmpty(draft: Draft): boolean {
  return draft.body.trim().length === 0 && draft.verse === null && draft.images.length === 0;
}

/** Brouillon conservé sur l'appareil (US-10) : une coupure réseau ne fait jamais perdre un témoignage. */
export function useDraftAutosave(draft: Draft, enabled: boolean): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        if (isEmpty(draft)) window.localStorage.removeItem(DRAFT_KEY);
        else window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Stockage plein ou interdit : le brouillon reste en mémoire tant que la page est ouverte.
      }
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, enabled]);
}
