---
name: eparole-architecture
description: Use when creating a new e-Parole feature module, moving code between modules, adding cross-module imports, introducing a new dependency or service, or deciding where a piece of logic belongs (app route vs feature service vs src/server). Enforces the modular-monolith boundaries of e-Parole.
---

# e-Parole — architecture du monolithe modulaire

## Quand l'utiliser
Création d'un module `src/features/<module>`, ajout d'un import entre modules, nouvelle dépendance npm, nouveau processus,
doute sur l'emplacement d'une logique.

## Objectifs
Garder des modules faiblement couplés, une logique métier côté serveur, des routes minces.

## Instructions
1. Lire `docs/10-SYSTEM-ARCHITECTURE.md` et l'ADR concerné dans `docs/adr/`.
2. Placer le code :
   - Route, page, layout → `src/app/(group)/…` : uniquement composition, chargement via services, `notFound()`.
   - Règle métier → `src/features/<module>/server/service.ts`.
   - Requête Prisma → `src/features/<module>/server/repository.ts` (seul endroit avec `prisma`, avec `src/server/db`).
   - Autorisation → `policy.ts` du module + `authorize()` de `src/server/policies`.
   - Transverse sans métier (auth, jobs, storage, audit, erreurs, rate limit) → `src/server/<x>`.
   - Fonction pure réutilisable → `src/lib`.
3. Import inter-modules : uniquement via `src/features/<autre>/index.ts`. Si l'API publique ne suffit pas, l'étendre
   explicitement plutôt qu'importer un fichier interne.
4. Nouvelle dépendance : justifier (besoin, alternatives, poids, maintenance, licence), version stable exacte, mise à jour de `docs/09-TECH-STACK.md`.
5. Décision structurante → nouvel ADR (`docs/adr/ADR-0xx-*.md`) + ligne dans `docs/adr/README.md` et `docs/28`.

## Contraintes
- Pas de microservice, pas de nouveau processus sans ADR (seuls `web` et `worker` existent ; `realtime` prévu en Phase 7).
- Pas de Redis avant justification (ADR-001, ADR-005).
- Pas de logique métier dans les composants client.

## Vérifications
- [ ] Aucun import `@/features/x/server/...` depuis un autre module
- [ ] Aucun `import { prisma }` hors repositories et `src/server/db`
- [ ] Route sans règle métier inline
- [ ] Dépendance documentée

## Références
`docs/10-SYSTEM-ARCHITECTURE.md`, `docs/25-CODING-STANDARDS.md`, `docs/adr/ADR-001-ARCHITECTURE.md`.
