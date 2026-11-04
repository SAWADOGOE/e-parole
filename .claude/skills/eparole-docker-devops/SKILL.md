---
name: eparole-docker-devops
description: Use when creating or changing e-Parole Dockerfile, compose.yaml, .env.example, GitHub Actions workflows, backup/restore scripts, deployment procedures, health checks or monitoring.
---

# e-Parole — Docker et DevOps

## Instructions
1. Lire `docs/22-DOCKER-SETUP.md`, `docs/23-DEPLOYMENT.md`, `docs/24-CI-CD.md`.
2. Images stables à tag précis (puis digest) : `node:22-alpine`, `postgres:17-alpine`, `axllent/mailpit`, `minio/minio` (dev).
3. Dockerfile multi-stage (`base` → `deps` → `build` → `runner`), utilisateur non root, `output: "standalone"`, `HEALTHCHECK`.
4. Compose : réseaux `edge`/`internal` ; DB et stockage liés à `127.0.0.1` en dev, **non exposés** en prod ; ports par défaut
   préfixés par 5 (web 53000, db 55432, S3 59000/59001, Mailpit 58025/51025) et surchargeables.
5. Volumes nommés `eparole_*` ; service `migrate` ponctuel avant `web`.
6. `.env.example` sans aucune valeur réelle ; secrets réels hors dépôt.
7. GitHub Actions : actions épinglées par SHA, `permissions` minimales, environnements protégés pour la prod,
   déploiement **manuel** avec approbation.
8. Sauvegardes : `pg_dump -Fc` quotidien chiffré + `mc mirror` ; test de restauration documenté.

## Contraintes
Ne jamais lancer `docker compose up`, pousser une image, déployer ou toucher une base distante sans demande explicite
de l'utilisateur. Ne jamais connecter une base de production à un outil local ou MCP.

## Vérifications
- [ ] `docker compose config` valide
- [ ] Aucun secret dans les fichiers suivis (`gitleaks`)
- [ ] Healthchecks présents sur chaque service

## Références
`docs/22-DOCKER-SETUP.md`, `docs/23-DEPLOYMENT.md`, `docs/24-CI-CD.md`, `docs/30-MONITORING.md`.
