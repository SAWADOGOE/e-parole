# 25 — Standards de code

## TypeScript
- `tsconfig` : `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`.
- Interdits : `any`, `@ts-ignore` (utiliser `@ts-expect-error` avec justification), `as` sauf après une garde ou pour `as const`.
- Types dérivés des schémas : `type CreatePostInput = z.infer<typeof createPostSchema>`.
- Ids typés par marque (`type UserId = string & { __brand: "UserId" }`) pour les fonctions de policy.
- Unions discriminées pour les résultats (`Result<T>`) et les états.

## Organisation d'un module
```text
features/prayers/
  index.ts            # API publique du module (seul point d'import externe)
  types.ts            # types de domaine
  constants.ts        # limites, catégories par défaut
  schemas.ts          # Zod
  server/
    service.ts        # règles métier, transactions
    repository.ts     # requêtes Prisma, filtres de visibilité
    policy.ts         # règles d'autorisation spécifiques
    actions.ts        # Server Actions ("use server")
    jobs.ts           # handlers pg-boss
  components/         # UI du module
  __tests__/
```

## Nommage
- Fichiers : `kebab-case.ts` ; composants : `PascalCase` dans `prayer-item.tsx`.
- Fonctions : verbe + objet (`listCommunityPrayers`, `assertCanModerate`).
- Permissions : `ressource:action` (`prayer:support`, `user:suspend`).
- Audit : `domaine.action` (`user.suspend`).
- Routes françaises côté membres (`/prieres`, `/communautes`, `/bible`, `/profil`) — décision Q2 validée ; routes
  `/admin` et `/manage` en anglais (`/admin/users`) pour la cohérence avec le code.

## Next.js
- Server Components par défaut ; `"use client"` uniquement pour l'interactivité, sur la plus petite feuille.
- Pas de `fetch` vers sa propre API depuis un Server Component : appeler le service.
- Données utilisateur jamais mises en cache partagé ; utiliser `"use cache"` uniquement pour le public (Bible, verset du jour).
- `loading.tsx` et `error.tsx` par segment significatif ; `not-found.tsx` sobre.
- Métadonnées (`generateMetadata`) : pas d'informations privées dans les titres de page.

## Style
ESLint (flat config, `next`, `typescript-eslint` strict, `jsx-a11y`, `boundaries`) + Prettier. Commentaires uniquement pour
expliquer un *pourquoi* non évident. Pas de code mort, pas de `console.log` (logger structuré `pino`).

## Dépendances
Toute nouvelle dépendance doit être justifiée dans la PR (besoin, alternatives, taille, maintenance, licence).
