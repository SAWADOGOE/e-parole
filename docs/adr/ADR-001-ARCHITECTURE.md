# ADR-001 — Monolithe modulaire Next.js + worker pg-boss

- **Statut** : Accepté (Phase 0)
- **Date** : 2026-11-04

## Contexte
Équipe très réduite, budget d'exploitation serré, besoin de livrer un MVP cohérent (Bible, social, communautés,
prières, admin) et de le faire évoluer. Les modules partagent fortement les mêmes règles (visibilité, blocage, rôles).

## Options
1. **Monolithe modulaire Next.js** (UI + logique serveur dans un même déploiement) + worker.
2. Front Next.js + API séparée (NestJS/Fastify).
3. Microservices.

## Décision
Option 1. Un dépôt, une base PostgreSQL, deux processus issus de la même image : `web` et `worker`.
Les jobs asynchrones (emails, traitement d'images, notifications regroupées, publication programmée, purges) utilisent
**pg-boss** (file sur PostgreSQL) plutôt que BullMQ, pour éviter Redis au MVP.

## Conséquences
- ➕ Un seul langage, un seul déploiement, typage de bout en bout, transactions simples.
- ➕ Coût : un VPS suffit au pilote.
- ➖ Discipline nécessaire pour garder des frontières de modules (règles ESLint `boundaries`, API publique `index.ts`).
- ➖ Si une app mobile native apparaît, il faudra exposer une API versionnée (`/api/v1`), prévue mais non construite.
- Réévaluation si : > 50 000 utilisateurs actifs, équipe > 5 devs, ou besoin d'un service temps réel indépendant (voir ADR-005).
