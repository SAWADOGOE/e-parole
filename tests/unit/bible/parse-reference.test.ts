import { describe, expect, it } from "vitest";
import { foldText, parseReference, suggestBooks, type ParsedReference, type ReferenceBook } from "@/features/bible/lib/parse-reference";
import { BIBLE_BOOKS } from "../../../prisma/seed/bible-catalog";

const fold = (value: string): string => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, "");

const VERSE_COUNTS: Readonly<Record<string, Readonly<Record<number, number>>>> = {
  JHN: { 3: 36, 21: 25 },
  PSA: { 23: 6, 119: 176 },
  "1CO": { 13: 13 },
  REV: { 22: 21 },
  JUD: { 1: 25 },
};

const BOOKS: ReferenceBook[] = BIBLE_BOOKS.map((book) => ({
  id: book.id,
  name: book.name,
  abbreviations: [fold(book.name), ...book.abbreviations],
  chapterCount: book.chapterCount,
  verseCounts: VERSE_COUNTS[book.id] ?? {},
}));

const ref = (bookId: string, chapter: number, verseStart?: number, verseEnd?: number): ParsedReference => ({
  bookId,
  chapter,
  ...(verseStart !== undefined ? { verseStart } : {}),
  ...(verseEnd !== undefined ? { verseEnd } : {}),
});

const VALID: readonly (readonly [string, ParsedReference])[] = [
  ["Jean 3:16", ref("JHN", 3, 16)],
  ["jn 3 16", ref("JHN", 3, 16)],
  ["Jean 3.16", ref("JHN", 3, 16)],
  ["Jean 3,16", ref("JHN", 3, 16)],
  ["Jean 3 v16", ref("JHN", 3, 16)],
  ["Jean 3 v. 16", ref("JHN", 3, 16)],
  ["Jean 3 verset 16", ref("JHN", 3, 16)],
  ["  JEAN   3 :  16  ", ref("JHN", 3, 16)],
  ["jn3:16", ref("JHN", 3, 16)],
  ["jn. 3:16", ref("JHN", 3, 16)],
  ["Jean 3", ref("JHN", 3)],
  ["Jean", { ...ref("JHN", 1), wholeBook: true }],
  ["Actes des Apôtres 2:38", ref("ACT", 2, 38)],
  ["1 Co 13:4-7", ref("1CO", 13, 4, 7)],
  ["1Co 13:4-7", ref("1CO", 13, 4, 7)],
  ["1co13:4-7", ref("1CO", 13, 4, 7)],
  ["1 Co 13:4–7", ref("1CO", 13, 4, 7)],
  ["1 Co 13:4—7", ref("1CO", 13, 4, 7)],
  ["1 Co 13:4 à 7", ref("1CO", 13, 4, 7)],
  ["1 Co 13:4 au 7", ref("1CO", 13, 4, 7)],
  ["1 Corinthiens 13", ref("1CO", 13)],
  ["I Corinthiens 13", ref("1CO", 13)],
  ["II Corinthiens 5", ref("2CO", 5)],
  ["1ère Corinthiens 13", ref("1CO", 13)],
  ["1re Corinthiens 13", ref("1CO", 13)],
  ["Première Corinthiens 13", ref("1CO", 13)],
  ["2e Corinthiens 5", ref("2CO", 5)],
  ["2ème Timothée 3:16", ref("2TI", 3, 16)],
  ["Deuxième Pierre 1", ref("2PE", 1)],
  ["Seconde Corinthiens 5", ref("2CO", 5)],
  ["III Jean 4", ref("3JN", 1, 4)],
  ["3e Jean 4", ref("3JN", 1, 4)],
  ["1 Jean 4:8", ref("1JN", 4, 8)],
  ["1 Jn 4:8", ref("1JN", 4, 8)],
  ["Psaume 23", ref("PSA", 23)],
  ["Psaumes 23", ref("PSA", 23)],
  ["ps23", ref("PSA", 23)],
  ["Ps 23:1", ref("PSA", 23, 1)],
  ["ps 119:105", ref("PSA", 119, 105)],
  ["Psaume", { ...ref("PSA", 1), wholeBook: true }],
  ["Romains 8", ref("ROM", 8)],
  ["Rm 8:28", ref("ROM", 8, 28)],
  ["Ro 8:28", ref("ROM", 8, 28)],
  ["Ap 22:21", ref("REV", 22, 21)],
  ["Apocalypse 22", ref("REV", 22)],
  ["Genèse 1:1", ref("GEN", 1, 1)],
  ["genese 1", ref("GEN", 1)],
  ["GENESE 1", ref("GEN", 1)],
  ["Gn 1:1", ref("GEN", 1, 1)],
  ["Ésaïe 53:5", ref("ISA", 53, 5)],
  ["Esaie 53", ref("ISA", 53)],
  ["Isaïe 53", ref("ISA", 53)],
  ["Es 53:5", ref("ISA", 53, 5)],
  ["Cantique des cantiques 2:1", ref("SNG", 2, 1)],
  ["Cantique 2", ref("SNG", 2)],
  ["Ct 2", ref("SNG", 2)],
  ["Ecclésiaste 3:1", ref("ECC", 3, 1)],
  ["Qo 3", ref("ECC", 3)],
  ["Ézéchiel 37", ref("EZK", 37)],
  ["Hébreux 11:1", ref("HEB", 11, 1)],
  ["Philémon 3", ref("PHM", 1, 3)],
  ["Jude 5", ref("JUD", 1, 5)],
  ["Jude 1:5", ref("JUD", 1, 5)],
  ["Jude 3-5", ref("JUD", 1, 3, 5)],
  ["Abdias 3", ref("OBA", 1, 3)],
  ["2 Jean 6", ref("2JN", 1, 6)],
  ["Jean 3:16-16", ref("JHN", 3, 16)],
  ["Psaumes 23-24", ref("PSA", 23)],
  ["Jean 3:16-4:2", ref("JHN", 3, 16)],
];

