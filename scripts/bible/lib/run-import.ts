import { readFile } from "node:fs/promises";
import { EbibleUsfxProvider } from "./ebible-usfx-provider";
import { checkIntegrity, type IntegrityOptions } from "./integrity";
import { sha256 } from "./normalize";
import type { BibleSourceProvider, IgnoredCounts, IntegrityReport, SourceVerse } from "./types";

export interface ParsedSource {
  provider: BibleSourceProvider;
  verses: SourceVerse[];
  integrity: IntegrityReport;
  ignored: IgnoredCounts;
  sourceSha256: string;
}

const PROVIDERS: Readonly<Record<string, () => BibleSourceProvider>> = {
  ebible: () => new EbibleUsfxProvider(),
};

/** Lecture et contrôle, sans aucune écriture : c'est tout le dry-run, et le préalable de l'import réel. */
export async function parseSource(source: string, filePath: string, options: IntegrityOptions = {}): Promise<ParsedSource> {
  const create = PROVIDERS[source];
  if (!create) throw new Error(`Fournisseur inconnu : ${source}`);
  const provider = create();
  const verses: SourceVerse[] = [];
  for await (const verse of provider.read(filePath)) verses.push(verse);
  return {
    provider,
    verses,
    integrity: checkIntegrity(verses, options),
    ignored: provider.ignored(),
    sourceSha256: sha256(await readFile(filePath)),
  };
}
