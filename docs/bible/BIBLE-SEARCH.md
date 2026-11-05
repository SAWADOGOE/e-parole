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
| `Jean`, `Nombres` | Nom de livre seul : recherche plein texte, avec un lien « Ouvrir le livre » (ce sont aussi des mots courants) |

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
La colonne générée passe par la fonction `IMMUTABLE` `bible_fts_vector(text)`, avec une configuration qualifiée : validé en Phase 2 sur PostgreSQL 17.

| Requête utilisateur | Traitement |
|---|---|
| `grace` | `websearch_to_tsquery('french_unaccent', 'grace')` → « grâce », « grâces » |
| `"le bon berger"` | `websearch_to_tsquery` gère la phrase → `phraseto_tsquery` |
| `foi -oeuvres` | exclusion |
| Filtres | `testament`, `bookId`, `versionId` en clauses `WHERE` (index composite) |

Classement : `ts_rank_cd`, puis ordre canonique. Surlignage : `ts_headline` (limité au verset).
Pagination : 20 résultats, curseur `(rank, verseId)` ; les identifiants suivant l'ordre canonique de l'import, un rang égal garde l'ordre de lecture. Compteur de résultats par livre (facettes) calculé sur la requête.

Limites : le stemming français peut rapprocher des mots distincts. L'option « mot exact » (configuration `simple` + `unaccent`) n'est pas livrée :
elle demanderait un second index et n'est pas exigée par US-3.

## Performance attendue
Mesuré le 2026-11-05 sur 31 170 versets : requête GIN 0,26 ms ; page complète p95 97,3 ms sur 200 requêtes (objectif 150 ms).

## Évolutions
Recherche multi-traductions (Phase 6), synonymes thématiques (« salut » ↔ « délivrance ») gérés par une table éditoriale,
jamais par réécriture du texte.
