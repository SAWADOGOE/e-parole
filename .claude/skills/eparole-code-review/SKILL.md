---
name: eparole-code-review
description: Use when reviewing an e-Parole diff, branch or pull request before merge. Provides the project-specific checklist (authorization, privacy of prayers and messages, Bible text integrity, community isolation, design tokens, accessibility, tests) on top of generic code review.
---

# e-Parole — revue de code

## Workflow
1. `git diff main...HEAD --stat` puis lecture des fichiers modifiés et de leur contexte (appelants, policies, tests).
2. Identifier les modules touchés et charger mentalement leurs règles (`docs/`).
3. Parcourir la checklist ; ne signaler que des problèmes **vérifiés dans le code**, avec fichier:ligne et scénario d'échec.
4. Classer : Bloquant · Important · Suggestion.

## Checklist e-Parole
**Sécurité et confidentialité (bloquant)**
- Chaque Server Action / Route Handler mutant : session, Zod, `authorize()` avec la ressource réelle.
- Ressource invisible → 404 ; pas de fuite via métadonnées, compteurs, notifications, recherche.
- Communautés : `CommunityScope` utilisé ; pas de `communityId` pris du client sans vérification.
- Prières anonymes : `authorId` absent des réponses ; prières privées, messages, notes : aucun accès admin.
- Aucune PII ou contenu sensible dans logs/audit ; aucun secret.
- Uploads : validation MIME + taille + re-encodage.

**Bible (bloquant)**
- Aucune écriture sur les tables `bible_verse*` hors import ; aucun texte biblique modifié ou recopié dans un post ;
  attribution présente.

**Architecture**
- Frontières de modules respectées, Prisma confiné aux repositories, pas de logique métier côté client.
- Pas de nouvelle dépendance non justifiée ni de version préliminaire.

**UI**
- Tokens uniquement, contrastes, états vide/chargement/erreur, clavier, cibles 44 px, i18n.

**Tests**
- Tests négatifs d'autorisation présents ; pas de mock du module testé ; E2E pour parcours critiques.

## Format de sortie
```
[Bloquant] src/features/prayers/server/repository.ts:42 — findVisible ignore Visibility.COMMUNITY pour les membres PENDING.
Scénario : un utilisateur en attente d'approbation lit les prières de la communauté.
```
Conclure par un verdict : « Prêt à fusionner » / « Modifications requises ».

## Références
`CONTRIBUTING.md`, `docs/25-CODING-STANDARDS.md`, skills `eparole-rbac`, `eparole-prayers`, `eparole-bible`.
