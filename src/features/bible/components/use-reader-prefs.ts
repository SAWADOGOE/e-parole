"use client";

import { useEffect, useState } from "react";
import { READER_STORAGE_KEY } from "../constants";
import { applyReaderPrefs, clearReaderPrefs, DEFAULT_READER_PREFS, parseStoredPrefs } from "../lib/reader-prefs";
import { saveReaderPrefsAction } from "../server/actions";
import type { ReaderPrefs } from "../types";

function storedPrefs(): ReaderPrefs | null {
  try {
    return parseStoredPrefs(localStorage.getItem(READER_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Préférences : serveur si connecté, sinon navigateur. Le thème global revient en quittant le lecteur. */
export function useReaderPrefs(serverPrefs: ReaderPrefs | null, canPersist: boolean): { prefs: ReaderPrefs; changePrefs: (next: ReaderPrefs) => void } {
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => serverPrefs ?? DEFAULT_READER_PREFS);
  // router.refresh() recrée l'objet : seule une valeur différente doit réappliquer les réglages.
  const serverKey = JSON.stringify(serverPrefs);

  useEffect(() => {
    const initial = parseStoredPrefs(serverKey) ?? storedPrefs();
    if (!initial) return;
    // localStorage n'existe pas au rendu serveur : la valeur du visiteur ne peut être lue qu'après montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(initial);
    applyReaderPrefs(initial);
  }, [serverKey]);

  useEffect(() => clearReaderPrefs, []);

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

  return { prefs, changePrefs };
}
