# Architecture Decision Records

Format : contexte → options → décision → conséquences. Un ADR accepté n'est pas modifié : on le remplace par un nouvel
ADR qui le déclare `Remplacé par ADR-xxx`.

| ADR | Titre | Statut | Date |
|---|---|---|---|
| [001](ADR-001-ARCHITECTURE.md) | Monolithe modulaire Next.js + worker pg-boss | Accepté | 2026-11-04 |
| [002](ADR-002-DATABASE.md) | PostgreSQL 17 + Prisma 7 | Accepté | 2026-11-04 |
| [003](ADR-003-AUTHENTICATION.md) | Better Auth | Accepté | 2026-11-04 |
| [004](ADR-004-FILE-STORAGE.md) | Stockage objet S3 compatible | Accepté | 2026-11-04 |
| [005](ADR-005-REALTIME.md) | Temps réel différé, SSE puis WebSocket | Accepté | 2026-11-04 |
| [006](ADR-006-BIBLE-INTEGRATION.md) | Bible stockée localement, import depuis eBible.org | Accepté | 2026-11-04 |
| [007](ADR-007-DESIGN-SYSTEM.md) | Design system : tokens, Tailwind 4, shadcn, Inter + Literata | Accepté | 2026-11-04 |
| [008](ADR-008-ADMIN-RBAC.md) | RBAC hybride : rôles en base, permissions en code | Accepté | 2026-11-04 |
| [009](ADR-009-PHASE1-TOOLING.md) | TypeScript 6, pnpm 11, SeaweedFS en dev, délai de publication de 7 jours | Accepté | 2026-11-04 |
| [010](ADR-010-BIBLE-RENDERING-CACHE.md) | Rendu et cache du lecteur biblique sous CSP à nonce | Accepté | 2026-11-05 |

« Accepté » signifie validé par la conception de Phase 0, **sous réserve de la validation de l'utilisateur**.

Modèle pour un nouvel ADR : copier la structure de l'ADR-001, numéroter à la suite, ajouter la ligne au tableau.
