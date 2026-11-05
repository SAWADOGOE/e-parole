# 09 — Stack technique

Versions relevées le **2026-11-04** avec `npm view <paquet> dist-tags` (registre npm). Elles seront figées
(version exacte dans `package.json`, lockfile committé) au début de la Phase 1, après une nouvelle vérification.

## Environnement local constaté
| Outil | Version constatée | Remarque |
|---|---|---|
| Node.js | 22.19.0 | LTS. Next 16 exige ≥ 20.9. Cible Docker : `node:22-alpine` (ou 24 LTS si validé en Phase 1) |
| npm | 10.9.3 | |
| pnpm | **cassé** | Corepack pointe vers `pnpm 12.16.1` absent du cache. Correctif proposé en Phase 1 : `corepack prepare pnpm@12.16.1 --activate` |
| Docker | 29.9.2 | Docker Compose v2 intégré |
| Git | 2.56.0 | |
| Claude Code | 2.1.318 | |

## Installé en Phase 1 (2026-11-04) — état réel

Versions **exactes** dans `package.json` (lockfile `pnpm-lock.yaml`). Règle : dernière stable publiée depuis
au moins 7 jours, imposée par `minimumReleaseAge: 10080` ([ADR-009](adr/ADR-009-PHASE1-TOOLING.md)).

