# 29 — Performance

Contexte : Android d'entrée de gamme, 3G/4G instable, data coûteuse. La performance est une exigence produit.

## Budgets (bloquants en CI à partir de la Phase 2)
| Indicateur | Budget | Pages |
|---|---|---|
| LCP p75 (Slow 4G, Moto G Power) | < 2,5 s | `/`, `/bible/lsg/jean/3`, `/prieres` |
| INP p75 | < 200 ms | Toutes |
| CLS | < 0,1 | Toutes |
| JS initial (gzip) | < 170 Ko `/` ; < 175 Ko lecteur | Budget lecteur révisé le 2026-11-05 (ADR-010) : runtime Next + React 129,7 Ko + 45 Ko pour le code e-Parole. Mesuré : 171,3 Ko |
| Poids page lecteur (HTML + CSS + polices) | < 120 Ko hors JS | |
| Image de fil | ≤ 200 Ko (mobile), ≤ 60 Ko en mode économie | |
| TTFB lecteur (cache) | < 200 ms | |

## Mesures de la Phase 3 (2026-11-06, build de production local, données « [Démo] »)
| Indicateur | Budget | Mesuré |
|---|---|---|
| JS initial `/` connecté (gzip) | < 170 Ko | **170,3 Ko** (228,8 Ko avant optimisation) — 0,3 Ko au-dessus |
| JS initial lecteur (gzip) | < 175 Ko | 171,5 Ko |
| Fil complet (HTML), p95 sur 50 | — | 36 ms (Abonnements), 35 ms (Découvrir) |
| Image de fil 960 px (photos réelles) | ≤ 200 Ko | 17 à 71 Ko (AVIF), 25 à 71 Ko (WebP) |
| Image 320 px (économie de données) | ≤ 60 Ko | 4 à 7 Ko |
| Requêtes SQL par page de fil | constant | identique pour 1 ou 15 publications (test d'intégration) |

Leviers appliqués : menus « … » et menu du compte chargés à la demande, composer chargé au clic, client d'authentification
et `sonner` retirés de la coque (≈ −24 Ko sur **toutes** les pages membres), variantes de bouton sans `Slot` Radix, temps réel
des notifications chargé à l'inactivité. Scripts : `node scripts/dev/measure-feed.mjs`, `node scripts/dev/capture-screens.mjs`.

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
