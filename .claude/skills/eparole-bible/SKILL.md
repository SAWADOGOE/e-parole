---
name: eparole-bible
description: Use when working on the e-Parole Bible module - the reader, book/chapter navigation, reference parsing (e.g. "Jean 3:16", "1 Co 13:4-7"), full-text Bible search, highlights, notes, bookmarks, verse sharing (VerseQuote), daily verse, reading state, or the Bible import script.
---

# e-Parole — module Bible

## Principes non négociables
- Le texte biblique est **immuable** dans l'application ; on ne le corrige, ne le modernise, ne le complète jamais
  (ni humain, ni IA). Toute correction = nouvel import depuis la source.
- Toujours afficher **référence + traduction + attribution**.
- Séparer texte biblique / notes / méditations / commentaires, visuellement et dans les données.
- Canon protestant de 66 livres ; codes de livres USFM (`GEN`…`REV`).

## Instructions
1. Lire `docs/bible/BIBLE-MODULE.md`, puis le document ciblé (`BIBLE-READER-UX`, `BIBLE-SEARCH`, `BIBLE-DATABASE-SCHEMA`).
2. Lecture runtime : uniquement via `BibleReader` (PostgreSQL). Aucun appel à une API externe pendant le rendu.
3. Citations : stocker la référence (`VerseRef`), rendre le texte depuis la base (`VerseQuote`). Ne pas recopier le texte dans un post.
4. Parseur de références : fonction pure `features/bible/lib/parse-reference.ts`, tests par table (abréviations françaises,
   plages, chiffres romains, erreurs `CHAPTER_OUT_OF_RANGE`/`VERSE_OUT_OF_RANGE` avec suggestion).
5. Recherche : `websearch_to_tsquery('french_unaccent', …)`, filtres testament/livre, `ts_headline`, pagination par curseur.
6. Lecteur : Server Component statique mis en cache (tag `bible:<code>`) ; îlot client pour la sélection et les actions.
7. Données utilisateur (surlignages, notes, favoris) référencées par coordonnées, jamais par `BibleVerse.id`.
8. Notes bibliques : strictement privées, aucun accès admin.
9. Import : `scripts/bible/import-*.ts`, `--dry-run` d'abord, checksum, rapport d'intégrité, version `STAGED`, validation humaine.

## Vérifications
- [ ] Attribution visible partout où un verset apparaît
- [ ] Aucune écriture sur les tables `bible_verse*` hors script d'import
- [ ] Tests du parseur et de la recherche (accents, phrases)
- [ ] Accessibilité du lecteur (`docs/18-ACCESSIBILITY.md#lecteur-biblique`)

## Références
`docs/bible/`, `docs/adr/ADR-006-BIBLE-INTEGRATION.md`. Licences : skill `eparole-bible-licensing`.