| Paquet | Version installée | Écart vs Phase 0 |
|---|---|---|
| `next` / `eslint-config-next` | 16.4.3 | 16.4.5 trop récente (< 7 j) |
| `react`, `react-dom` | 19.3.1 | — |
| `typescript` | **6.0.3** | TS 7 incompatible (pas d'API JS, typescript-eslint < 6.1) |
| `prisma`, `@prisma/client`, `@prisma/adapter-pg` | 7.10.1 | — |
| `better-auth` | 1.7.14 | 1.7.16/1.7.17 trop récentes |
| `zod` | 4.6.7 | — |
| `next-intl` | 4.14.9 | — |
| `pg-boss` | 12.38.0 | — |
| `tailwindcss`, `@tailwindcss/postcss` | 4.3.3 | 4.3.4 trop récente |
| `radix-ui` (primitives shadcn) | 1.8.1 | — |
| `lucide-react` | 1.62.0 | — |
| `motion` | 14.7.1 | installé, pas encore utilisé |
| `pino` | 10.4.0 | — |
| `nodemailer` | 10.2.1 | — |
| `vitest` | 5.0.5 | — |
| `@playwright/test` / `@axe-core/playwright` | 1.64.1 / 4.14.0 | — |
| `eslint` / `typescript-eslint` | 10.13.0 / 8.72.1 | — |
| pnpm | **11.28.9** | pnpm 12 non exécutable par Corepack 0.34 |
| Images | `postgres:17.11-alpine`, `chrislusf/seaweedfs:4.48`, `axllent/mailpit:v1.32.0`, `node:22.23.4-alpine` | **SeaweedFS** remplace MinIO (images plus publiées) |

Non installés en Phase 1 (pas encore utilisés) : `@aws-sdk/client-s3`, `sharp`, `@tanstack/react-table`, `recharts`,
`react-hook-form`. Ils seront ajoutés avec la phase qui en a besoin.

## Versions stables retenues (relevé Phase 0)

| Catégorie | Paquet | `latest` relevé | Choix | Note |
|---|---|---|---|---|
| Framework | `next` | 16.4.5 | **16.4.x** | App Router, Turbopack |
| UI runtime | `react`, `react-dom` | 19.3.1 | **19.3.x** | |
| Langage | `typescript` | 7.0.2 | **7.0.x** sous réserve | ⚠️ voir vigilance |
| ORM | `prisma` (CLI) | **8.0.0-rc.30** | **7.10.1** | Le tag `latest` du CLI pointe sur une RC : **ne pas utiliser** `prisma@latest` |
| ORM | `@prisma/client` | 7.10.1 | **7.10.1** | Aligné sur le CLI |
| CSS | `tailwindcss` | 4.3.4 | **4.3.x** | Config CSS-first (`@theme`) |
| Composants | `shadcn` (CLI) | 4.23.0 | **4.x** | Copie de composants Radix dans `src/components/ui` |
| Icônes | `lucide-react` | 1.68.0 | **1.x** | |
| Animations | `motion` | 14.9.1 | **14.x** | Import `motion/react` |
| Auth | `better-auth` | 1.7.16 | **1.7.x** | Voir [ADR-003](adr/ADR-003-AUTHENTICATION.md) |
| Auth (écarté) | `next-auth` | 4.24.15 (v5 en `beta`) | — | Auth.js v5 toujours en bêta |
| Validation | `zod` | 4.6.7 | **4.x** | |
| Formulaires | `react-hook-form` | 7.91.0 | **7.x** | Formulaires complexes uniquement |
| i18n | `next-intl` | 4.14.9 | **4.x** | |
| Jobs | `pg-boss` | 12.38.0 | **12.x** | File de jobs sur PostgreSQL, pas de Redis au MVP |
| Stockage | `@aws-sdk/client-s3` | 3.1161.0 | **3.x** | Portable MinIO / R2 / Scaleway / OVH |
| Images | `sharp` | 0.35.5 | **0.35.x** | Redimensionnement côté worker |
| Tableaux admin | `@tanstack/react-table` | 9.3.1 | **9.x** | ⚠️ API v9 à revalider vs exemples shadcn (souvent v8) |
| Graphiques | `recharts` | 3.10.1 | **3.x** | Base des « charts » shadcn |
| Tests unitaires | `vitest` | 5.1.0 | **5.x** | |
| Tests composants | `@testing-library/react` | 16.3.3 | **16.x** | |
| E2E | `@playwright/test` | 1.64.1 | **1.64.x** | |
| Accessibilité | `@axe-core/playwright` | 4.14.0 | **4.x** | |
| Lint | `eslint` | 10.14.0 | **10.x** | Config flat |

Écartés au MVP : `ioredis`/Redis, `bullmq` (Redis requis), `socket.io` (temps réel en Phase 7), SDK `minio` (préférer l'API S3 standard).

## Services (images Docker)
| Service | Image proposée | Justification |
|---|---|---|
| PostgreSQL | `postgres:17-alpine` | Stable, FTS français, `unaccent`, `pg_trgm`. ⚠️ Vérifier si 18 est adoptable en Phase 1 |
| Stockage | `minio/minio` (dev uniquement) | ⚠️ Le projet MinIO a réduit son édition communautaire en 2025 ; en production, préférer un S3 managé (voir [ADR-004](adr/ADR-004-FILE-STORAGE.md)) |
| Email dev | `axllent/mailpit` | Capture SMTP locale |
| Redis | non retenu au MVP | À réintroduire en Phase 7 pour le temps réel multi-instance |

Les tags d'image exacts (digest) seront figés en Phase 1.

## Gestionnaire de paquets : pnpm
| Critère | pnpm | npm |
|---|---|---|
| Rigueur des dépendances | Pas d'accès aux dépendances fantômes | Arbre plat permissif |
| Vitesse / disque | Store partagé, rapide | Plus lent |
| Sécurité | `onlyBuiltDependencies`, scripts d'install bloqués par défaut (v10+) | Scripts exécutés par défaut |
| Environnement local | Corepack à réparer | Fonctionne |

**Décision : pnpm**, épinglé via `"packageManager": "pnpm@12.16.1"` dans `package.json`.

## Points de vigilance
1. **TypeScript 7** est le compilateur natif. Vérifier en Phase 1 la compatibilité de `typescript-eslint`, du plugin
   TS de Next.js et de Vitest. Si un outil bloque, repli sur la dernière version stable de la ligne précédente, documenté par ADR.
2. **Prisma 7** : générateur `prisma-client`, `prisma.config.ts` et driver adapter `@prisma/adapter-pg`. Vérifier la
   documentation officielle au moment de l'init ; ne pas suivre de tutoriels Prisma 5/6.
3. **TanStack Table 9** : vérifier les changements d'API avant de copier des exemples.
4. Aucune version alpha, beta, RC, canary ou preview.
