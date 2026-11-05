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

### Vérification de la Phase 2 (2026-11-05)
**Décision : texte des versets de `fraLSG` retenu en `PUBLIC_DOMAIN`. Tout le reste du fichier est exclu.**

| Source consultée | Constat | Preuve archivée (`data/bible-sources/`, hors dépôt) |
|---|---|---|
| eBible.org, page `fraLSG` | « This Bible is in the Public Domain. It is not copyrighted. » ; mise à jour 2026-10-30 | `ebible-fraLSG-details-2026-11-05.html` (SHA-256 `224ad709…d051f`), `ebible-fraLSG-copyright-2026-11-05.html` (`b46e85f9…14bc0`) |
| Métadonnées DBL du fichier | `dateCompleted` 1910, « Bible without Deuterocanon », même mention de domaine public | `fraLSGmetadata.xml` dans l'archive |
| HelloAO `fra_lsg` | `publicDomain: true`, `commercialUse: allowed`, source eBible.org, 31 170 versets | `helloao-translations-2026-11-05.json` |
| Midvash `lsg` | « © 1910. Public Domain. » | `midvash-versions-2026-11-05.json` |
| getBible `ls1910` | « Copyrighted; Permission to distribute granted to CrossWire » | `getbible-translations-2026-11-05.json` |

**Contradiction getBible : expliquée.** Elle porte sur un **autre fichier** : moduleDoc CrossWire OSIS version 4.0 « with Strong's numbers »,
source Richard Lemay, numéros de Strong affectés en 2026. Sa mention de droits vise cette édition numérique, pas le fichier eBible.

**Le fichier n'est pas un texte de 1910 brut.** Son en-tête indique `31-10-2011, Moon Sun Kim. Updated for DBL by E. Canales, September 2012`,
et il contient des apports modernes. La licence d'eBible porte sur « cette Bible » sans les distinguer et leur provenance n'est pas établie :
je ne peux pas garantir qu'ils partagent la licence du texte. Conformément à la règle 3, **ils ne sont pas importés** :

| Élément écarté | Occurrences |
|---|---|
| Introductions de livres (`ip`, `io1`, `io2`, `ipi`, `imt*`, `is1`, `ib`, `ie`), en français moderne | 965 paragraphes |
| Titres de section (`s`) et titres majeurs (`ms`, `mr`) | 1 533 |
| Renvois (`x`) et paragraphes de références (`r`) | 12 537 |
| Numéros de Strong (`w@s`) | 705 652 |
| Tableaux | 13 |

**Le texte est bien celui de 1910 d'après les contrôles disponibles, sans preuve absolue.** Aucune édition imprimée de 1910 n'a été comparée.
Faisceau d'indices : leçons caractéristiques (Gn 1:1 « les cieux et la terre »), concordance avec une saisie indépendante (voir
[contrôle croisé](BIBLE-DATABASE-SCHEMA.md#contrôle-croisé)) et aucune substitution de mots suggérant une révision. La typographie semble
modernisée (« Éternel », « œuvres », « … » là où Midvash écrit « Eternel », « oeuvres », « ... ») : ce n'est pas une révision du texte.
eBible écrit que la première édition de la Bible Segond date de 1910 : c'est imprécis (Bible complète en 1880, révision de 1910), sans effet sur la décision.

La signature PGP de l'archive est valide et ses SHA-256 concordent, mais la clé provient de la même archive et n'est certifiée par aucun tiers :
cela prouve l'intégrité du téléchargement, pas l'authenticité de l'éditeur.

**Coquilles de la source, conservées telles quelles** (jamais corrigées, règle 4) : Gn 50:10 « audelà » ; Éz 21:32 « n’aua ». HelloAO, instantané plus
ancien, portait « au-delà » et « n’aura » ; Midvash « au delà ». Correction possible uniquement par une nouvelle version de la source.

⚠️ Ceci n'est pas un avis juridique : une validation par un juriste reste recommandée avant le lancement public.

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
