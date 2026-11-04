---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` : ne jamais assouplir.
- Interdits : `any`, `@ts-ignore`, `as` hors `as const` ou après garde de type. `@ts-expect-error` seulement avec justification.
- Entrées externes typées `unknown` puis validées par Zod ; types dérivés via `z.infer`.
- Schémas dans `schemas.ts`, types dans `types.ts`, constantes dans `constants.ts` du module.
- Erreurs : `AppError` typées dans les services ; `Result<T>` en sortie des Server Actions.
- `switch` exhaustifs sur les enums (`satisfies never`).
- Ids de marque (`UserId`, `CommunityId`) dans les signatures de policies.
- Pas de code mort, pas de `console.log` (logger `pino`), commentaires seulement pour le *pourquoi*.
