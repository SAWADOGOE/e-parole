import { THEME_STORAGE_KEY } from "@/components/shared/theme-constants";
import { READER_FONTS, READER_FONT_SIZES, READER_LINE_HEIGHTS, READER_STORAGE_KEY, READER_THEMES } from "../constants";
import type { ReaderPrefs } from "../types";

export const DEFAULT_READER_PREFS: ReaderPrefs = {
  fontSize: 19,
  lineHeight: 1.7,
  theme: "SYSTEM",
  font: "SERIF",
  showVerseNumbers: true,
};

/** Accepte une préférence locale seulement si chaque valeur est connue : le stockage du navigateur n'est pas fiable. */
export function parseStoredPrefs(raw: string | null): ReaderPrefs | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ReaderPrefs> | null;
    if (
      value === null ||
      !(READER_FONT_SIZES as readonly unknown[]).includes(value.fontSize) ||
      !(READER_LINE_HEIGHTS as readonly unknown[]).includes(value.lineHeight) ||
      !(READER_THEMES as readonly unknown[]).includes(value.theme) ||
      !(READER_FONTS as readonly unknown[]).includes(value.font) ||
      typeof value.showVerseNumbers !== "boolean"
    ) {
      return null;
    }
    return value as ReaderPrefs;
  } catch {
    return null;
  }
}

function systemOrStoredDark(): boolean {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    stored = null;
  }
  return stored === "dark" || (stored !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
}

export function applyReaderPrefs(prefs: ReaderPrefs): void {
  const root = document.documentElement;
  root.style.setProperty("--reader-size", `${prefs.fontSize}px`);
  root.style.setProperty("--reader-leading", String(prefs.lineHeight));
  root.dataset["readerFont"] = prefs.font.toLowerCase();
  root.dataset["readerNumbers"] = prefs.showVerseNumbers ? "on" : "off";
  if (prefs.theme === "SEPIA") root.dataset["readerTheme"] = "sepia";
  else delete root.dataset["readerTheme"];
  root.classList.toggle("dark", prefs.theme === "DARK" || (prefs.theme === "SYSTEM" && systemOrStoredDark()));
}

/** En quittant le lecteur, l'application retrouve son thème global. */
export function clearReaderPrefs(): void {
  const root = document.documentElement;
  root.style.removeProperty("--reader-size");
  root.style.removeProperty("--reader-leading");
  for (const attribute of ["data-reader-font", "data-reader-numbers", "data-reader-theme", "data-reader-focus", "data-reader-selecting"]) root.removeAttribute(attribute);
  root.classList.toggle("dark", systemOrStoredDark());
}

/**
 * Exécuté avant la première peinture (pas de flash). Reprend applyReaderPrefs : ce code doit rester du JavaScript
 * autonome, car il part en ligne dans la page avec le nonce de la requête.
 * Les préférences serveur (connecté) arrivent par data-prefs ; sinon celles du navigateur (visiteur).
 */
export const READER_BOOT_SCRIPT = `(function(){try{var s=document.currentScript,r=s&&s.dataset.prefs,p=JSON.parse(r||localStorage.getItem("${READER_STORAGE_KEY}")||"null");if(!p)return;var h=document.documentElement;h.style.setProperty("--reader-size",Number(p.fontSize)+"px");h.style.setProperty("--reader-leading",String(Number(p.lineHeight)));h.dataset.readerFont=p.font==="SANS"?"sans":"serif";h.dataset.readerNumbers=p.showVerseNumbers===false?"off":"on";if(p.theme==="SEPIA"){h.dataset.readerTheme="sepia";h.classList.remove("dark")}else if(p.theme==="DARK"){h.classList.add("dark")}else if(p.theme==="LIGHT"){h.classList.remove("dark")}}catch(e){}})();`;
