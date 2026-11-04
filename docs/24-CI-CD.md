# 24 — CI/CD

GitHub Actions. **Statut : spécification**, aucun workflow créé en Phase 0 (aucun remote Git n'est configuré).

## Workflows prévus
| Fichier | Déclencheur | Jobs |
|---|---|---|
| `ci.yml` | PR + push sur `main` | `lint` · `typecheck` · `unit` · `integration` (service `postgres:17-alpine`) · `e2e` (build + Playwright + axe) · `build` |
| `security.yml` | PR + hebdomadaire | `pnpm audit --prod`, scan de secrets (gitleaks), CodeQL JavaScript/TypeScript |
| `lighthouse.yml` | PR touchant `src/app` ou `src/components` | Lighthouse CI avec budgets |
| `release.yml` | Tag `v*` ou manuel | Build et push de l'image vers GHCR ; déploiement staging ; production avec approbation |

## Règles
- Actions tierces épinglées par **SHA de commit**, permissions minimales (`permissions: contents: read` par défaut).
- Cache du store pnpm ; `pnpm install --frozen-lockfile`.
- Les secrets de production ne sont accessibles qu'au job de déploiement via GitHub Environments protégés.
- Protection de `main` : PR obligatoire, CI verte, 1 revue (humaine ou `code-reviewer` + validation humaine), pas de force push.
- Artefacts : rapport Playwright et traces conservés 7 jours en cas d'échec.
