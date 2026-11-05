/**
 * Génère l'échantillon de test à partir de la source réelle : le texte est copié, jamais saisi à la main.
 *   pnpm exec tsx scripts/bible/make-fixture.ts --file <usfx>
 * Seuls quelques chapitres sont conservés : le fichier source complet reste hors dépôt.
 */
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { parseSource } from "./lib/run-import";

export const FIXTURE_PATH = "tests/fixtures/bible/lsg-sample.usfx.xml";

const SAMPLE: Readonly<Record<string, readonly number[] | "all">> = {
  GEN: [1],
  PSA: [23],
  JHN: "all",
  ACT: [1],
  ROM: [3, 8],
  "1CO": [13],
  EPH: [2],
  REV: [22],
};

const escapeXml = (value: string): string => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { file: { type: "string" } } });
  if (!values.file) throw new Error("Option requise : --file");
  const { verses } = await parseSource("ebible", values.file);
  const lines: string[] = ['<?xml version="1.0" encoding="utf-8"?>', "<usfx>"];
  for (const [book, chapters] of Object.entries(SAMPLE)) {
    lines.push(`<book id="${book}">`);
    let current = 0;
    for (const verse of verses) {
      if (verse.book !== book || (chapters !== "all" && !chapters.includes(verse.chapter))) continue;
      if (verse.chapter !== current) {
        current = verse.chapter;
        lines.push(`<c id="${current}" />`);
      }
      lines.push(`<p style="p"><v id="${verse.verse}" />${escapeXml(verse.text)}<ve /></p>`);
    }
    lines.push("</book>");
  }
  lines.push("</usfx>", "");
  await writeFile(FIXTURE_PATH, lines.join("\n"));
  console.log(`Échantillon écrit : ${FIXTURE_PATH}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
