---
name: eparole-performance
description: Use when an e-Parole change may affect load time, bundle size, images, fonts, database query count or caching - especially on the member space used on low-end Android phones over slow or expensive mobile data.
---

# e-Parole — performance (Android d'entrée de gamme, 3G/4G)

## Budgets
LCP p75 < 2,5 s (Slow 4G) · INP < 200 ms · CLS < 0,1 · JS initial < 170 Ko gzip (`/`), < 175 Ko (lecteur) ·
image de fil ≤ 200 Ko (≤ 60 Ko en économie de données).

## Instructions
1. Lire `docs/29-PERFORMANCE.md`.
2. Server Components par défaut ; îlots client minimes. Vérifier l'impact avec l'analyse de bundle avant d'ajouter une dépendance client.
3. Bibliothèques admin (TanStack Table, Recharts) jamais importées dans l'espace membre.
4. Motion via `LazyMotion` + `domAnimation`.
5. Images : pipeline worker `sharp` (AVIF/WebP, tailles 320/640/960/1280), `next/image` avec `sizes`, lazy, placeholder couleur.
6. Respecter `Save-Data` / mode économie : pas d'image automatique, avatars en initiales.
7. Polices `next/font` locales, sous-ensembles, Literata préchargée uniquement sur le lecteur.
8. Données : pagination curseur (15 par page), `select` explicites, pas de N+1, compteurs dénormalisés.
9. Cache public long pour la Bible ; jamais pour les données personnelles.

## Vérifications
- [ ] Lighthouse CI dans les budgets
- [ ] Nombre de requêtes SQL par page de fil constant (test d'intégration)
- [ ] Pas de nouvelle dépendance client > 15 Ko gzip sans justification

## Références
`docs/29-PERFORMANCE.md`, `docs/17-RESPONSIVE-DESIGN.md`.
