# 13 — Conception de l'API

e-Parole n'expose **pas d'API publique** au MVP. Les interactions passent par :

| Mécanisme | Usage | Exemple |
|---|---|---|
| Server Components | Lecture | `app/(community)/bible/[translation]/[book]/[chapter]/page.tsx` |
| Server Actions | Mutations depuis l'UI | `createPost`, `supportPrayer`, `suspendUser` |
| Route Handlers | Auth, uploads, SSE, flux tiers, export | `/api/auth/*`, `/api/uploads`, `/api/notifications/stream`, `/api/me/export` |

## Contrat d'une Server Action
```ts
"use server";
export async function supportPrayer(input: unknown): Promise<Result<{ supportCount: number }>> {
  return action(input, supportPrayerSchema, async (actor, data) => {
    const prayer = await prayersRepo.findVisible(actor, data.prayerId); // 404 si invisible
    await authorize(actor, "prayer:support", prayer);
    return prayersService.support(actor, prayer);
  });
}
```
Le wrapper `action()` : charge l'acteur, applique le rate limit nommé, valide Zod, convertit `AppError` en `Result`,
journalise l'erreur inattendue avec un `requestId`.

## Codes d'erreur
| Code | HTTP (Route Handlers) | UI |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Redirection connexion avec `returnTo` |
| `EMAIL_NOT_VERIFIED` | 403 | Bandeau « Vérifie ton email » |
| `FORBIDDEN` | 403 | Message neutre |
| `NOT_FOUND` | 404 | Aussi utilisé pour un contenu existant mais invisible (évite l'énumération) |
| `VALIDATION` | 422 | Erreurs de champ |
| `CONFLICT` | 409 | Ex. handle déjà pris |
| `RATE_LIMITED` | 429 | « Patiente un instant » + `Retry-After` |
| `INTERNAL` | 500 | Message générique + identifiant |

## Route Handlers MVP
| Méthode | Chemin | Description | Auth |
|---|---|---|---|
| `*` | `/api/auth/[...all]` | Better Auth | — |
| POST | `/api/uploads` | Demande d'URL présignée `{ purpose, mime, size }` → `{ uploadUrl, assetId }` | Vérifié |
| POST | `/api/uploads/:assetId/complete` | Déclenche la validation et la compression | Propriétaire |
| GET | `/api/uploads/:assetId` | État d'un envoi (`PENDING`, `PROCESSING`, `READY`, `REJECTED`) | Propriétaire |
| GET | `/api/media/:assetId/:largeur.:format` | Variante d'image (AVIF/WebP), si le contenu qui la porte est visible | Connecté |
| GET | `/api/notifications/stream` | SSE du compteur de notifications | Connecté |
| GET | `/api/notifications/count` | Repli du flux SSE (polling 60 s) | Connecté |
| GET | `/api/me/export` | Archive JSON des données personnelles (job, lien par email) | Connecté + ré-auth |
| GET | `/api/bible/:translation/:book/:chapter` | JSON d'un chapitre (pour le cache PWA futur) | Public, cache 1 an |
| GET | `/api/health` | Liveness/readiness (DB) | Public, sans détails |

## Pagination
Curseur opaque base64 de `(createdAt, id)` ; `limit` ≤ 30 ; réponse `{ items, nextCursor }`.

## Versionnement
Si une API publique ou mobile native apparaît, elle sera préfixée `/api/v1` et documentée en OpenAPI (Phase 7+).

## Implémenté en Phase 3
Route Handlers via `authenticatedRoute()` ([src/server/http/route-handler.ts](../src/server/http/route-handler.ts)) :
`Origin` (ou `Sec-Fetch-Site: same-origin` pour un GET sans `Origin`) vérifié, session obligatoire, limite de débit nommée,
`AppError` convertie en statut HTTP. Les mutations de l'interface sont des Server Actions (`action()` / `adminAction()`).
La page suivante d'un fil est une Server Action qui renvoie des éléments déjà rendus ([ADR-011](adr/ADR-011-SOCIAL-FEEDS-VISIBILITY.md)).
