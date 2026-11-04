# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Versionnage SemVer à partir de la Phase 1.

## [Non publié]

### Ajouté — Phase 1 : fondations (2026-11-04)
- Next.js 16.4.3 (App Router), TypeScript 6.0.3 strict, Tailwind 4 avec les tokens du design system, primitives Radix.
- Docker Compose (PostgreSQL 17, SeaweedFS S3, Mailpit) sur les ports 5xxxx ; Dockerfile multi-stage non root.
- Prisma 7.10.1 : schéma de base, 3 migrations (extensions, contraintes, audit append-only, schéma pg-boss), seed.
- Better Auth 1.7.14 : inscription, vérification email, connexion, reset, sessions, 2FA TOTP et codes de secours.
- RBAC : matrice de permissions en code, `authorize()`, gardes `/admin` (MFA, 12 h) et `/manage` (404).
- Espaces membre, responsable et administration ; utilisateurs, rôles (ré-authentification) et journal d'audit.
- pg-boss et worker pour les emails ; next-intl (fr) ; CSP avec nonce et en-têtes de sécurité.
- Tests : unitaires, d'intégration (PostgreSQL réel) et E2E (Playwright + axe) ; CI GitHub Actions.

### Modifié
- TypeScript 6, pnpm 11 et SeaweedFS remplacent TypeScript 7, pnpm 12 et MinIO ([ADR-009](docs/adr/ADR-009-PHASE1-TOOLING.md)).

### Ajouté — Phase 0 (2026-11-04)
- Documentation de conception (`docs/`, `docs/bible/`, `docs/admin/`, `docs/claude/`, `docs/adr/`).
- `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `.gitignore`.
- 19 skills, 11 agents et 14 rules Claude Code dans `.claude/`.
- Aucun code applicatif, aucune dépendance installée.

### Décidé — validation de la Phase 0 (2026-11-04)
- Routes françaises côté membres (Q2).
- Les responsables de communauté ne voient pas l'auteur d'une prière anonyme (Q3).
- Contenu éditorial rédigé par l'équipe admin (plateforme) et par les responsables de communauté (`/manage`) (Q8).
