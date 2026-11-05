/**
 * Données de référence du module Bible : canon protestant de 66 livres, noms et abréviations françaises,
 * liste curatée de références pour le verset du jour. Aucun texte biblique ici.
 * Les abréviations sont en minuscules, sans accents ni espaces (forme comparée par le parseur).
 */
import type { PrismaClient } from "../../generated/prisma/client";

export interface BibleBookSeed {
  id: string;
  name: string;
  chapterCount: number;
  abbreviations: readonly string[];
}

export const BIBLE_BOOKS: readonly BibleBookSeed[] = [
  { id: "GEN", name: "Genèse", chapterCount: 50, abbreviations: ["gn", "ge", "gen"] },
  { id: "EXO", name: "Exode", chapterCount: 40, abbreviations: ["ex", "exo"] },
  { id: "LEV", name: "Lévitique", chapterCount: 27, abbreviations: ["lv", "lev"] },
  { id: "NUM", name: "Nombres", chapterCount: 36, abbreviations: ["nb", "no", "nom", "num"] },
  { id: "DEU", name: "Deutéronome", chapterCount: 34, abbreviations: ["dt", "de", "deu", "deut"] },
  { id: "JOS", name: "Josué", chapterCount: 24, abbreviations: ["jos"] },
  { id: "JDG", name: "Juges", chapterCount: 21, abbreviations: ["jg", "jug"] },
  { id: "RUT", name: "Ruth", chapterCount: 4, abbreviations: ["rt", "ru"] },
  { id: "1SA", name: "1 Samuel", chapterCount: 31, abbreviations: ["1s", "1sa", "1sam"] },
  { id: "2SA", name: "2 Samuel", chapterCount: 24, abbreviations: ["2s", "2sa", "2sam"] },
  { id: "1KI", name: "1 Rois", chapterCount: 22, abbreviations: ["1r", "1ro"] },
  { id: "2KI", name: "2 Rois", chapterCount: 25, abbreviations: ["2r", "2ro"] },
  { id: "1CH", name: "1 Chroniques", chapterCount: 29, abbreviations: ["1ch", "1chr", "1chro"] },
  { id: "2CH", name: "2 Chroniques", chapterCount: 36, abbreviations: ["2ch", "2chr", "2chro"] },
  { id: "EZR", name: "Esdras", chapterCount: 10, abbreviations: ["esd"] },
  { id: "NEH", name: "Néhémie", chapterCount: 13, abbreviations: ["ne", "neh"] },
  { id: "EST", name: "Esther", chapterCount: 10, abbreviations: ["est"] },
  { id: "JOB", name: "Job", chapterCount: 42, abbreviations: ["jb"] },
  { id: "PSA", name: "Psaumes", chapterCount: 150, abbreviations: ["ps", "psa", "psaume"] },
  { id: "PRO", name: "Proverbes", chapterCount: 31, abbreviations: ["pr", "pro", "prov", "proverbe"] },
  { id: "ECC", name: "Ecclésiaste", chapterCount: 12, abbreviations: ["ec", "ecc", "eccl", "qo", "qohelet"] },
  { id: "SNG", name: "Cantique des cantiques", chapterCount: 8, abbreviations: ["ct", "cc", "can", "cant", "cantique", "cantiques"] },
  { id: "ISA", name: "Ésaïe", chapterCount: 66, abbreviations: ["es", "esa", "is", "isa", "isaie"] },
  { id: "JER", name: "Jérémie", chapterCount: 52, abbreviations: ["jr", "je", "jer"] },
  { id: "LAM", name: "Lamentations", chapterCount: 5, abbreviations: ["lm", "la", "lam"] },
  { id: "EZK", name: "Ézéchiel", chapterCount: 48, abbreviations: ["ez", "eze", "ezec"] },
  { id: "DAN", name: "Daniel", chapterCount: 12, abbreviations: ["dn", "da", "dan"] },
  { id: "HOS", name: "Osée", chapterCount: 14, abbreviations: ["os", "ose"] },
  { id: "JOL", name: "Joël", chapterCount: 3, abbreviations: ["jl", "joe"] },
  { id: "AMO", name: "Amos", chapterCount: 9, abbreviations: ["am", "amo"] },
  { id: "OBA", name: "Abdias", chapterCount: 1, abbreviations: ["ab", "abd"] },
  { id: "JON", name: "Jonas", chapterCount: 4, abbreviations: ["jon"] },
  { id: "MIC", name: "Michée", chapterCount: 7, abbreviations: ["mi", "mic"] },
  { id: "NAM", name: "Nahum", chapterCount: 3, abbreviations: ["na", "nah"] },
  { id: "HAB", name: "Habacuc", chapterCount: 3, abbreviations: ["ha", "hab"] },
  { id: "ZEP", name: "Sophonie", chapterCount: 3, abbreviations: ["so", "sop", "soph"] },
  { id: "HAG", name: "Aggée", chapterCount: 2, abbreviations: ["ag", "agg"] },
  { id: "ZEC", name: "Zacharie", chapterCount: 14, abbreviations: ["za", "zac", "zach"] },
  { id: "MAL", name: "Malachie", chapterCount: 4, abbreviations: ["ml", "mal"] },
  { id: "MAT", name: "Matthieu", chapterCount: 28, abbreviations: ["mt", "mat", "matt", "mathieu"] },
  { id: "MRK", name: "Marc", chapterCount: 16, abbreviations: ["mc", "mr", "mar"] },
  { id: "LUK", name: "Luc", chapterCount: 24, abbreviations: ["lc", "lu"] },
  { id: "JHN", name: "Jean", chapterCount: 21, abbreviations: ["jn"] },
  { id: "ACT", name: "Actes", chapterCount: 28, abbreviations: ["ac", "act", "actesdesapotres"] },
  { id: "ROM", name: "Romains", chapterCount: 16, abbreviations: ["rm", "ro", "rom"] },
  { id: "1CO", name: "1 Corinthiens", chapterCount: 16, abbreviations: ["1co", "1cor"] },
  { id: "2CO", name: "2 Corinthiens", chapterCount: 13, abbreviations: ["2co", "2cor"] },
  { id: "GAL", name: "Galates", chapterCount: 6, abbreviations: ["ga", "gal"] },
  { id: "EPH", name: "Éphésiens", chapterCount: 6, abbreviations: ["ep", "eph"] },
  { id: "PHP", name: "Philippiens", chapterCount: 4, abbreviations: ["ph", "php", "phil"] },
  { id: "COL", name: "Colossiens", chapterCount: 4, abbreviations: ["col"] },
  { id: "1TH", name: "1 Thessaloniciens", chapterCount: 5, abbreviations: ["1th", "1the", "1thes", "1thess"] },
  { id: "2TH", name: "2 Thessaloniciens", chapterCount: 3, abbreviations: ["2th", "2the", "2thes", "2thess"] },
  { id: "1TI", name: "1 Timothée", chapterCount: 6, abbreviations: ["1tm", "1ti", "1tim"] },
  { id: "2TI", name: "2 Timothée", chapterCount: 4, abbreviations: ["2tm", "2ti", "2tim"] },
  { id: "TIT", name: "Tite", chapterCount: 3, abbreviations: ["tt", "tit"] },
  { id: "PHM", name: "Philémon", chapterCount: 1, abbreviations: ["phm", "phlm"] },
  { id: "HEB", name: "Hébreux", chapterCount: 13, abbreviations: ["he", "hb", "heb"] },
  { id: "JAS", name: "Jacques", chapterCount: 5, abbreviations: ["jc", "ja", "jac"] },
  { id: "1PE", name: "1 Pierre", chapterCount: 5, abbreviations: ["1p", "1pi", "1pe"] },
  { id: "2PE", name: "2 Pierre", chapterCount: 3, abbreviations: ["2p", "2pi", "2pe"] },
  { id: "1JN", name: "1 Jean", chapterCount: 5, abbreviations: ["1j", "1jn"] },
  { id: "2JN", name: "2 Jean", chapterCount: 1, abbreviations: ["2j", "2jn"] },
  { id: "3JN", name: "3 Jean", chapterCount: 1, abbreviations: ["3j", "3jn"] },
  { id: "JUD", name: "Jude", chapterCount: 1, abbreviations: ["jd"] },
  { id: "REV", name: "Apocalypse", chapterCount: 22, abbreviations: ["ap", "apo", "apoc"] },
];

