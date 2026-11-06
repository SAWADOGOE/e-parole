# 27 — Backlog

Estimation en points (1 = demi-journée). `US` → [06-USER-STORIES](06-USER-STORIES.md), `REQ` → [04](04-PRODUCT-REQUIREMENTS.md).

## Phase 1 — Fondations

**Statut : F-1 à F-15 livrés le 2026-11-04** (détails et écarts : [CHANGELOG](../CHANGELOG.md), [ADR-009](adr/ADR-009-PHASE1-TOOLING.md)).
| ID | Tâche | Pts | Dépend de |
|---|---|---|---|
| F-1 | Réparer Corepack/pnpm, init Next.js 16 + TS strict, scripts pnpm | 1 | Validation Phase 0 |
| F-2 | ESLint flat + Prettier + règles de frontières de modules | 1 | F-1 |
| F-3 | Spike compatibilité TypeScript 7 (ESLint, Vitest, plugin Next) → ADR si repli | 1 | F-1 |
| F-4 | Tailwind 4 + tokens (`globals.css`) + polices Inter/Literata + mode sombre | 2 | F-1 |
| F-5 | shadcn/ui init + primitives listées en [16](16-COMPONENT-LIBRARY.md) | 2 | F-4 |
| F-6 | `compose.yaml` (db, storage, mail), `.env.example`, Dockerfile multi-stage | 2 | F-1 |
| F-7 | Prisma 7 + schéma de base + première migration + seed SUPER_ADMIN | 2 | F-6 |
| F-8 | Better Auth : email, vérification, reset, sessions, 2FA | 4 | F-7 |
| F-9 | `authorize()`, matrice de permissions, tests exhaustifs | 3 | F-7 |
| F-10 | Layouts `AppShell`, `ManageShell`, `AdminShell` + garde 404 | 3 | F-5, F-9 |
| F-11 | `AppError`, `Result`, wrapper `action()`, rate limiting PostgreSQL | 2 | F-7 |
| F-12 | AuditLog service + écran `/admin/audit-logs` minimal | 2 | F-9 |
| F-13 | pg-boss + worker + job `email.send` | 2 | F-7 |
| F-14 | next-intl (fr) | 1 | F-1 |
| F-15 | Vitest, Playwright, axe, factories ; CI GitHub Actions | 3 | F-1 |

## Phase 2 — Bible

**Statut : B-1 à B-10 livrés le 2026-11-05 sur `phase-2/bible`, en attente de validation.** B-9 partiel : l'insertion dans une publication arrive en Phase 3.
| ID | Tâche | Pts |
|---|---|---|
| B-1 | Modèles Bible + migration + extensions `unaccent`, `pg_trgm` | 2 |
| B-2 | Script d'import eBible (USFX) LSG + checksum + rapport d'intégrité | 4 |
| B-3 | Parseur de références (FR, abréviations, plages) + tests exhaustifs | 3 |
| B-4 | Lecteur chapitre (RSC), navigation, ancres (US-1) | 3 |
| B-5 | Sélecteur livre/chapitre (sheet/popover) + `ReferenceInput` (US-2) | 2 |
| B-6 | Recherche FTS + page résultats (US-3) | 3 |
| B-7 | Réglages de lecture + reprise | 2 |
| B-8 | Sélection de versets + actions + surlignages + notes + favoris (US-4) | 4 |
| B-9 | `VerseQuote` + partage vers publication (US-5) | 2 |
| B-10 | Verset du jour + admin de programmation (US-42) | 2 |

## Phase 3 — Social

**Statut : S-1 à S-10 livrés le 2026-11-06 sur `phase-3/social`, en attente de validation.** Détails et écarts : [CHANGELOG](../CHANGELOG.md), ADR-011 à 013.
Profils et visibilité (3) · uploads S3 + pipeline sharp (4) · publications typées (3) · commentaires (2) · réactions (1) ·
follows + blocages (2) · fils avec curseur (3) · mentions + notifications in-app (3) · favoris (1) · signalements +
`/admin/moderation` v1 (4).

## Phase 4 — Communautés et prières
Communautés + adhésions + invitations (4) · `/manage` membres et demandes (3) · publications internes (2) · modération locale (2) ·
prières : visibilité, anonymat, soutien, commentaires (4) · exaucement + témoignage (1) · `/admin/users` complet + suspension (3) ·
tests d'isolation inter-communautés (2) · pilote : CGU, confidentialité, onboarding (2).

## Phases 5 à 8
Voir [08-ROADMAP](08-ROADMAP.md). Détail à produire au début de chaque phase.

## Reporté (décision du propriétaire, 2026-11-05)
Tâches volontairement sorties du périmètre actuel pour ne pas alourdir le projet. À replanifier avant le lancement public (Phase 8).

| ID | Tâche | Contexte |
|---|---|---|
| R-2 | Détection automatique de mots-clés d'escroquerie (« Orange Money », « semence » contre prière) → signalement priorité 1 | Prévue par ADMIN-MODERATION, non livrée en Phase 3 |
| R-3 | Troncature des IP de l'audit après 90 jours | Le journal est en append-only pour le rôle applicatif : il faut une fonction `SECURITY DEFINER` dédiée, à concevoir |
| R-1 | Tests manuels aux lecteurs d'écran : TalkBack (Android, prioritaire pour le public cible), NVDA, VoiceOver | Les tests automatiques (axe) passent ; seule l'écoute humaine confirme une lecture agréable. Idéalement par une personne qui utilise TalkBack au quotidien. Protocole : lecture continue d'un chapitre, sélection d'un verset par son numéro, barre d'actions. |
