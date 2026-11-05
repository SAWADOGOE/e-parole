import type { Erratum } from "./errata";
import type { IgnoredCounts, IntegrityReport, TranslationRecord } from "./types";

interface ReportInput {
  translation: TranslationRecord;
  sourceFile: string;
  sourceSha256: string;
  retrievedAt: string;
  integrity: IntegrityReport;
  ignored: IgnoredCounts;
  appliedErrata: readonly Erratum[];
  dryRun: boolean;
}

const list = (items: readonly string[]): string => (items.length === 0 ? "Aucun.\n" : `${items.map((item) => `- ${item}`).join("\n")}\n`);

/** Rapport d'intégrité local (hors dépôt), destiné à la validation humaine avant l'import réel. */
export function renderIntegrityReport(input: ReportInput): string {
  const { translation, integrity, ignored } = input;
  const ignoredRows = Object.entries(ignored)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `| ${key} | ${count} |`)
    .join("\n");
  const perBook = new Map<string, { chapters: number; verses: number }>();
  for (const { book, verseCount } of integrity.chapters) {
    const entry = perBook.get(book) ?? { chapters: 0, verses: 0 };
    entry.chapters += 1;
    entry.verses += verseCount;
    perBook.set(book, entry);
  }
  const bookRows = [...perBook].map(([book, { chapters, verses }]) => `| ${book} | ${chapters} | ${verses} |`).join("\n");
  return `# Rapport d'intégrité — ${translation.name}

- Mode : ${input.dryRun ? "dry-run (aucune écriture)" : "import réel"}
- Source : \`${input.sourceFile}\`
- SHA-256 du fichier source : \`${input.sourceSha256}\`
- Récupéré le : ${input.retrievedAt}
- Licence : ${translation.licenseType} (${translation.licenseUrl})

## Résultat
| Contrôle | Valeur |
|---|---|
| Livres | ${integrity.bookCount} |
| Chapitres | ${integrity.chapterCount} |
| Versets | ${integrity.verseCount} |
| SHA-256 global | \`${integrity.checksum}\` |
| Erreurs bloquantes | ${integrity.errors.length} |
| Avertissements | ${integrity.warnings.length} |

## Erreurs bloquantes
${list(integrity.errors)}
## Avertissements
${list(integrity.warnings)}
## Errata appliqués (écarts assumés avec la source)
${list(input.appliedErrata.map((e) => `${e.book} ${e.chapter}:${e.verse} : « ${e.from} » → « ${e.to} » (${e.evidence})`))}
## Éléments de la source écartés
| Élément | Occurrences |
|---|---|
${ignoredRows}

## Détail par livre
| Livre | Chapitres | Versets |
|---|---|---|
${bookRows}
`;
}
