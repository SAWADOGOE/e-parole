import type { SourceVerse } from "./types";

/**
 * Coquilles typographiques de la source, corrigées sur décision explicite du propriétaire du projet (2026-11-05).
 * Seule voie de correction du texte : elle s'applique à l'import, crée une nouvelle version et reste tracée.
 * Une entrée corrige une faute de frappe avérée, jamais une leçon, une traduction ou une tournure.
 */
export interface Erratum {
  book: string;
  chapter: number;
  verse: number;
  from: string;
  to: string;
  evidence: string;
}

export const ERRATA: Readonly<Record<string, readonly Erratum[]>> = {
  lsg: [
    {
      book: "GEN",
      chapter: 50,
      verse: 10,
      from: "audelà",
      to: "au-delà",
      evidence: "« au-delà » écrit 54 fois dans la même source ; HelloAO fra_lsg porte « au-delà »",
    },
    {
      book: "EZK",
      chapter: 21,
      verse: 32,
      from: "n’aua",
      to: "n’aura",
      evidence: "HelloAO fra_lsg et Midvash lsg (Éz 21:27) portent « n'aura »",
    },
  ],
};

/**
 * Applique des errata en refusant toute approximation : le mot doit figurer exactement une fois.
 * Si la source a changé (coquille corrigée en amont), l'import échoue pour que l'entrée soit retirée à la main.
 * Dans un échantillon de test, un verset absent est simplement ignoré.
 */
export function applyErrata(verses: readonly SourceVerse[], errata: readonly Erratum[], options: { partial?: boolean } = {}): { verses: SourceVerse[]; applied: Erratum[] } {
  const result = [...verses];
  const applied: Erratum[] = [];
  for (const erratum of errata) {
    const label = `${erratum.book} ${erratum.chapter}:${erratum.verse}`;
    const index = result.findIndex((v) => v.book === erratum.book && v.chapter === erratum.chapter && v.verse === erratum.verse);
    const verse = result[index];
    if (!verse) {
      if (options.partial) continue;
      throw new Error(`Errata : verset absent de la source (${label})`);
    }
    if (verse.text.split(erratum.from).length !== 2) {
      throw new Error(`Errata : « ${erratum.from} » introuvable ou répété dans ${label}. La source a changé : retirer cette entrée.`);
    }
    result[index] = { ...verse, text: verse.text.replace(erratum.from, erratum.to) };
    applied.push(erratum);
  }
  return { verses: result, applied };
}
