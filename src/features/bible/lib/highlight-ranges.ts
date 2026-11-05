import type { HighlightColorName, VerseRange } from "../types";

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

function mergeAdjacent(ranges: readonly ColoredRange[]): ColoredRange[] {
  const merged: ColoredRange[] = [];
  for (const range of [...ranges].sort((a, b) => a.verseStart - b.verseStart)) {
    const last = merged.at(-1);
    if (last?.color === range.color && last.verseEnd + 1 === range.verseStart) last.verseEnd = range.verseEnd;
    else merged.push({ ...range });
  }
  return merged;
}