const NOT_REFERENCES = ["grace", "grâce", "bon berger", "\"le bon berger\"", "foi -oeuvres", "la", "es", "de", "le", "", "   ", "?", "3:16", "16", "x".repeat(81)];

describe("parseReference — références valides", () => {
  it.each(VALID)("%s", (input, expected) => {
    expect(parseReference(input, BOOKS)).toEqual({ ok: true, reference: expected });
  });
});

describe("parseReference — chaque livre, par nom et par abréviation", () => {
  const cases = BOOKS.flatMap((book) => book.abbreviations.map((form) => [form, book.id] as const));

  it("couvre au moins 200 formes", () => {
    expect(cases.length).toBeGreaterThanOrEqual(200);
  });

  it.each(cases)("%s 1:1 → %s", (form, id) => {
    expect(parseReference(`${form} 1:1`, BOOKS)).toEqual({ ok: true, reference: ref(id, 1, 1) });
  });

  it("aucune abréviation n'est partagée par deux livres", () => {
    const forms = BOOKS.flatMap((book) => book.abbreviations.filter((form, index, all) => all.indexOf(form) === index));
    expect(new Set(forms).size).toBe(forms.length);
  });
});

describe("parseReference — saisies qui relèvent de la recherche", () => {
  it.each(NOT_REFERENCES)("« %s »", (input) => {
    expect(parseReference(input, BOOKS)).toEqual({ ok: false, error: { code: "NOT_A_REFERENCE" } });
  });
});

describe("parseReference — erreurs avec suggestion", () => {
  it("chapitre hors limites : Jean 30 propose Jean 21", () => {
    expect(parseReference("Jean 30", BOOKS)).toEqual({
      ok: false,
      error: { code: "CHAPTER_OUT_OF_RANGE", bookId: "JHN", chapter: 30, maxChapter: 21, suggestion: ref("JHN", 21) },
    });
  });

  it("chapitre 0 propose le chapitre 1", () => {
    expect(parseReference("Jean 0", BOOKS)).toMatchObject({ ok: false, error: { code: "CHAPTER_OUT_OF_RANGE", suggestion: ref("JHN", 1) } });
  });

  it("verset hors limites : Jean 3:99 propose le dernier verset", () => {
    expect(parseReference("Jean 3:99", BOOKS)).toEqual({
      ok: false,
      error: { code: "VERSE_OUT_OF_RANGE", bookId: "JHN", chapter: 3, verse: 99, maxVerse: 36, suggestion: ref("JHN", 3, 36) },
    });
  });

  it("fin de plage hors limites : la suggestion est ramenée au dernier verset", () => {
    expect(parseReference("Jean 3:30-99", BOOKS)).toEqual({
      ok: false,
      error: { code: "VERSE_OUT_OF_RANGE", bookId: "JHN", chapter: 3, verse: 99, maxVerse: 36, suggestion: ref("JHN", 3, 30, 36) },
    });
  });

  it("verset 0", () => {
    expect(parseReference("Jean 3:0", BOOKS)).toMatchObject({ ok: false, error: { code: "VERSE_OUT_OF_RANGE" } });
  });

  it("Jude 99 : verset hors limites dans un livre d'un seul chapitre", () => {
    expect(parseReference("Jude 99", BOOKS)).toMatchObject({ ok: false, error: { code: "VERSE_OUT_OF_RANGE" } });
  });

  it("plage inversée : propose l'ordre correct", () => {
    expect(parseReference("1 Co 13:7-4", BOOKS)).toEqual({
      ok: false,
      error: { code: "INVALID_RANGE", bookId: "1CO", chapter: 13, suggestion: ref("1CO", 13, 4, 7) },
    });
  });

  it("livre inconnu suivi d'un chiffre : suggestions", () => {
    const result = parseReference("Jeen 3:16", BOOKS);
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.code === "UNKNOWN_BOOK") expect(result.error.suggestions).toContain("JHN");
    else throw new Error("UNKNOWN_BOOK attendu");
  });

  it("un chapitre sans décompte connu n'est pas rejeté sur ses versets", () => {
    expect(parseReference("Genèse 1:999", BOOKS)).toEqual({ ok: true, reference: ref("GEN", 1, 999) });
  });
});

describe("suggestBooks", () => {
  it("« Jea » propose Jean, 1 Jean n'étant pas un préfixe", () => {
    expect(suggestBooks("Jea", BOOKS)).toContain("JHN");
  });

  it("« Ja » propose Jacques", () => {
    expect(suggestBooks("Ja", BOOKS)).toContain("JAS");
  });

  it("tolère une faute de frappe", () => {
    expect(suggestBooks("Romins", BOOKS)).toContain("ROM");
  });

  it("une saisie vide ne propose rien", () => {
    expect(suggestBooks("  ", BOOKS)).toEqual([]);
  });

  it("limite le nombre de suggestions", () => {
    expect(suggestBooks("1", BOOKS).length).toBeLessThanOrEqual(5);
  });
});

describe("foldText", () => {
  it("retire accents et casse, unifie les tirets et les espaces", () => {
    expect(foldText("  Ésaïe   53–5 ")).toBe("esaie 53-5");
    expect(foldText("cœur")).toBe("coeur");
  });
});
