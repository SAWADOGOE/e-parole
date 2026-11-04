# ADR-002 — PostgreSQL 17 + Prisma 7

- **Statut** : Accepté (Phase 0)
- **Date** : 2026-11-04

## Contexte
Données fortement relationnelles (membres, rôles, communautés, visibilités), besoin de recherche plein texte en
français, de contraintes d'intégrité et de jobs transactionnels.

## Décision
- **PostgreSQL 17** (image `postgres:17-alpine`) : FTS avec configuration `french` + `unaccent`, `pg_trgm`, index partiels,
  `CHECK`, colonnes générées. Sert aussi de file de jobs (pg-boss) et de stockage du rate limiting au MVP.
- **Prisma 7.10.1** comme ORM. Le tag npm `latest` du CLI `prisma` pointe le 2026-11-04 sur `8.0.0-rc.30` : on épingle
  explicitement `prisma@7.10.1` et `@prisma/client@7.10.1`, et on n'adopte Prisma 8 qu'à sa sortie stable, via un nouvel ADR.
- SQL brut versionné dans les migrations pour ce que Prisma n'exprime pas (FTS, `CHECK`, index partiels, `REVOKE`).
- `$queryRaw` typé (TypedSQL) autorisé pour la recherche et les agrégats du dashboard.

## Alternatives écartées
Drizzle (bon, mais l'équipe et le brief visent Prisma ; migrations moins guidées) ; MongoDB (modèle relationnel évident) ;
Supabase (dépendance plateforme, RLS-centré).

## Conséquences
- Discipline sur les migrations (expand/contract) ; revue des migrations touchant la Bible.
- RLS non utilisée au MVP : l'isolation repose sur les repositories et les tests (voir [11](../11-DATABASE-DESIGN.md#isolation-entre-communautés)).
- Vérifier en Phase 1 les changements de Prisma 7 (générateur `prisma-client`, `prisma.config.ts`, driver adapter `pg`).
