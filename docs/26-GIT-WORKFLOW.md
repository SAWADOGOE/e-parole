# 26 — Workflow Git

## État constaté en Phase 0
Dépôt initialisé, branche `main` **sans aucun commit**, aucun remote. Branche de travail créée : `phase-0/conception`.
Les fichiers de la Phase 0 ne sont **pas encore committés** : le commit initial est laissé à la validation de l'utilisateur.

## Modèle
Trunk-based simplifié :
- `main` : toujours déployable, protégée.
- Branches courtes : `feat/<module>-<sujet>`, `fix/…`, `docs/…`, `chore/…`, `refactor/…`, `test/…`.
- Une branche par phase pour les jalons : `phase-1/fondations`, etc., fusionnée par PR.

## Commits — Conventional Commits
```
<type>(<scope>): <résumé à l'impératif, ≤ 72 caractères>

<corps optionnel : pourquoi, pas comment>
```
Types : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `security`.
Scopes : `auth`, `bible`, `social`, `prayers`, `communities`, `admin`, `manage`, `moderation`, `ui`, `db`, `infra`.
Exemples : `feat(bible): add reference parser`, `fix(prayers): hide anonymous author from community admins`.

## Revue
1. Auto-revue avec la checklist de [CONTRIBUTING.md](../CONTRIBUTING.md).
2. `code-reviewer` (agent) puis `security-auditor` si la PR touche auth, policies, uploads, prières ou messagerie.
3. Validation humaine obligatoire avant fusion. Squash merge.

## Interdits sans demande explicite
Push, force push, merge, rebase de branches partagées, `reset --hard`, suppression de branches ou de fichiers, déploiement.
