---
paths:
  - "src/app/**"
  - "**/actions.ts"
  - "src/middleware.ts"
  - "src/proxy.ts"
---

# Next.js 16 App Router

- Server Components par défaut ; `"use client"` sur la plus petite feuille interactive.
- Vérifier l'API Next 16 courante avant d'écrire du code de cache/routing (params asynchrones, `"use cache"`, `cacheTag`).
- Mutations : Server Actions via `action()` / `adminAction()` (session, rate limit, Zod, `authorize`, `Result`).
- Route Handlers seulement pour auth, uploads, SSE, export, JSON Bible public, health.
- Pas de `fetch` vers sa propre API depuis un Server Component.
- Cache partagé **uniquement** pour le public (Bible, verset du jour). Jamais pour des données personnelles ou de visibilité.
- Invalidation ciblée par tag après mutation.
- Ressource invisible ou interdite → `notFound()`.
- `loading.tsx` (skeleton), `error.tsx` (identifiant de corrélation), `not-found.tsx` par segment significatif.
- Middleware/proxy : redirections et en-têtes, jamais d'autorisation.
- Aucune donnée privée dans `generateMetadata`.
