# CLAUDE.md — e-Parole

Plateforme sociale **protestante évangélique** (pas catholique) : Bible intégrée + réseau social + communautés +
prières + enseignements + administration. Signature : « Grandir dans la foi, ensemble. » Français par défaut,
i18n prévue. Cible : Afrique francophone, mobile, réseau lent.

**État : Phase 0 terminée, aucun code applicatif. Ne pas installer de dépendances, lancer Docker,
migrer une base ou créer des pages sans validation explicite de l'utilisateur.**

## Identité (non négociable)
- Centralité du Christ, autorité des Écritures, salut par grâce par la foi. Accueil des pentecôtistes,
  baptistes, charismatiques, indépendants. Pas d'iconographie mariale, de chapelet ni de statues de saints.
- Visuel : Bible, lumière, croix sobre, communauté. Aucun mépris envers les autres confessions.
- Détails : `docs/03-EVANGELICAL-IDENTITY.md`.

## Architecture
- Monolithe modulaire Next.js 16 App Router. Pas de microservices.
- `src/app` contient des routes minces. La logique métier vit dans `src/features/<module>/server/` (services, policies, repositories).
- Route groups : `(public)`, `(auth)`, `(community)`, `(manage)` → `/manage`, `(admin)` → `/admin`. Un layout par espace.
- Un worker (même code, entrée `src/worker.ts`) exécute les jobs pg-boss.
- Références : `docs/10-SYSTEM-ARCHITECTURE.md`, `docs/adr/`.

## Stack (versions figées dans `docs/09-TECH-STACK.md`)
Next.js 16 · React 19 · TypeScript strict · Tailwind 4 · shadcn/ui · lucide-react · Motion · PostgreSQL 17 ·
Prisma **7.x** (ne jamais faire `pnpm add prisma@latest` : le tag `latest` pointe sur une RC 8) · Better Auth ·
Zod 4 · pg-boss · S3 via `@aws-sdk/client-s3` (MinIO en dev) · next-intl · Vitest · Playwright · pnpm uniquement.
Jamais d'alpha, beta, RC ou canary sans accord explicite.

## Conventions
- TypeScript : `strict`, `noUncheckedIndexedAccess`, pas de `any`, pas de `as` non justifié. Types de domaine dans `types.ts` du module.
- Next.js : Server Components par défaut, `"use client"` le plus bas possible. Server Actions pour les mutations
  de formulaires, Route Handlers pour uploads, webhooks, SSE et API consommées hors React. Toute entrée validée par Zod côté serveur.
- Prisma : accès DB uniquement via `src/server/db` et les repositories des modules. Migrations versionnées,
  jamais `db push` hors local. Ids `cuid2`, `createdAt/updatedAt`, soft delete (`deletedAt`) seulement là où `docs/11` le prévoit.
- Erreurs : `AppError` typées (`NOT_FOUND`, `FORBIDDEN`, `VALIDATION`, `RATE_LIMITED`, `CONFLICT`) mappées vers une UI soignée.

## Sécurité (toujours)
- **Autorisation côté serveur à chaque action** via `authorize(actor, permission, resource)` (`src/server/policies`).
  Masquer un bouton n'est jamais une protection.
- Communautés : toute requête filtrée par `communityId` avec vérification de l'appartenance et du rôle local.
- Aucun accès admin ou modérateur au contenu des messages privés et prières privées, hormis l'extrait joint à un signalement.
- Audit log pour toute action sensible. Aucune donnée sensible (prière, message) dans les logs applicatifs.
- Secrets uniquement en variables d'environnement, jamais dans le dépôt ni affichés en clair dans l'UI.

## Bible
- Le texte biblique est une **donnée de référence immuable** : import contrôlé avec checksum, aucune écriture applicative.
- Toujours conserver référence + traduction + attribution. Une IA ne modifie jamais un verset.
- Séparer texte, notes, méditations et commentaires. Vérifier la licence avant toute traduction (`docs/bible/BIBLE-LICENSING.md`).

## UI/UX
- Mobile-first pour `/`, desktop-first pour `/admin`. Tokens dans `docs/15-DESIGN-SYSTEM.md`.
- WCAG 2.2 AA : `#2C8273` est réservé aux grands textes et icônes (4,24:1 sur ivoire), utiliser `#256F62` pour le texte ; l'or est décoratif.
- États vides, skeletons, erreurs et navigation clavier obligatoires. Pas de dashboard générique côté membres.

## Git
Branches `feat/…`, `fix/…`, `docs/…`, `chore/…`. Conventional Commits. Pas de push, merge, reset destructif ni
déploiement sans demande explicite. Voir `docs/26-GIT-WORKFLOW.md`.

## Ports locaux
Port standard précédé d'un 5 : web 53000, PostgreSQL 55432, MinIO 59000/59001, Mailpit 58025/51025, Redis 56379.
Tout nouveau service suit cette règle (`docs/22-DOCKER-SETUP.md`).

## Commandes (Phase 1, pas encore disponibles)
`pnpm dev` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e` · `pnpm db:migrate` · `docker compose up -d`

## Où chercher
Produit `docs/04`, MVP `docs/07`, données `docs/11`, RBAC `docs/admin/ADMIN-ROLES-PERMISSIONS.md`,
skills `.claude/skills/`, agents `.claude/agents/`, règles ciblées `.claude/rules/`.
