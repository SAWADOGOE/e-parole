---
name: eparole-typescript
description: Use when writing or reviewing TypeScript types, Zod schemas, Result/AppError error handling, branded ids or discriminated unions in e-Parole. Enforces strict typing conventions.
---

# e-Parole — TypeScript strict

## Instructions
1. `tsconfig` strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`. Ne jamais les assouplir.
2. Pas de `any` ; `unknown` + validation Zod aux frontières (Server Actions, Route Handlers, jobs, JSON de la base).
3. Les types d'entrée dérivent des schémas : `z.infer<typeof schema>`. Schémas dans `schemas.ts`, types de domaine dans `types.ts`.
4. Ids de marque pour les fonctions sensibles : `UserId`, `CommunityId`, `PrayerId`.
5. Résultats : `Result<T> = { ok: true; data: T } | { ok: false; error: AppErrorPayload }`.
6. Erreurs : `throw new AppError("FORBIDDEN")` dans les services ; conversion en `Result` dans le wrapper d'action.
7. `switch` exhaustifs sur les enums (`satisfies never` dans le `default`).
8. Constantes en `as const` ; limites (longueurs, quotas) dans `constants.ts`, réutilisées par Zod et l'UI.
9. Champs JSON Prisma (`verseRef`, `body`, `metadata`) : schéma Zod dédié, parse à la lecture.

## Contraintes
`@ts-ignore` interdit ; `@ts-expect-error` avec justification. `as` uniquement pour `as const` ou après garde de type.
⚠️ TypeScript 7 (compilateur natif) : signaler toute incompatibilité d'outillage plutôt que de contourner.

## Vérifications
- [ ] `pnpm typecheck` vert
- [ ] Aucune entrée non validée atteint un service

## Références
`docs/25-CODING-STANDARDS.md`, `docs/13-API-DESIGN.md#codes-derreur`.
