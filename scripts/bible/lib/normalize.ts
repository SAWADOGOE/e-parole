import { createHash } from "node:crypto";

/**
 * Normalisation strictement technique : encodage (NFC) et espaces.
 * Aucun mot, aucune ponctuation, aucune apostrophe n'est modifié : le texte biblique reste celui de la source,
 * y compris ses coquilles éventuelles (toute correction passe par une nouvelle version de la source).
 */
export function normalizeVerseText(raw: string): string {
  return raw.normalize("NFC").replace(/\s+/gu, " ").trim();
}

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Pliage réservé au contrôle croisé entre sources (accents des capitales, ligatures, points de suspension) :
 * il ne sert qu'à comparer et ne touche jamais au texte importé.
 */
export function foldForComparison(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/…/g, "...")
    .replace(/[’ʼ]/g, "'")
    .replace(/[-‐‑]/g, " ")
    .replace(/[«»"“”]/g, "")
    .replace(/\s*([:;,.!?])\s*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
