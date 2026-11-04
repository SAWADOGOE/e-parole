---
name: eparole-prisma-postgres
description: Use when editing prisma/schema.prisma, writing migrations, writing repository queries, adding indexes, full-text search, CHECK constraints, soft delete, cursor pagination, or seeds in e-Parole (PostgreSQL 17 + Prisma 7).
---

# e-Parole — Prisma 7 et PostgreSQL 17

## Instructions
1. Lire `docs/11-DATABASE-DESIGN.md` (conventions, modèles) ; pour la Bible, `docs/bible/BIBLE-DATABASE-SCHEMA.md`.
2. **Version** : `prisma@7.10.1` et `@prisma/client@7.10.1` épinglés. Ne jamais lancer `pnpm add prisma@latest` (tag sur RC 8).
   Vérifier la doc Prisma 7 (générateur `prisma-client`, `prisma.config.ts`, adapter `@prisma/adapter-pg`).
3. Conventions : `cuid(2)`, `@@map` snake_case, `createdAt`/`updatedAt`, `deletedAt` uniquement sur les modèles listés.
4. Chaque requête de liste : pagination par curseur `(createdAt, id)`, `take ≤ 30` (membres) / `≤ 100` (admin).
5. Filtres de visibilité **dans le repository** : `deletedAt: null`, `isHidden` selon l'acteur, blocages, appartenance communautaire.
6. Fonctions de repository communautaire : premier paramètre `scope: CommunityScope` obligatoire.
7. Ce que Prisma n'exprime pas (FTS, `CHECK`, index partiels, `REVOKE`, extensions) → SQL brut dans la migration, commenté.
8. Migrations : `prisma migrate dev --name <verbe_objet>` ; jamais `db push` hors prototype ; expand → migrate → contract.
9. Transactions (`$transaction`) pour : écriture + audit, compteurs dénormalisés, changement de rôle.
10. Éviter les N+1 : `include`/`select` explicites ; tests d'intégration avec compteur de requêtes sur les fils.
11. Seeds : données marquées démo (`isDemo` / préfixe `[Démo]`), jamais de données réelles.

## Contraintes
- Aucune écriture applicative sur `bible_verse`, `bible_translation_version` (rôle d'import dédié).
- `audit_log` en append-only.
- Jamais de connexion à une base de production depuis un poste de dev ou un MCP.

## Vérifications
- [ ] `prisma validate` et `prisma migrate diff` propres
- [ ] Index couvrant chaque nouveau filtre/tri fréquent
- [ ] Tests d'intégration sur PostgreSQL réel (pas de mock Prisma)

## Références
`docs/11-DATABASE-DESIGN.md`, `docs/adr/ADR-002-DATABASE.md`, `docs/bible/BIBLE-SEARCH.md`.
