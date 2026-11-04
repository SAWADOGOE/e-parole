---
paths:
  - "src/features/bible/**"
  - "scripts/bible/**"
  - "src/app/**/bible/**"
  - "docs/bible/**"
---

# Bible

- Le texte biblique est immuable : jamais modifié, corrigé, modernisé ou généré (humain ou IA). Correction = nouvel import.
- Toujours afficher référence + traduction + attribution.
- Séparer strictement texte biblique, notes, méditations, commentaires (données et rendu).
- Canon protestant de 66 livres ; codes USFM (`GEN`…`REV`) ; deutérocanoniques exclus à l'import.
- Lecture runtime uniquement depuis PostgreSQL (`BibleReader`) ; aucune API externe au rendu.
- Citations : stocker la référence, rendre le texte depuis la base.
- Données utilisateur référencées par coordonnées (livre, chapitre, verset), pas par `BibleVerse.id`.
- Notes bibliques strictement privées.
- Aucune traduction importée sans licence documentée (`docs/bible/BIBLE-LICENSING.md`) et validation humaine.
- Import : `--dry-run`, checksum, rapport d'intégrité, version `STAGED`, activation explicite.
