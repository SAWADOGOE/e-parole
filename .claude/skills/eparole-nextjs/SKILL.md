---
name: eparole-nextjs
description: Use when writing Next.js 16 App Router code for e-Parole - routes, route groups, layouts, Server Components, Server Actions, Route Handlers, caching with "use cache" and tags, loading/error/not-found files, metadata, or next-intl wiring.
---

# e-Parole — Next.js 16 App Router

## Quand l'utiliser
Tout fichier de `src/app`, toute Server Action, toute question de cache ou de rendu.

## Instructions
1. **Vérifier l'API actuelle** (Context7 ou doc officielle Next 16) avant d'écrire du code de cache ou de routing :
   les API ont changé depuis Next 14/15 (`"use cache"`, `cacheTag`, `cacheLife`, params asynchrones).
2. Server Component par défaut. `"use client"` sur la plus petite feuille interactive.
3. Mutations UI → Server Action via le wrapper `action()` / `adminAction()` (session, rate limit, Zod, `authorize`, `Result`).
4. Route Handler uniquement pour : Better Auth, uploads présignés, SSE, export, JSON Bible public, health.
5. Données : appeler les services du module, jamais `fetch` vers sa propre API.
6. Cache : `"use cache"` + tag **seulement** pour le public (Bible `bible:<code>`, verset du jour `daily-verse`).
   Jamais de cache partagé pour une donnée dépendant de l'utilisateur, d'un blocage ou d'une visibilité.
7. Après mutation : `revalidateTag`/`updateTag` ciblé, pas de `revalidatePath("/")` global.
8. Invisible ou non autorisé → `notFound()` (404), pas de 403 révélateur.
9. Chaque segment significatif : `loading.tsx` (skeleton), `error.tsx` (avec identifiant), `not-found.tsx`.
10. `generateMetadata` : aucune donnée privée (titre d'une prière privée, nom d'une communauté privée pour un non-membre).
11. Middleware (`proxy`/`middleware` selon la version) : redirections et en-têtes seulement, jamais d'autorisation.

## Contraintes
Pas de `export const dynamic = "force-static"` sur une page avec données utilisateur. Pas d'API préliminaire de Next.

## Vérifications
- [ ] `pnpm build` sans avertissement de rendu dynamique inattendu
- [ ] Toute Server Action revérifie l'autorisation
- [ ] Aucune donnée privée dans le cache partagé

## Références
`docs/10-SYSTEM-ARCHITECTURE.md`, `docs/13-API-DESIGN.md`, `docs/25-CODING-STANDARDS.md#nextjs`.
