# Module Bible — conception

## Fonctionnalités et phases
| Fonction | Phase | Statut |
|---|---|---|
| Lecture LSG 1910 (66 livres) | 2 | Prévu |
| Navigation livre / chapitre / verset, précédent / suivant | 2 | Prévu |
| Recherche par référence et plein texte | 2 | Prévu |
| Réglages (taille, interligne, thème, focus), reprise de lecture | 2 | Prévu |
| Copier, surligner, noter, favori, partager (post, communauté) | 2-3 | Prévu |
| Associer un passage à une prière | 4 | Prévu |
| Partager dans une conversation | 7 | Prévu |
| Verset du jour éditorialisé | 2 | Prévu |
| Darby + comparaison de traductions | 6 | Prévu |
| Plans de lecture | 6 | Prévu |
| Méditations liées aux passages | 6 | Prévu |
| Hors connexion | 7 | Prévu |

## Architecture hybride

```mermaid
flowchart TB
  UI[Lecteur / VerseQuote / Recherche] --> BS[BibleService<br/>features/bible/server]
  BS --> REPO[BibleRepository<br/>PostgreSQL]
  REPO --> T[(bible_translation, bible_book,<br/>bible_verse — lecture seule)]
  REPO --> UD[(highlights, notes, bookmarks,<br/>reading progress — données utilisateur)]
  IMP[scripts/bible/import] -->|rôle DB d'import| T
  IMP --> P{BibleSourceProvider}
  P --> E[EbibleUsfxProvider<br/>fichiers eBible.org]
  P --> H[HelloAoProvider<br/>bible.helloao.org JSON]
  P --> M[MidvashProvider<br/>api.midvash.com]
```

**Principe clé** : les fournisseurs externes servent à **importer** (et éventuellement vérifier) des textes ; ils ne sont
jamais appelés au moment d'afficher une page. Le lecteur lit uniquement PostgreSQL. Avantages : aucune dépendance de
disponibilité, latence faible, cache CDN possible, recherche FTS locale, coût nul. Cela n'est possible que pour des textes
dont la licence permet le stockage et la redistribution (domaine public ou licence libre) : voir [BIBLE-LICENSING.md](BIBLE-LICENSING.md).

Pour une future traduction sous droits accessible uniquement par API (ex. via API.Bible), un `RemoteBibleProvider`
avec cache conforme aux conditions du fournisseur pourra être ajouté **derrière la même interface de lecture**.

## Interfaces
```ts
// features/bible/types.ts
type TranslationCode = "lsg" | "darby";          // étendu par import
type BookId = "GEN" | "EXO" | /* … codes USFM … */ "REV";
interface VerseRef { translation: TranslationCode; book: BookId; chapter: number; verseStart: number; verseEnd?: number }

// Lecture (runtime)
interface BibleReader {
  getChapter(t: TranslationCode, book: BookId, chapter: number): Promise<Chapter | null>;
  getPassage(ref: VerseRef): Promise<Passage | null>;          // texte + attribution
  search(q: SearchQuery): Promise<SearchPage>;
  listBooks(t: TranslationCode): Promise<BookSummary[]>;
}

// Import (scripts uniquement)
interface BibleSourceProvider {
  id: "ebible-usfx" | "helloao" | "midvash";
  fetchTranslation(code: string): AsyncIterable<SourceVerse>;   // { book, chapter, verse, text }
  metadata(code: string): Promise<SourceMetadata>;              // licence, URL, version
}
```
Les codes de livres suivent **USFM** (`GEN`, `PSA`, `JHN`, `1CO`…), indépendants de la langue ; les noms et abréviations
français sont en base (`bible_book_name`).

## Import contrôlé
1. Téléchargement manuel du fichier source (eBible.org `fraLSG` USFX ou USFM) par un `SUPER_ADMIN`, stocké hors dépôt.
2. `pnpm bible:import --dry-run` : parse, normalise (espaces, apostrophes typographiques **sans modifier les mots**),
   calcule un SHA-256 par verset et global, compare au référentiel attendu (66 livres, 1 189 chapitres, nombre de versets de la source).
3. Rapport d'écarts (versets manquants, versification). Validation humaine.
4. Import réel en transaction dans une **nouvelle version** de traduction (`bible_translation_version`) ; activation
   atomique de la version ; l'ancienne reste disponible pour les références existantes.
5. Audit log `bible.import` avec checksums ; invalidation du cache `bible:lsg`.

Aucune édition verset par verset n'est possible dans l'UI admin.

## Règles de citation
Toute citation (`VerseQuote`) stocke la référence (`VerseRef` + version de traduction) et **rend le texte depuis la base**.
Le texte n'est pas recopié dans la publication, ce qui garantit l'exactitude et empêche la modification par l'auteur.
L'attribution (« Louis Segond 1910 — domaine public ») est affichée à côté.
