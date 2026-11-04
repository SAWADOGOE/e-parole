# Architecture

- Monolithe modulaire : `src/app` (routes minces) → `src/features/<module>` → `src/server` / `src/lib`. Jamais l'inverse.
- Un module n'importe un autre module que par son `index.ts`.
- `prisma` importé uniquement dans `src/server/db` et les `repository.ts`.
- Logique métier dans `server/service.ts`, autorisation dans `policy.ts` + `authorize()`, jamais dans les composants.
- Deux processus seulement (`web`, `worker`). Pas de microservice, pas de Redis, pas de nouveau processus sans ADR.
- Toute décision structurante → ADR dans `docs/adr/`.
- Respecter la phase en cours (`docs/08-ROADMAP.md`) ; ne pas créer de route « pour remplir l'arborescence ».
- Principes : KISS et DRY d'abord ; SOLID quand il clarifie ; pas d'abstraction sans deuxième usage réel.
