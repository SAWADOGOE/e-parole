import type { HighlightColorName, VerseRange } from "../types";
import { toRanges } from "./format";

export interface ColoredRange extends VerseRange {
  color: HighlightColorName;
}

/**
 * Pose (ou retire, si color est null) un surlignage sur une plage : les surlignages existants qui la chevauchent
 * sont découpés, jamais superposés, pour qu'un verset n'ait qu'une seule couleur.
 */
export function applyHighlight(existing: readonly ColoredRange[], target: VerseRange, color: HighlightColorName | null): ColoredRange[] {
  const result: ColoredRange[] = [];
  for (const range of existing) {
    if (range.verseEnd < target.verseStart || range.verseStart > target.verseEnd) {
      result.push(range);
      continue;
    }
    if (range.verseStart < target.verseStart) result.push({ ...range, verseEnd: target.verseStart - 1 });
    if (range.verseEnd > target.verseEnd) result.push({ ...range, verseStart: target.verseEnd + 1 });
  }
  if (color !== null) result.push({ ...target, color });
  return mergeAdjacent(result);
}

/**
 * Bascule de favoris, verset par verset comme l'affichage : tout est déjà marqué, le geste retire ; sinon il complète.
 * Une plage recouverte en partie est découpée, jamais doublée.
 */
export function toggleVerseRanges(existing: readonly VerseRange[], target: readonly VerseRange[]): { next: VerseRange[]; added: boolean } {
  const expand = (ranges: readonly VerseRange[]): number[] =>
    ranges.flatMap(({ verseStart, verseEnd }) => Array.from({ length: verseEnd - verseStart + 1 }, (_, index) => verseStart + index));
  const marked = new Set(expand(existing));
  const wanted = expand(target);
  const added = !wanted.every((verse) => marked.has(verse));
  for (const verse of wanted) {
    if (added) marked.add(verse);
    else marked.delete(verse);
  }
  return { next: toRanges(marked), added };
}

function mergeAdjacent(ranges: readonly ColoredRange[]): ColoredRange[] {
  const merged: ColoredRange[] = [];
  for (const range of [...ranges].sort((a, b) => a.verseStart - b.verseStart)) {
    const last = merged.at(-1);
    if (last?.color === range.color && last.verseEnd + 1 === range.verseStart) last.verseEnd = range.verseEnd;
    else merged.push({ ...range });
  }
  return merged;
}
