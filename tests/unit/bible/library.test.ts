import { describe, expect, it } from "vitest";
import { formatCopy, formatReference, formatSelectionReference, parseFocus, passagePath, toRanges } from "@/features/bible/lib/format";
import { applyHighlight, type ColoredRange } from "@/features/bible/lib/highlight-ranges";
import { chapterNeighbours } from "@/features/bible/lib/navigation";
import { DEFAULT_READER_PREFS, parseStoredPrefs } from "@/features/bible/lib/reader-prefs";
import { decodeCursor, encodeCursor, HEADLINE_START, HEADLINE_STOP, splitHeadline } from "@/features/bible/lib/search-text";
import { pickFromPool } from "@/features/bible/server/daily-verse";
import type { CatalogBook } from "@/features/bible/types";

function book(id: string, order: number, name: string, chapters: number): CatalogBook {
  const verseCounts: Record<number, number> = {};
  for (let chapter = 1; chapter <= chapters; chapter += 1) verseCounts[chapter] = 10;
  return { id, order, name, slug: name.toLowerCase(), testament: "NT", chapterCount: chapters, abbreviations: [], verseCounts };
}

describe("références et copie", () => {
  it("formate une référence", () => {
    expect(formatReference("Jean", 3)).toBe("Jean 3");
    expect(formatReference("Jean", 3, 16)).toBe("Jean 3:16");
    expect(formatReference("Jean", 3, 16, 16)).toBe("Jean 3:16");
    expect(formatReference("1 Corinthiens", 13, 4, 7)).toBe("1 Corinthiens 13:4-7");
  });

  it("regroupe une sélection en plages contiguës", () => {
    expect(toRanges([7, 1, 3, 2, 2])).toEqual([
      { verseStart: 1, verseEnd: 3 },
      { verseStart: 7, verseEnd: 7 },
    ]);
    expect(toRanges([])).toEqual([]);
  });

  it("formate une sélection discontinue", () => {
    expect(formatSelectionReference("Jean", 3, [16, 18, 19])).toBe("Jean 3:16, 18-19");
  });

  it("copie au format attendu", () => {
    expect(formatCopy(["Car Dieu a tant aimé le monde…"], "Jean 3:16", "Louis Segond 1910")).toBe("« Car Dieu a tant aimé le monde… » — Jean 3:16 (Louis Segond 1910)");
    expect(formatCopy(["Un.", "Deux."], "Jean 3:1-2", "Louis Segond 1910")).toBe("« Un. Deux. » — Jean 3:1-2 (Louis Segond 1910)");
  });

  it("lit le paramètre de plage ciblée et refuse le reste", () => {
    expect(parseFocus("16")).toEqual({ verseStart: 16, verseEnd: 16 });
    expect(parseFocus("4-7")).toEqual({ verseStart: 4, verseEnd: 7 });
    for (const value of ["7-4", "0", "abc", "1-", undefined, "<script>"]) expect(parseFocus(value)).toBeNull();
  });

  it("construit un lien direct", () => {
    expect(passagePath("jean", 3)).toBe("/bible/lsg/jean/3");
    expect(passagePath("jean", 3, 16)).toBe("/bible/lsg/jean/3?v=16#v16");
    expect(passagePath("1-corinthiens", 13, 4, 7)).toBe("/bible/lsg/1-corinthiens/13?v=4-7#v4");
  });
});

describe("navigation entre chapitres", () => {
  const books = [book("LUK", 42, "Luc", 24), book("JHN", 43, "Jean", 21), book("ACT", 44, "Actes", 28), book("REV", 66, "Apocalypse", 22)];

  it("Jean 21 mène à Actes 1", () => {
    expect(chapterNeighbours(books, "JHN", 21).next).toEqual({ bookName: "Actes", bookSlug: "actes", chapter: 1 });
  });

  it("Jean 1 revient à Luc 24", () => {
    expect(chapterNeighbours(books, "JHN", 1).previous).toEqual({ bookName: "Luc", bookSlug: "luc", chapter: 24 });
  });

  it("reste dans le livre en milieu de livre", () => {
    const { previous, next } = chapterNeighbours(books, "JHN", 3);
    expect(previous?.chapter).toBe(2);
    expect(next?.chapter).toBe(4);
  });

  it("Apocalypse 22 n'a pas de suivant, le premier chapitre pas de précédent", () => {
    expect(chapterNeighbours(books, "REV", 22).next).toBeNull();
    expect(chapterNeighbours(books, "LUK", 1).previous).toBeNull();
  });

  it("ignore un chapitre non importé", () => {
    const partial = { ...book("JHN", 43, "Jean", 21), verseCounts: { 3: 36, 10: 42 } };
    expect(chapterNeighbours([partial], "JHN", 3).next?.chapter).toBe(10);
    expect(chapterNeighbours([partial], "JHN", 4)).toEqual({ previous: null, next: null });
  });
});

