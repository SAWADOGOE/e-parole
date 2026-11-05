"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "eparole:preference";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

/**
 * Préférence de confort mémorisée dans le navigateur (thème, sidebar repliée).
 * Jamais pour une donnée importante : le stockage peut être vide ou indisponible.
 */
export function useStoredPreference(key: string): [string | null, (value: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const setValue = useCallback(
    (next: string | null) => {
      try {
        if (next === null) localStorage.removeItem(key);
        else localStorage.setItem(key, next);
      } catch {
        // Stockage indisponible (navigation privée) : la préférence ne sera pas mémorisée.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, setValue];
}