/** Premier livre du Nouveau Testament dans l'ordre canonique. */
const FIRST_NT_ORDER = 40;

const fold = (value: string): string => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export const bookSlug = (name: string): string => fold(name).replace(/\s+/g, "-");

/** Nom complet replié, sans espaces : « cantiquedescantiques », « 1corinthiens ». */
const nameKey = (name: string): string => fold(name).replace(/\s+/g, "");

/** Références seules, dans l'esprit d'une sélection d'encouragement ; le texte vient toujours de bible_verse. */
export const DAILY_VERSE_POOL: readonly (readonly [book: string, chapter: number, start: number, end?: number])[] = [
  ["PSA", 23, 1], ["PSA", 27, 1], ["PSA", 34, 9], ["PSA", 46, 2], ["PSA", 91, 1], ["PSA", 103, 2], ["PSA", 119, 105],
  ["PSA", 121, 1, 2], ["PSA", 139, 14], ["PRO", 3, 5, 6], ["PRO", 16, 3], ["PRO", 18, 10], ["ISA", 40, 31], ["ISA", 41, 10],
  ["ISA", 43, 2], ["ISA", 53, 5], ["ISA", 55, 8, 9], ["JER", 29, 11], ["JER", 33, 3], ["LAM", 3, 22, 23], ["JOS", 1, 9],
  ["DEU", 31, 6], ["MIC", 6, 8], ["MAT", 5, 16], ["MAT", 6, 33], ["MAT", 11, 28], ["MAT", 28, 20], ["JHN", 1, 12],
  ["JHN", 3, 16], ["JHN", 8, 12], ["JHN", 10, 11], ["JHN", 11, 25], ["JHN", 14, 6], ["JHN", 14, 27], ["JHN", 15, 5],
  ["JHN", 16, 33], ["ACT", 1, 8], ["ROM", 5, 8], ["ROM", 8, 1], ["ROM", 8, 28], ["ROM", 10, 9], ["ROM", 12, 2],
  ["ROM", 15, 13], ["1CO", 13, 13], ["2CO", 5, 17], ["2CO", 12, 9], ["GAL", 2, 20], ["GAL", 5, 22, 23], ["EPH", 2, 8, 9],
  ["PHP", 4, 6, 7], ["PHP", 4, 13], ["COL", 3, 23], ["1TH", 5, 16, 18], ["2TI", 1, 7], ["2TI", 3, 16], ["HEB", 4, 16],
  ["HEB", 11, 1], ["HEB", 13, 8], ["JAS", 1, 5], ["1PE", 5, 7], ["1JN", 1, 9], ["1JN", 4, 19], ["REV", 21, 4],
];

/** Idempotent. Exécuté avec le rôle propriétaire (seed, import) : le rôle applicatif n'a aucun droit d'écriture ici. */
export async function seedBibleCatalog(db: PrismaClient): Promise<void> {
  for (const [index, book] of BIBLE_BOOKS.entries()) {
    const order = index + 1;
    const abbreviations = [...new Set([nameKey(book.name), ...book.abbreviations])];
    await db.bibleBook.upsert({
      where: { id: book.id },
      create: {
        id: book.id,
        order,
        testament: order < FIRST_NT_ORDER ? "OT" : "NT",
        chapterCount: book.chapterCount,
      },
      update: { order, chapterCount: book.chapterCount },
    });
    const names = { name: book.name, slug: bookSlug(book.name), abbreviations };
    await db.bibleBookName.upsert({
      where: { bookId_language: { bookId: book.id, language: "fr" } },
      create: { bookId: book.id, language: "fr", ...names },
      update: names,
    });
  }
  await db.dailyVersePool.createMany({
    data: DAILY_VERSE_POOL.map(([bookId, chapter, verseStart, verseEnd]) => ({
      bookId,
      chapter,
      verseStart,
      verseEnd: verseEnd ?? verseStart,
    })),
    skipDuplicates: true,
  });
}