describe("surlignages", () => {
  const yellow: ColoredRange = { verseStart: 3, verseEnd: 8, color: "YELLOW" };

  it("ajoute sans chevauchement", () => {
    expect(applyHighlight([], { verseStart: 1, verseEnd: 2 }, "GREEN")).toEqual([{ verseStart: 1, verseEnd: 2, color: "GREEN" }]);
  });

  it("découpe un surlignage recouvert en son milieu", () => {
    expect(applyHighlight([yellow], { verseStart: 5, verseEnd: 6 }, "BLUE")).toEqual([
      { verseStart: 3, verseEnd: 4, color: "YELLOW" },
      { verseStart: 5, verseEnd: 6, color: "BLUE" },
      { verseStart: 7, verseEnd: 8, color: "YELLOW" },
    ]);
  });

  it("retire une partie", () => {
    expect(applyHighlight([yellow], { verseStart: 3, verseEnd: 5 }, null)).toEqual([{ verseStart: 6, verseEnd: 8, color: "YELLOW" }]);
  });

  it("retirer sur une plage vide ne change rien", () => {
    expect(applyHighlight([yellow], { verseStart: 20, verseEnd: 21 }, null)).toEqual([yellow]);
  });

  it("fusionne les plages voisines de même couleur", () => {
    expect(applyHighlight([yellow], { verseStart: 9, verseEnd: 10 }, "YELLOW")).toEqual([{ verseStart: 3, verseEnd: 10, color: "YELLOW" }]);
  });

  it("remplace la couleur d'une plage identique", () => {
    expect(applyHighlight([yellow], { verseStart: 3, verseEnd: 8 }, "PINK")).toEqual([{ verseStart: 3, verseEnd: 8, color: "PINK" }]);
  });
});

describe("recherche", () => {
  it("découpe ts_headline sans produire de HTML", () => {
    const headline = `La ${HEADLINE_START}grâce${HEADLINE_STOP} <b>soit</b> avec ${HEADLINE_START}vous${HEADLINE_STOP}`;
    expect(splitHeadline(headline)).toEqual([
      { text: "La ", match: false },
      { text: "grâce", match: true },
      { text: " <b>soit</b> avec ", match: false },
      { text: "vous", match: true },
    ]);
  });

  it("le curseur fait l'aller-retour", () => {
    expect(decodeCursor(encodeCursor("0.1", 42))).toEqual({ rank: "0.1", id: 42 });
    expect(decodeCursor(encodeCursor("1e-05", 7))).toEqual({ rank: "1e-05", id: 7 });
  });

  it("refuse un curseur forgé", () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("n'importe-quoi")).toBeNull();
    expect(decodeCursor(Buffer.from("0; DROP TABLE:1").toString("base64url"))).toBeNull();
    expect(decodeCursor(encodeCursor("1e999", 1))).toBeNull();
    expect(decodeCursor(encodeCursor("0.1", 9_999_999_999))).toBeNull();
  });
});

describe("préférences de lecture locales", () => {
  it("accepte une valeur complète", () => {
    expect(parseStoredPrefs(JSON.stringify(DEFAULT_READER_PREFS))).toEqual(DEFAULT_READER_PREFS);
  });

  it("refuse une valeur vide, corrompue ou hors plage", () => {
    for (const raw of [null, "", "{", "null", JSON.stringify({ ...DEFAULT_READER_PREFS, fontSize: 99 }), JSON.stringify({ ...DEFAULT_READER_PREFS, theme: "NEON" })]) {
      expect(parseStoredPrefs(raw)).toBeNull();
    }
  });
});

describe("sélection automatique du verset du jour", () => {
  const pool = [1, 2, 3, 4].map((chapter) => ({ bookId: "PSA", chapter, verseStart: 1, verseEnd: 1 }));
  const date = new Date("2026-11-05T00:00:00Z");

  it("est déterministe pour une date", () => {
    expect(pickFromPool(date, pool, [])).toEqual(pickFromPool(date, pool, []));
  });

  it("écarte les références récentes", () => {
    const [first, second, third] = pool;
    const picked = pickFromPool(date, pool, [first!, second!, third!]);
    expect(picked).toEqual(pool[3]);
  });

  it("réutilise la liste si tout a été vu, et renvoie null si elle est vide", () => {
    expect(pickFromPool(date, pool, pool)).not.toBeNull();
    expect(pickFromPool(date, [], [])).toBeNull();
  });
});
