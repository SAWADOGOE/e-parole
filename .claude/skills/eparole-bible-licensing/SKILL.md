---
name: eparole-bible-licensing
description: Use before adding, importing, caching or displaying any Bible translation, commentary, study note or Bible API source in e-Parole, or when someone asks whether a translation (Segond 21, NEG, Colombe, Semeur, Darby, Crampon...) can be used.
---

# e-Parole — licences bibliques

## Règle d'or
**Ne jamais intégrer une traduction sans vérification documentée de sa licence.** Une API gratuite n'autorise pas
pour autant le stockage, la redistribution ou l'usage commercial.

## Workflow
1. Identifier l'édition exacte (année, révision, éditeur). « Segond » ≠ « Segond 21 » ≠ « Nouvelle Édition de Genève ».
2. Chercher la licence à la **source primaire** (éditeur, eBible.org, page de licence) ; noter l'URL et la date ;
   archiver une copie (capture/PDF) hors dépôt et référencer son emplacement.
3. Recouper avec au moins une seconde source. Toute contradiction (ex. getBible marque `ls1910` comme « Copyrighted »)
   est consignée dans `docs/bible/BIBLE-LICENSING.md` avec la position retenue et sa justification.
4. Classer : `PUBLIC_DOMAIN`, `CC_BY`, `CC_BY_SA`, `CC_BY_ND`, `LICENSED` (contrat requis), `UNKNOWN` (bloquant).
5. Déterminer : stockage local ? redistribution ? hors-ligne ? usage commercial ? attribution exacte ? modifications interdites ?
6. Remplir la fiche `bible_translation` (licenseType, licenseUrl, attribution, sourceUrl, licenseEvidence).
7. Demander la validation explicite de l'utilisateur / d'un `SUPER_ADMIN` avant tout import.

## Statuts connus (au 2026-11-04)
- LSG 1910, Darby FR, Martin 1744, Ostervald : domaine public (vérifier l'édition).
- Néo-Crampon Libre : CC BY-SA 4.0 (deutérocanoniques à exclure).
- Segond 21, NEG 1979, Colombe, Semeur, Parole de Vie, NBS, TOB : **sous droits** → interdits sans contrat.

## Contraintes
Ne jamais présenter un avis comme juridique ; signaler le besoin d'un juriste pour tout cas `LICENSED` ou ambigu.

## Références
`docs/bible/BIBLE-LICENSING.md`, `docs/bible/BIBLE-API-COMPARISON.md`, `docs/adr/ADR-006-BIBLE-INTEGRATION.md`.
