# 28 — Décisions d'architecture

Synthèse. Le détail et les alternatives sont dans [docs/adr/](adr/README.md).

| # | Décision | Statut | ADR |
|---|---|---|---|
| 1 | Monolithe modulaire Next.js, deux processus (web, worker) | Validé (Phase 0) | [ADR-001](adr/ADR-001-ARCHITECTURE.md) |
| 2 | PostgreSQL 17 + Prisma 7.10 (pas la RC 8) ; FTS natif | Validé | [ADR-002](adr/ADR-002-DATABASE.md) |
| 3 | Better Auth 1.7 plutôt qu'Auth.js (v5 en bêta) | Validé | [ADR-003](adr/ADR-003-AUTHENTICATION.md) |
| 4 | Stockage S3 via `@aws-sdk/client-s3` ; MinIO en dev ; S3 managé en prod | Validé | [ADR-004](adr/ADR-004-FILE-STORAGE.md) |
| 5 | Pas de temps réel au MVP ; SSE pour le compteur de notifications ; WebSocket en Phase 7 | Validé | [ADR-005](adr/ADR-005-REALTIME.md) |
| 6 | Bible stockée localement (import eBible.org, domaine public) ; API externes en secours | Validé | [ADR-006](adr/ADR-006-BIBLE-INTEGRATION.md) |
| 7 | Design tokens 3 niveaux, Tailwind 4 + shadcn, Inter + Literata | Validé | [ADR-007](adr/ADR-007-DESIGN-SYSTEM.md) |
| 8 | RBAC : rôles en base, permissions en code, rôles locaux séparés | Validé | [ADR-008](adr/ADR-008-ADMIN-RBAC.md) |
| 9 | pg-boss pour les jobs, pas de Redis au MVP | Validé | ADR-001 |
| 10 | pnpm comme unique gestionnaire | Validé | [09](09-TECH-STACK.md#gestionnaire-de-paquets--pnpm) |
| 11 | TypeScript 6.0.3, pnpm 11.28.9, SeaweedFS en dev, versions publiées depuis au moins 7 jours | Validé (Phase 1) | [ADR-009](adr/ADR-009-PHASE1-TOOLING.md) |
| 12 | Toute publication est publique (membres connectés) ; trois réactions Amen, J'aime, Encouragé | Décidé par le propriétaire (2026-11-05) | [04](04-PRODUCT-REQUIREMENTS.md) |
| 13 | Règles d'accès sociales en fragments SQL partagés ; fils sans cache partagé | Proposé (Phase 3) | [ADR-011](adr/ADR-011-SOCIAL-FEEDS-VISIBILITY.md) |
| 14 | Images en bucket privé, servies par l'application après contrôle d'accès | Proposé (Phase 3) | [ADR-012](adr/ADR-012-MEDIA-PIPELINE.md) |
| 15 | Notifications regroupées en base, SSE sur LISTEN/NOTIFY, repli polling 60 s | Proposé (Phase 3) | [ADR-013](adr/ADR-013-NOTIFICATIONS.md) |

## Hypothèses (à confirmer)
- H1 : le pilote ne dépasse pas ~2 000 utilisateurs et 10 communautés → un VPS suffit.
- H2 : le tutoiement dans l'UI membre est bien reçu.
- H3 : LSG 1910 seule suffit au pilote.
- H4 : 13 ans comme âge minimal est conforme au droit applicable.

## Questions tranchées (2026-11-04, par l'utilisateur)
| # | Décision |
|---|---|
| Q2 | **Routes en français** côté membres (`/prieres`, `/communautes`, `/bible`, `/profil`). `/admin` et `/manage` restent tels quels |
| Q3 | **Non** : les responsables de communauté ne voient jamais l'auteur réel d'une prière anonyme |
| Q8 | Le contenu éditorial est rédigé par **l'équipe admin** (`CONTENT_EDITOR`, `ADMIN`) au niveau plateforme, et par **les responsables de communauté** (`COMMUNITY_OWNER`, `COMMUNITY_ADMIN`) pour leur communauté, depuis `/manage`. Voir [ADMIN-CONTENT-MANAGEMENT](admin/ADMIN-CONTENT-MANAGEMENT.md#contenus-de-communauté) |

## Questions ouvertes
| # | Question | Bloque |
|---|---|---|
| Q1 | Hébergement : Europe (coût) ou Afrique de l'Ouest (latence, juridiction) ? | Phase 8 (pas la Phase 1) |
| Q4 | Nom de domaine et adresse email de sécurité | Phase 1 (emails) ; un domaine local `eparole.local` sert en attendant |
| Q5 | Accompagnement juridique (CIL Burkina, CGU, données sensibles, mineurs) | Pilote |
| Q6 | Création du logo par un designer ou placeholder durable ? | Phase 3 |
| Q7 | Cloudflare (CDN/Turnstile) acceptable ? | Phase 3 |
| Q9 | Remote GitHub : dépôt privé à créer ? (le MCP GitHub est en échec de connexion) | Phase 1 (CI) |
