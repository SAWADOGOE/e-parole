import { createReadStream } from "node:fs";
import { SaxesParser, type SaxesTagPlain } from "saxes";
import { BIBLE_BOOKS } from "../../../prisma/seed/bible-catalog";
import { normalizeVerseText } from "./normalize";
import type { BibleSourceProvider, IgnoredCounts, SourceVerse } from "./types";

const CANON = new Set(BIBLE_BOOKS.map((book) => book.id));

/** Paragraphes qui portent le texte biblique ; tout autre style (introductions, références, titres) est écarté. */
const VERSE_PARAGRAPH_STYLES = new Set(["p", "m", "pi1"]);

/** Paragraphes écartés, recensés un à un : un style inconnu pourrait porter du texte biblique et fait échouer l'import. */
const SKIPPED_PARAGRAPH_STYLES = new Set(["ib", "ie", "imt1", "imt2", "imt3", "io1", "io2", "ip", "ipi", "is1", "mr", "ms1", "ms2", "mt1", "mt2", "r"]);

/**
 * Éléments écartés avec leur contenu. La licence des notes, titres et introductions n'est pas établie
 * comme identique à celle du texte de 1910 (docs/bible/BIBLE-LICENSING.md) : ils ne sont jamais importés.
 */
const SKIPPED_ELEMENTS: Readonly<Record<string, string>> = {
  x: "crossReferences",
  s: "sectionHeadings",
  table: "tables",
  id: "bookIdentifiers",
  h: "runningHeaders",
  toc: "tableOfContents",
  languageCode: "languageCode",
};

/** Éléments transparents : leur texte appartient au verset, leur balisage (Strong, paroles de Jésus…) est retiré. */
const TRANSPARENT_ELEMENTS = new Set(["usfx", "w", "wj", "q", "qs", "it", "b", "ord", "ior"]);

function requireAttribute(tag: SaxesTagPlain, name: string): string {
  const value = tag.attributes[name];
  if (value === undefined) throw new Error(`Élément <${tag.name}> sans attribut ${name}`);
  return value;
}

function parseNumber(value: string, what: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(`${what} invalide : « ${value} » (les versets groupés ne sont pas pris en charge)`);
  return Number(value);
}

/** Lit un fichier USFX d'eBible.org en flux. Échoue sur tout élément inconnu plutôt que de deviner. */
export class EbibleUsfxProvider implements BibleSourceProvider {
  readonly id = "ebible-usfx";
  private counts: IgnoredCounts = {};

  ignored(): IgnoredCounts {
    return { ...this.counts };
  }

  private count(key: string): void {
    this.counts[key] = (this.counts[key] ?? 0) + 1;
  }

  async *read(filePath: string): AsyncIterable<SourceVerse> {
    this.counts = {};
    const pending: SourceVerse[] = [];
    let book: string | null = null;
    let chapter = 0;
    let verse: number | null = null;
    let buffer = "";
    let skipDepth = 0;
    /** Pile des paragraphes ouverts : true si le paragraphe peut porter du texte biblique. */
    const paragraphs: boolean[] = [];

    const closeVerse = (): void => {
      if (verse === null) return;
      if (book === null) throw new Error("Verset hors d'un livre");
      pending.push({ book, chapter, verse, text: normalizeVerseText(buffer) });
      verse = null;
      buffer = "";
    };

    const parser = new SaxesParser({ xmlns: false, position: false });
    parser.on("error", (error) => {
      throw error;
    });

    parser.on("opentag", (tag) => {
      const name = tag.name;
      if (skipDepth > 0) {
        if (!tag.isSelfClosing) skipDepth += 1;
        return;
      }
      switch (name) {
        case "book": {
          closeVerse();
          const id = requireAttribute(tag, "id");
          if (!CANON.has(id)) {
            this.count("excludedBooks");
            book = null;
            if (!tag.isSelfClosing) skipDepth = 1;
            return;
          }
          book = id;
          chapter = 0;
          return;
        }
        case "c":
          closeVerse();
          chapter = parseNumber(requireAttribute(tag, "id"), "Chapitre");
          return;
        case "v":
          closeVerse();
          verse = parseNumber(requireAttribute(tag, "id"), "Verset");
          buffer = "";
          return;
        case "ve":
          closeVerse();
          return;
        case "p": {
          const style = (tag).attributes["style"] ?? "p";
          const keep = VERSE_PARAGRAPH_STYLES.has(style);
          if (!keep && !SKIPPED_PARAGRAPH_STYLES.has(style)) throw new Error(`Style de paragraphe inconnu : ${style}`);
          if (!keep) this.count(`paragraph:${style}`);
          if (!tag.isSelfClosing) paragraphs.push(keep);
          return;
        }
        default: {
          const skipped = SKIPPED_ELEMENTS[name];
          if (skipped !== undefined) {
            this.count(skipped);
            if (!tag.isSelfClosing) skipDepth = 1;
            return;
          }
          if (name === "w" && (tag).attributes["s"] !== undefined) this.count("strongNumbers");
          if (!TRANSPARENT_ELEMENTS.has(name)) throw new Error(`Élément USFX inconnu : <${name}>`);
        }
      }
    });

    parser.on("closetag", (tag) => {
      if (skipDepth > 0) {
        if (!tag.isSelfClosing) skipDepth -= 1;
        return;
      }
      if (tag.name === "p" && !tag.isSelfClosing) paragraphs.pop();
      if (tag.name === "book") {
        closeVerse();
        book = null;
      }
    });

    parser.on("text", (text) => {
      if (skipDepth > 0 || verse === null) return;
      if (paragraphs.at(-1) === false) {
        if (text.trim()) this.count("textInsideNonVerseParagraph");
        return;
      }
      buffer += text;
    });

    const stream = createReadStream(filePath, { encoding: "utf8", highWaterMark: 1 << 18 });
    for await (const chunk of stream) {
      parser.write((chunk as string).replace(/^﻿/, ""));
      yield* pending.splice(0);
    }
    parser.close();
    closeVerse();
    yield* pending.splice(0);
  }
}
