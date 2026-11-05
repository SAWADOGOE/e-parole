import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { EbibleUsfxProvider } from "../../../scripts/bible/lib/ebible-usfx-provider";
import { checkIntegrity, globalChecksum } from "../../../scripts/bible/lib/integrity";
import { foldForComparison, normalizeVerseText, sha256 } from "../../../scripts/bible/lib/normalize";
import type { SourceVerse } from "../../../scripts/bible/lib/types";

const directory = mkdtempSync(join(tmpdir(), "eparole-usfx-"));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

async function read(body: string): Promise<{ verses: SourceVerse[]; provider: EbibleUsfxProvider }> {
  const file = join(directory, `${crypto.randomUUID()}.xml`);
  writeFileSync(file, `<?xml version="1.0" encoding="utf-8"?><usfx>${body}</usfx>`);
  const provider = new EbibleUsfxProvider();
  const verses: SourceVerse[] = [];
  for await (const verse of provider.read(file)) verses.push(verse);
  return { verses, provider };
}

describe("normalisation technique", () => {
  it("réduit les espaces et compose l'Unicode", () => {
    expect(normalizeVerseText("  Au\n  commencement ,  Dieu ")).toBe("Au commencement , Dieu");
    expect(normalizeVerseText("grâce")).toBe("grâce");
  });

  it("ne change jamais un mot, une apostrophe ni une coquille de la source", () => {
    for (const text of ["qui est audelà du Jourdain", "n’aua lieu", "l'Éternel", "[cinquante mille]", "Sa misère—encore…"]) {
      expect(normalizeVerseText(text)).toBe(text);
    }
  });

  it("le pliage de comparaison neutralise la typographie sans servir à l'import", () => {
    expect(foldForComparison("L’Éternel, son cœur…")).toBe(foldForComparison("L'Eternel, son coeur..."));
    expect(foldForComparison("grâce")).not.toBe(foldForComparison("gloire"));
  });
});

describe("EbibleUsfxProvider", () => {
  it("extrait le texte du verset et retire le balisage Strong", async () => {
    const { verses, provider } = await read(
      `<book id="JHN"><c id="3" /><p style="p"><v id="16" bcv="JHN.3.16" /><wj><w s="G1063">Car</w> <w s="G2316">Dieu</w> a aimé <w s="G2889">le monde</w>.</wj><ve /></p></book>`,
    );
    expect(verses).toEqual([{ book: "JHN", chapter: 3, verse: 16, text: "Car Dieu a aimé le monde." }]);
    expect(provider.ignored()["strongNumbers"]).toBe(3);
  });

  it("n'importe ni renvois, ni titres, ni introductions, ni références", async () => {
    const { verses, provider } = await read(
      `<book id="GEN"><id id="GEN">GENFLS1910.PTX</id><h>GENÈSE</h><toc level="1">Genèse</toc><p style="ip">Introduction moderne.</p><c id="1" /><s style="s1">Création du monde</s><p style="r">V. 1: cf. Né 9:6.</p>
       <p style="p"><v id="1" bcv="GEN.1.1" />Au <x caller="a"><xo>1.1</xo><xt>Job 38:4.</xt></x>commencement.<ve /></p></book>`,
    );
    expect(verses).toEqual([{ book: "GEN", chapter: 1, verse: 1, text: "Au commencement." }]);
    expect(provider.ignored()).toMatchObject({ crossReferences: 1, sectionHeadings: 1, "paragraph:ip": 1, "paragraph:r": 1 });
  });

  it("écarte le texte d'un paragraphe non biblique situé à l'intérieur d'un verset", async () => {
    const { verses, provider } = await read(
      `<book id="GEN"><c id="29" /><p style="p"><v id="14" bcv="GEN.29.14" />Et Laban lui dit.</p><p style="r">V. 15-30: cf. Os 12:13.</p><p style="p">Jacob demeura.<ve /></p></book>`,
    );
    expect(verses[0]?.text).toBe("Et Laban lui dit.Jacob demeura.");
    expect(provider.ignored()["textInsideNonVerseParagraph"]).toBe(1);
  });

  it("garde la poésie et les marques de texte", async () => {
    const { verses } = await read(`<book id="PSA"><c id="1" /><q level="1"><v id="1" bcv="PSA.1.1" />Heureux l’homme</q><q level="2">qui ne marche pas <qs>Pause.</qs><ve /></q></book>`);
    expect(verses[0]?.text).toBe("Heureux l’hommequi ne marche pas Pause.");
  });

  it("exclut un livre hors canon", async () => {
    const { verses, provider } = await read(`<book id="TOB"><c id="1" /><p style="p"><v id="1" />Tobie.<ve /></p></book><book id="JUD"><c id="1" /><p style="p"><v id="1" />Jude.<ve /></p></book>`);
    expect(verses.map((v) => v.book)).toEqual(["JUD"]);
    expect(provider.ignored()["excludedBooks"]).toBe(1);
  });

  it("échoue sur un élément inconnu plutôt que de deviner", async () => {
    await expect(read(`<book id="JHN"><c id="1" /><p style="p"><v id="1" /><nouveau>texte</nouveau><ve /></p></book>`)).rejects.toThrow(/inconnu/);
  });

  it("refuse un verset groupé", async () => {
    await expect(read(`<book id="JHN"><c id="1" /><p style="p"><v id="1-2" />texte<ve /></p></book>`)).rejects.toThrow(/invalide/);
  });
});

describe("contrôle d'intégrité", () => {
  const verse = (book: string, chapter: number, n: number, text = `Texte ${n}.`): SourceVerse => ({ book, chapter, verse: n, text });

  it("l'empreinte globale ne dépend pas de l'ordre de lecture", () => {
    const a = [verse("GEN", 1, 1), verse("GEN", 1, 2), verse("REV", 1, 1)];
    expect(globalChecksum(a)).toBe(globalChecksum([...a].reverse()));
  });

  it("un seul caractère change l'empreinte", () => {
    expect(globalChecksum([verse("GEN", 1, 1, "Dieu.")])).not.toBe(globalChecksum([verse("GEN", 1, 1, "Dieu!")]));
  });

  it("calcule un SHA-256 standard", () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("signale doublons, versets vides et livres hors canon", () => {
    const report = checkIntegrity([verse("GEN", 1, 1), verse("GEN", 1, 1), verse("GEN", 1, 2, ""), verse("TOB", 1, 1)], { partial: true });
    expect(report.errors).toEqual(expect.arrayContaining(["Verset en double : GEN 1:1", "Verset vide : GEN 1:2", "Livre hors du canon : TOB"]));
  });

  it("exige le canon complet hors échantillon", () => {
    const report = checkIntegrity([verse("GEN", 1, 1)]);
    expect(report.errors).toContain("1 livres trouvés pour 66 attendus");
    expect(report.errors).toContain("Livre manquant : REV");
    expect(report.errors).toContain("GEN : 1 chapitres pour 50 attendus");
  });

  it("signale une numérotation trouée sans la corriger", () => {
    const report = checkIntegrity([verse("GEN", 1, 1), verse("GEN", 1, 3)], { partial: true });
    expect(report.warnings).toEqual(["GEN 1 : 2 versets pour une numérotation allant jusqu'à 3"]);
    expect(report.errors).toEqual([]);
  });
});
