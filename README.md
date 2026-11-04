# e-Parole

> **Grandir dans la foi, ensemble.**

e-Parole est une plateforme sociale chrétienne **protestante évangélique** qui réunit dans un seul produit :
une **Bible intégrée** (Louis Segond 1910 au lancement), un **réseau social** centré sur la Parole,
des **communautés** (églises, groupes de prière, jeunesse), un **espace de prière et d'intercession**,
des **enseignements et prédications**, et un **back-office d'administration** professionnel.

Marché initial : Burkina Faso et Afrique francophone. Le produit est conçu pour des connexions mobiles lentes ou instables.

## Statut

| Phase | État |
|---|---|
| Phase 0 — Conception et configuration | **Terminée (documentation uniquement)** |
| Phase 1 — Fondations techniques | Non commencée, en attente de validation |

**Aucun code applicatif n'existe encore.** Ce dépôt contient uniquement la documentation de conception,
les ADR et la configuration Claude Code (skills, agents, rules).

## Stack cible (validée en Phase 0, installée en Phase 1)

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · shadcn/ui · PostgreSQL 17 · Prisma 7 ·
Better Auth · Zod 4 · pg-boss · stockage S3 (MinIO en dev) · next-intl · Vitest · Playwright · Docker Compose · pnpm.
Versions vérifiées : [docs/09-TECH-STACK.md](docs/09-TECH-STACK.md).

## Trois espaces

| Espace | Route | Public | Design |
|---|---|---|---|
| Communautaire | `/` | Membres et visiteurs | Mobile-first, éditorial, chaleureux |
| Responsable | `/manage` | Responsables de communautés | Fonctionnel, limité à leurs communautés |
| Administration | `/admin` | Équipe e-Parole | Desktop-first, orienté productivité |

## Documentation

- Point d'entrée : [docs/01-PROJECT-OVERVIEW.md](docs/01-PROJECT-OVERVIEW.md)
- MVP : [docs/07-MVP-SCOPE.md](docs/07-MVP-SCOPE.md) · Roadmap : [docs/08-ROADMAP.md](docs/08-ROADMAP.md)
- Architecture : [docs/10-SYSTEM-ARCHITECTURE.md](docs/10-SYSTEM-ARCHITECTURE.md)
- Module Bible : [docs/bible/README.md](docs/bible/README.md)
- Administration : [docs/admin/ADMIN-OVERVIEW.md](docs/admin/ADMIN-OVERVIEW.md)
- Décisions : [docs/adr/README.md](docs/adr/README.md)
- Travailler avec Claude Code : [CLAUDE.md](CLAUDE.md) · [docs/claude/CLAUDE-WORKFLOWS.md](docs/claude/CLAUDE-WORKFLOWS.md)

## Démarrage

Pas encore applicable. Les commandes prévues pour la Phase 1 sont dans
[docs/22-DOCKER-SETUP.md](docs/22-DOCKER-SETUP.md).

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md) et [SECURITY.md](SECURITY.md).
