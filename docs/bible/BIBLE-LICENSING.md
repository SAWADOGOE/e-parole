# Licences bibliques

⚠️ Ce document n'est pas un avis juridique. Les statuts ci-dessous résultent de sources publiques consultées le
2026-11-04 ; une validation juridique est recommandée avant le lancement public.

## Statuts
| Traduction | Statut retenu | Sources | Conditions pour e-Parole |
|---|---|---|---|
| **Louis Segond 1910** | Domaine public (traducteur décédé en 1885, révision publiée en 1910) | eBible.org `fraLSG` ; HelloAO `fra_lsg` (`publicDomain: true`, `commercialUse: allowed`) ; Midvash `lsg` (« Public Domain ») | Stockage, affichage, redistribution autorisés. Mention « Louis Segond 1910 » affichée par courtoisie et exactitude |
| **Darby (J.N. Darby, FR)** | Domaine public | eBible.org `frajnd` ; HelloAO `fra_jnd` ; Midvash `darby-fr` ; getBible `darby` | Idem |
| Martin 1744, Ostervald | Domaine public | HelloAO, getBible, Midvash | Possibles plus tard |
| Néo-Crampon Libre | **CC BY-SA 4.0** | HelloAO `fra_ncl`, Midvash `ncl` | Attribution obligatoire, partage à l'identique ; contient les deutérocanoniques (à exclure) ; traduction d'origine catholique → pertinence à évaluer |
| Segond 21, NEG 1979, Colombe, Semeur, Parole de Vie, NBS, TOB | **Sous droits** (Société Biblique de Genève, Biblio, Alliance biblique…) | — | **Interdit** sans contrat écrit avec l'éditeur |

### Point d'attention LSG
getBible indique pour `ls1910` : « Copyrighted; Permission to distribute granted to CrossWire ». Les trois autres sources
la déclarent domaine public. Position retenue : **domaine public**, en important depuis eBible.org dont la licence sera
archivée. Attention aux éditions « LSG » révisées ou annotées postérieures (ex. éditions avec notes, Segond révisée
« à la Colombe ») qui, elles, sont protégées : on importe uniquement le texte 1910.

## Règles d'intégration (obligatoires)
1. Aucune traduction n'est importée sans fiche dans `bible_translation` contenant : `licenseType`, `licenseUrl`,
   `attribution`, `sourceUrl`, `sourceRetrievedAt`, `licenseEvidence` (chemin de l'archive de la page de licence).
2. Le statut `isPublished` ne peut passer à `true` qu'après validation d'un `SUPER_ADMIN` (auditée).
3. Les notes, titres de péricopes et introductions des éditions sources ne sont importés que si leur licence est identique
   au texte (sinon ignorés).
4. Le texte n'est jamais réécrit, corrigé, modernisé ou complété par une IA ou un humain dans l'application. Les corrections
   éventuelles passent par une nouvelle version d'import depuis la source.
5. Le canon affiché est de 66 livres ; les livres deutérocanoniques présents dans une source sont exclus.
6. L'attribution est affichée dans le lecteur (pied de chapitre) et dans chaque `VerseQuote`.

## Contenus non bibliques
Méditations, commentaires, enseignements sont des contenus éditoriaux distincts (`EditorialContent`), avec auteur et
licence propre (par défaut : droits réservés à l'auteur, licence d'affichage concédée à e-Parole par les CGU).
