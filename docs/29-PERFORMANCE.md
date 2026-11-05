# 29 — Performance

Contexte : Android d'entrée de gamme, 3G/4G instable, data coûteuse. La performance est une exigence produit.

## Budgets (bloquants en CI à partir de la Phase 2)
| Indicateur | Budget | Pages |
|---|---|---|
| LCP p75 (Slow 4G, Moto G Power) | < 2,5 s | `/`, `/bible/lsg/jean/3`, `/prieres` |
| INP p75 | < 200 ms | Toutes |
| CLS | < 0,1 | Toutes |
| JS initial (gzip) | < 170 Ko `/` ; < 120 Ko lecteur ⚠️ | Lecteur mesuré : 171,3 Ko, dont 129,7 Ko de runtime Next + React (ADR-010) : budget à réviser |
| Poids page lecteur (HTML + CSS + polices) | < 120 Ko hors JS | |
| Image de fil | ≤ 200 Ko (mobile), ≤ 60 Ko en mode économie | |
| TTFB lecteur (cache) | < 200 ms | |

## Leviers
- **Lecteur biblique en Server Component dynamique avec cache de données** : la CSP à nonce impose le rendu dynamique ([ADR-010](adr/ADR-010-BIBLE-RENDERING-CACHE.md)).
  Texte jamais hydraté, interactivité en îlot client léger, panneaux chargés à la demande.
- Polices : sous-ensembles latin/latin-ext, `font-display: swap`, préchargement de Literata uniquement sur le lecteur.
- Images : AVIF/WebP via `sharp` dans le worker, tailles fixes, `loading="lazy"`, placeholders de couleur dominante.
- Mode **économie de données** (auto si `Save-Data`) : pas d'images automatiques, avatars en initiales.
- Pagination par curseur, 15 éléments par page, préchargement de la page suivante à 80 % de défilement.
- Pas de bibliothèques lourdes côté membre : Recharts et TanStack Table chargés uniquement dans `/admin` (route group distinct).
- Motion : import via `LazyMotion` + `domAnimation` pour limiter la taille.
- Requêtes : index de [11](11-DATABASE-DESIGN.md) ; pas de N+1 (vérifié par compteur de requêtes en tests d'intégration).
- Compteurs dénormalisés (`supportCount`, `memberCount`) mis à jour en transaction.

## Mesure
Lighthouse CI en PR ; Web Vitals réels collectés en production (endpoint interne, sans tiers) en Phase 8.
