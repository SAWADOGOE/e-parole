# Recherche biblique

Deux moteurs complémentaires derrière un seul champ : **références** puis **plein texte**.

## 1. Parseur de références
Entrée normalisée (minuscules, sans accents, espaces multiples réduits), puis grammaire :
```text
reference := livre [chapitre [sep verset [ "-" verset ]]]
livre     := [1|2|3|I|II|III] nom            ex. "1 co", "1co", "i corinthiens", "1ère corinthiens"
sep       := ":" | "." | "," | " v" | espace
```
| Entrée | Résultat |
|---|---|
| `Jean 3:16` · `jn 3 16` · `Jean 3.16` | JHN 3:16 |
| `Psaume 23` · `ps23` · `Psaumes 23` | PSA 23 |
| `1 Co 13:4-7` | 1CO 13:4–7 |
| `Romains 8` | ROM 8 |
| `Ap 22:21` | REV 22:21 |
| `Jean 30` | Erreur `CHAPTER_OUT_OF_RANGE` (21 chapitres) |
| `Jea` | Suggestions : Jean, Jacques (trigrammes) |

Abréviations françaises usuelles (LSG, Société biblique) stockées dans `BibleBookName.abbreviations`. Le parseur est une
fonction pure de `features/bible/lib/parse-reference.ts`, testée par table (≥ 200 cas).

## 2. Plein texte (PostgreSQL FTS)
```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TEXT SEARCH CONFIGURATION french_unaccent (COPY = french);
ALTER TEXT SEARCH CONFIGURATION french_unaccent
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, french_stem;
```
`unaccent` n'étant pas `IMMUTABLE`, la colonne générée passe par une fonction wrapper `IMMUTABLE` déclarée dans la
migration (pattern classique) ⚠️ à valider en Phase 2.

| Requête utilisateur | Traitement |
|---|---|
| `grace` | `websearch_to_tsquery('french_unaccent', 'grace')` → « grâce », « grâces » |
| `"le bon berger"` | `websearch_to_tsquery` gère la phrase → `phraseto_tsquery` |
| `foi -oeuvres` | exclusion |
| Filtres | `testament`, `bookId`, `versionId` en clauses `WHERE` (index composite) |

Classement : `ts_rank_cd`, puis ordre canonique. Surlignage : `ts_headline` (limité au verset).
Pagination : 20 résultats, curseur `(rank, verseId)`. Compteur de résultats par livre (facettes) calculé sur la requête.

Limites : le stemming français peut rapprocher des mots distincts ; l'option « mot exact » désactive le stemming
(configuration `simple` + `unaccent`).

## Performance attendue
~31 000 lignes : requête GIN < 20 ms. Objectif p95 < 150 ms de bout en bout.

## Évolutions
Recherche multi-traductions (Phase 6), synonymes thématiques (« salut » ↔ « délivrance ») gérés par une table éditoriale,
jamais par réécriture du texte.
