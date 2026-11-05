import type { TranslationRecord } from "./types";

/**
 * Fiches de licence des traductions importables. Une traduction absente d'ici ne peut pas être importée.
 * Preuves et décision : docs/bible/BIBLE-LICENSING.md. Darby arrivera en Phase 6.
 */
export const TRANSLATIONS: Readonly<Record<string, TranslationRecord>> = {
  lsg: {
    code: "lsg",
    name: "Louis Segond 1910",
    language: "fr",
    licenseType: "PUBLIC_DOMAIN",
    licenseUrl: "https://ebible.org/Scriptures/details.php?id=fraLSG",
    attribution: "Louis Segond 1910 — domaine public",
    sourceUrl: "https://ebible.org/Scriptures/fraLSG_usfx.zip",
  },
};
