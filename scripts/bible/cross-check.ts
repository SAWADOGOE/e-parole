/**
 * Contrôle croisé en lecture seule d'une source avec HelloAO (complet) et Midvash (échantillon).
 *   pnpm bible:crosscheck --file <usfx> --helloao <complete.json> [--midvash-step 31]
 * Aucune écriture en base, aucune dépendance d'exécution : les écarts sont listés, jamais corrigés.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { BIBLE_BOOKS } from "../../prisma/seed/bible-catalog";
import { foldForComparison } from "./lib/normalize";
import { parseSource } from "./lib/run-import";

const REPORT = join("data", "bible-sources", "reports", "controle-croise-lsg.md");
const MIDVASH_BATCH = 50;
const MIDVASH_PAUSE_MS = 350;
const CLIENT = { headers: { "User-Agent": "e-parole-bible-import/0.1" } };

const { values } = parseArgs({
  options: {
    file: { type: "string" },
    helloao: { type: "string" },
    "midvash-step": { type: "string", default: "31" },
  },
});

interface HelloAoItem {
  type: string;
  number?: number;
  content?: (string | { text?: string })[];
}
interface HelloAoFile {
  books: { id: string; chapters: { chapter: { number: number; content: HelloAoItem[] } }[] }[];
}

const compact = (value: string): string => value.replace(/\s+/g, "").normalize("NFC");
const keyOf = (book: string, chapter: number, verse: number): string => `${book}.${chapter}.${verse}`;

function readHelloAo(file: HelloAoFile): Map<string, string> {
  const verses = new Map<string, string>();
  for (const book of file.books) {
    for (const { chapter } of book.chapters) {
      for (const item of chapter.content) {
        if (item.type !== "verse" || item.number === undefined) continue;
        const text = (item.content ?? []).map((part) => (typeof part === "string" ? part : (part.text ?? ""))).join(" ");
        verses.set(keyOf(book.id, chapter.number, item.number), text);
      }
    }
  }
  return verses;
}

async function midvashSample(keys: readonly string[], slugs: ReadonlyMap<string, string>): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (let start = 0; start < keys.length; start += MIDVASH_BATCH) {
    const part = keys.slice(start, start + MIDVASH_BATCH);
    const refs = part.map((key) => {
      const [book = "", chapter, verse] = key.split(".");
      return `${slugs.get(book) ?? book} ${chapter}:${verse}`;
    });
    const url = `https://api.midvash.com/v1/passages?version=lsg&refs=${encodeURIComponent(refs.join(","))}`;
    const body = (await (await fetch(url, CLIENT)).json()) as { data?: ({ text?: string } | null)[] };
    part.forEach((key, index) => {
      const text = body.data?.[index]?.text;
      if (text) found.set(key, text);
    });
    await new Promise((resolve) => setTimeout(resolve, MIDVASH_PAUSE_MS));
  }
  return found;
}

async function main(): Promise<void> {
  if (!values.file || !values.helloao) throw new Error("Options requises : --file et --helloao");
  const { verses } = await parseSource("ebible", values.file);
  const source = new Map(verses.map((v) => [keyOf(v.book, v.chapter, v.verse), v.text]));

  const helloAo = readHelloAo(JSON.parse(await readFile(values.helloao, "utf8")) as HelloAoFile);
  const helloDiffs = [...source].filter(([key, text]) => {
    const other = helloAo.get(key);
    return other !== undefined && compact(other) !== compact(text);
  });
  const missingInHello = [...source.keys()].filter((key) => !helloAo.has(key));
  const onlyInHello = [...helloAo.keys()].filter((key) => !source.has(key));

  const booksResponse = (await (await fetch("https://api.midvash.com/v1/books", CLIENT)).json()) as { data: { slug: { en: string } }[] };
  const slugs = new Map(BIBLE_BOOKS.map((book, index) => [book.id, booksResponse.data[index]?.slug.en ?? ""]));
  const step = Number(values["midvash-step"]);
  const sampleKeys = [...source.keys()].filter((_, index) => index % step === 7);
  const midvash = await midvashSample(sampleKeys, slugs);

  const foldedSource = new Map([...source].map(([key, text]) => [foldForComparison(text), key]));
  let identical = 0;
  let typographic = 0;
  const shifted: string[] = [];
  const residual: string[] = [];
  for (const [key, text] of midvash) {
    const local = source.get(key) ?? "";
    if (local.replace(/’/g, "'") === text) identical += 1;
    else if (foldForComparison(local) === foldForComparison(text)) typographic += 1;
    else {
      const elsewhere = foldedSource.get(foldForComparison(text));
      if (elsewhere && elsewhere !== key) shifted.push(`${key} → ${elsewhere}`);
      else residual.push(key);
    }
  }

  const report = `# Contrôle croisé LSG 1910

## HelloAO fra_lsg (tous les versets, espaces ignorés)
- Versets source : ${source.size} ; versets HelloAO : ${helloAo.size}
- Absents de HelloAO : ${missingInHello.length} ; absents de la source : ${onlyInHello.length}
- Versets différents : ${helloDiffs.length}

${helloDiffs.map(([key, text]) => `- ${key}\n  - source : ${text}\n  - HelloAO : ${(helloAo.get(key) ?? "").replace(/\s+/g, " ").trim()}`).join("\n")}

## Midvash lsg (échantillon d'un verset sur ${step}, lignée de saisie indépendante)
- Versets comparés : ${midvash.size} sur ${sampleKeys.length} demandés
- Identiques : ${identical}
- Différences typographiques seules (capitales accentuées, ligatures, points de suspension) : ${typographic}
- Décalages de versification : ${shifted.length}
- Autres écarts à relire : ${residual.length}

### Décalages de versification
${shifted.map((line) => `- ${line}`).join("\n")}

### Autres écarts
${residual.map((key) => `- ${key}\n  - source : ${source.get(key) ?? ""}\n  - Midvash : ${midvash.get(key) ?? ""}`).join("\n")}
`;
  await mkdir(join("data", "bible-sources", "reports"), { recursive: true });
  await writeFile(REPORT, report);
  console.log(`HelloAO : ${helloDiffs.length} écarts sur ${source.size} ; absents ${missingInHello.length}/${onlyInHello.length}`);
  console.log(`Midvash : ${midvash.size} comparés, ${identical} identiques, ${typographic} typographiques, ${shifted.length} versification, ${residual.length} à relire`);
  console.log(`Rapport : ${REPORT}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
