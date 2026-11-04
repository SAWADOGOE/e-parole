# Contribuer à e-Parole

## Avant de commencer
- Lire [CLAUDE.md](CLAUDE.md), [docs/25-CODING-STANDARDS.md](docs/25-CODING-STANDARDS.md) et
  [docs/26-GIT-WORKFLOW.md](docs/26-GIT-WORKFLOW.md).
- Vérifier que la tâche figure au backlog ([docs/27-BACKLOG.md](docs/27-BACKLOG.md)) et appartient à la phase en cours.

## Flux
1. Créer une branche depuis `main` : `feat/bible-reader-font-size`, `fix/prayer-visibility-leak`, `docs/adr-009`.
2. Commits au format Conventional Commits : `feat(bible): add verse highlight`, `fix(rbac): deny cross-community access`.
3. Avant la PR : `pnpm lint && pnpm typecheck && pnpm test`, plus `pnpm test:e2e` si un parcours est touché.
4. Ouvrir une PR avec description, captures mobile et desktop pour toute UI, et la checklist ci-dessous.

## Checklist de PR
- [ ] Autorisation serveur vérifiée pour chaque nouvelle action ou route
- [ ] Entrées validées par Zod
- [ ] Tests ajoutés (unitaires et permissions ; E2E si parcours critique)
- [ ] États vide, chargement et erreur présents
- [ ] Navigation clavier et contrastes vérifiés
- [ ] Aucune donnée sensible dans les logs
- [ ] Documentation mise à jour (statut « implémenté » coché dans le doc du module)
- [ ] Aucune nouvelle dépendance sans justification écrite dans la PR

## Contenu biblique et théologique
Toute nouvelle traduction biblique exige une vérification de licence documentée dans
[docs/bible/BIBLE-LICENSING.md](docs/bible/BIBLE-LICENSING.md) et la validation d'un mainteneur.
Les contenus éditoriaux (méditations, enseignements) passent par le workflow de
[docs/admin/ADMIN-CONTENT-MANAGEMENT.md](docs/admin/ADMIN-CONTENT-MANAGEMENT.md).
