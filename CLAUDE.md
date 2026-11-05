# CLAUDE.md — e-Parole

Plateforme sociale **protestante évangélique** (pas catholique) : Bible intégrée + réseau social + communautés +
prières + enseignements + administration. Signature : « Grandir dans la foi, ensemble. » Français par défaut,
i18n prévue. Cible : Afrique francophone, mobile, réseau lent.

**État : Phase 1 (fondations) livrée, en attente de validation. Ne pas commencer la Phase 2 (Bible) sans accord explicite.**

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
Next.js 16.4.3 · React 19 · **TypeScript 6.0.3** (TS 7 incompatible, ADR-009) · Tailwind 4 · primitives Radix (shadcn) ·
PostgreSQL 17 · Prisma **7.10.1** (jamais `pnpm add prisma@latest` : RC 8) · Better Auth 1.7.14 · Zod 4 · pg-boss ·
S3 (**SeaweedFS** en dev) · next-intl · Vitest · Playwright · **pnpm 11.28.9** uniquement.
Versions publiées depuis au moins 7 jours (`minimumReleaseAge`). Jamais d'alpha, beta, RC ou canary sans accord explicite.

## Conventions
- TypeScript : `strict`, `noUncheckedIndexedAccess`, pas de `any`, pas de `as` non justifié. Types de domaine dans `types.ts` du module.
- Next.js : Server Components par défaut, `"use client"` le plus bas possible. Server Actions pour les mutations
  de formulaires, Route Handlers pour uploads, webhooks, SSE et API consommées hors React. Toute entrée validée par Zod côté serveur.
- Prisma : accès DB uniquement via `src/server/db` et les repositories des modules. Migrations versionnées,
  jamais `db push` hors local. Ids `cuid2`, `createdAt/updatedAt`, soft delete (`deletedAt`) seulement là où `docs/11` le prévoit.
- Admin : `adminAction()` (Next) délègue à `runAdminAction()` (cœur testable). Pages : `requireAdminPage()`, `requireCommunityManager()`.
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
Port standard précédé d'un 5 : web 53000 (E2E 53100), PostgreSQL 55432, SeaweedFS S3 58333, Mailpit 58025/51025, Redis 56379.
Utiliser `127.0.0.1` dans les URL de services.
Tout nouveau service suit cette règle (`docs/22-DOCKER-SETUP.md`).

## Commandes
`docker compose up -d --wait db storage mail` · `pnpm dev` · `pnpm worker` · `pnpm lint` · `pnpm typecheck` · `pnpm test` ·
`pnpm test:integration` · `pnpm build && pnpm test:e2e` · `pnpm db:migrate` / `db:deploy` / `db:seed`.
Premier démarrage : `docs/22-DOCKER-SETUP.md`.

## Où chercher
Produit `docs/04`, MVP `docs/07`, données `docs/11`, RBAC `docs/admin/ADMIN-ROLES-PERMISSIONS.md`,
skills `.claude/skills/`, agents `.claude/agents/`, règles ciblées `.claude/rules/`.
