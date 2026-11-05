# ADR-009 — Ajustements d'outillage constatés en Phase 1

- **Statut** : Accepté (Phase 1)
- **Date** : 2026-11-04
- **Modifie** : [docs/09-TECH-STACK.md](../09-TECH-STACK.md), [ADR-004](ADR-004-FILE-STORAGE.md) (stockage de développement)

## Contexte
La Phase 0 retenait TypeScript 7, pnpm 12 et MinIO en développement. L'installation a révélé trois blocages, et
plusieurs paquets publiés le jour même.

## Décisions

### 1. TypeScript 6.0.3 au lieu de 7.0.2 (spike F-3)
- TypeScript 7 (compilateur natif) **n'expose plus d'API JavaScript** (`typescript.createProgram` est indéfini).
- `typescript-eslint` 8.72 exige `typescript >=4.8.4 <6.1.0`. Le plugin TypeScript de Next.js et son
  contrôle de types au build s'appuient sur cette API.
- **Décision** : TypeScript **6.0.3** (dernière stable de la ligne 6, publiée le 2026-04-16).
- **Réévaluation** : dès que `typescript-eslint` et Next.js prennent officiellement en charge TypeScript 7.

### 2. pnpm 11.28.9 au lieu de 12.16.1
- pnpm 12 est une réécriture native (binaire Rust) ; Corepack 0.34 (livré avec Node 22.19) ne sait pas l'exécuter
  (`Cannot find module …/pnpm.cjs`).
- **Décision** : pnpm **11.28.9** (`"packageManager": "pnpm@11.28.9"`), sans modifier Corepack globalement.

### 3. SeaweedFS au lieu de MinIO en développement
- Les images `minio/minio` ne sont plus publiées sur Docker Hub (le dépôt répond 404) ; seule une image figée
  de juin 2025 subsistait en local, sans correctifs.
- **Décision** : **SeaweedFS 4.48** (`weed mini`, S3 compatible, maintenu), port hôte **58333** (8333 préfixé de 5).
  Le code reste écrit contre l'API S3 (`@aws-sdk/client-s3`). La production reste un S3 managé (ADR-004).

### 4. Délai minimal de publication : 7 jours
- Plusieurs versions `latest` avaient été publiées quelques heures plus tôt (ex. `better-auth` 1.7.17 le jour même).
- **Décision** : chaque dépendance directe est figée à la **dernière version stable publiée depuis au moins 7 jours**
  (`next` 16.4.3, `better-auth` 1.7.14…), et pnpm l'impose : `minimumReleaseAge: 10080` dans `pnpm-workspace.yaml`.
- Les scripts d'installation sont bloqués par défaut ; seuls `prisma`, `@prisma/engines` et `esbuild` sont autorisés (`allowBuilds`).

## Conséquences
- Mises à jour hebdomadaires plutôt qu'immédiates ; un correctif de sécurité urgent peut justifier une exception
  documentée dans la PR.
- `docs/09-TECH-STACK.md`, `docs/22-DOCKER-SETUP.md` et `CLAUDE.md` reflètent les versions réellement installées.
