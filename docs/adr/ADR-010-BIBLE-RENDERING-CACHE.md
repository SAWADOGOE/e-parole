# ADR-010 — Rendu et cache du lecteur biblique sous CSP à nonce

- **Statut** : Proposé (Phase 2), en attente de validation
- **Date** : 2026-11-05
- **Complète** : [ADR-006](ADR-006-BIBLE-INTEGRATION.md) ; **modifie** le levier « HTML pré-rendu » de [docs/29](../29-PERFORMANCE.md)

## Contexte
`docs/29` prévoyait un lecteur statique (1 189 pages pré-rendues, cache CDN d'un an). Or la CSP de la Phase 1 repose sur un
nonce par requête ([src/proxy.ts](../../src/proxy.ts)), et la documentation de Next.js 16.4 est explicite : un nonce impose le
rendu dynamique, désactive l'optimisation statique et l'ISR, et le PPR y est incompatible (`next/dist/docs/.../content-security-policy.md`).
Le layout racine lit d'ailleurs `headers()`. Le texte biblique doit pourtant rester rapide sur un Android d'entrée de gamme.

## Options
1. **`"use cache"` + `cacheComponents`.** Exige d'activer `cacheComponents` pour toute l'application : chaque accès à une donnée
   dynamique doit alors passer sous `<Suspense>`, le modèle repose sur le PPR, incompatible avec le nonce. Coût élevé, gain nul ici.
2. **Exclusion ciblée du nonce sur `/bible/lsg/*`** (CSP par hash via SRI, ou `'unsafe-inline'`). SRI est expérimental et la
   règle du projet écarte les API préliminaires ; `'unsafe-inline'` affaiblirait la protection d'une page qui affiche aussi les
   notes privées de l'utilisateur. Refusé.
3. **Rendu dynamique + cache de données** (`unstable_cache`, tag `bible:lsg`), texte en Server Component non hydraté.

## Décision
Option 3.
- Le service de lecture ([server/reader.ts](../../src/features/bible/server/reader.ts)) met en cache catalogue, chapitres, passages et
  verset du jour. `unstable_cache` est l'API documentée pour le modèle sans `cacheComponents`, malgré son nom : c'est un écart
  assumé à la règle « pas d'API préliminaire », à réévaluer si Next retire cette API.
- **L'identifiant de version fait partie des clés** : un texte activé ne peut pas servir un ancien cache. Seule la fiche de
  traduction expire vite (60 s), pour découvrir une activation faite en CLI. L'admin invalide par `updateTag("bible:lsg")`.
- Aucune donnée utilisateur dans le cache partagé. Annotations et réglages sont lus par requête pour un connecté, jamais pour un visiteur.
- **Pas de `loading.tsx` sur le chapitre.** Sa frontière Suspense fige le statut à 200 (un chapitre absent ne répond plus 404) et
  cache le texte tant qu'un script ne l'a pas révélé : le lecteur ne s'affichait plus sans JavaScript. Le squelette vit côté client
  (`useLinkStatus`, `useTransition`). La validation d'URL est dans un `layout.tsx`.
- Le texte n'est jamais hydraté : l'îlot `ReaderChrome` s'y greffe par délégation d'événements. Panneaux, barre d'actions, notes et
  `sonner` se chargent à la demande.

## Mesures (2026-11-05, build de production local, base réelle de 31 170 versets)
Script : `node scripts/bible/measure.mjs` et `measure-lcp.mjs`. Serveur et navigateur sur le même poste.

| Indicateur | Budget | Mesuré | Verdict |
|---|---|---|---|
| JS initial lecteur (gzip) | < 120 Ko | **170,3 Ko** (brotli 147,4 Ko) | ❌ **non atteint** |
| dont runtime Next 16 + React 19 (`rootMainFiles`) | — | 129,7 Ko | incompressible |
| dont code e-Parole + next-intl + icônes | — | ≈ 40 Ko | 66 Ko avant optimisation |
| HTML + CSS + police préchargée (gzip) | < 120 Ko | 50,6 Ko (≈ 99 Ko avec Inter latin, chargée à l'usage) | ✅ |
| TTFB (cache), p95 | < 200 ms | 64,7 ms | ✅ |
| LCP, Slow 4G émulé + CPU ×4, médiane sur 5 | < 2,5 s | 732 ms (max 1 120 ms) | ✅ émulation locale |
| CLS | < 0,1 | 0 | ✅ |
| Recherche « grace », page complète, p95 sur 200 | < 150 ms | 108,6 ms | ✅ |
| Requête FTS seule (`EXPLAIN ANALYZE`) | — | 0,26 ms (index GIN) | ✅ |

Lighthouse n'a pas été exécuté (non installé) ; le LCP vient d'une émulation Chromium, pas d'un appareil réel ni d'un p75 de terrain.

## Conséquences
- ➕ CSP stricte conservée sur toutes les pages, y compris celles qui affichent des notes privées.
- ➕ Une page de chapitre coûte une lecture de cache, pas une requête SQL de texte.
- ➖ Pas de cache CDN du HTML : chaque page passe par le serveur (hors-ligne et CDN à revoir en Phase 7).
- ➖ **Le budget de 120 Ko est inatteignable avec cette pile** : le runtime seul le dépasse. Il date de la Phase 0, avant toute mesure.
  Pistes restantes : retirer `next-intl` du client du lecteur (−12 Ko, refonte du fournisseur racine) ; aucune ne ramène sous 120 Ko.
  **Décision attendue** : réviser le budget (proposition : runtime + 45 Ko, soit 175 Ko gzip) ou reconsidérer la pile du lecteur.
- ➖ Le cache de données est local à chaque instance ; à plusieurs instances, une invalidation admin n'atteint que la sienne.
  L'identifiant de version dans les clés et le TTL de 60 s bornent cet écart à une minute.
