# Architecture de l'administration

## Séparation logique
```mermaid
flowchart TB
  subgraph routes
    A["(admin)/admin/layout.tsx<br/>requireAdminActor()"]
    M["(manage)/manage/[communityId]/layout.tsx<br/>requireCommunityRole(id, ['OWNER','ADMIN','MODERATOR'])"]
  end
  A --> AF[features/administration<br/>features/moderation<br/>features/editorial]
  M --> CF[features/communities/manage]
  AF & CF --> POL[authorize()]
  POL --> AUD[audit.record()]
  AF & CF --> SVC[services des modules métier]
```

- Route groups distincts → layouts, bundles et navigation distincts. Les composants admin (TanStack Table, Recharts)
  ne sont jamais chargés dans l'espace membre.
- Le layout effectue une **première** vérification (redirection/404) ; **chaque** Server Action et chaque requête de données
  admin revérifie la permission précise. Un layout n'est pas une frontière de sécurité (les Server Actions sont appelables directement).
- Réponse aux non-autorisés : **404** (`notFound()`), pour ne pas révéler l'existence de `/admin` ou d'une communauté privée.
- Pas de sous-domaine séparé au MVP ⚠️ (`admin.eparole.…` envisageable en Phase 8 pour cloisonner les cookies).

## Actions sensibles : pipeline commun
```ts
export const suspendUser = adminAction({
  permission: "user:suspend",
  schema: suspendUserSchema,             // { userId, reason, durationDays, confirmHandle }
  requireRecentAuth: true,               // ré-auth < 10 min
  audit: "user.suspend",
  handler: async (actor, input) => usersAdminService.suspend(actor, input),
});
```
`adminAction` : acteur admin + MFA → permission → garde de hiérarchie (on n'agit pas sur un rôle ≥ au sien) → Zod →
handler en transaction → audit dans la même transaction → `revalidateTag`.

## Lecture des données
- Listes paginées côté serveur (curseur ou page + taille ≤ 100), tri et filtres en `searchParams` typés par Zod.
- Requêtes d'agrégation du dashboard : vues matérialisées rafraîchies toutes les 15 min par job (pas de `COUNT(*)` coûteux à chaque visite).
- Les champs sensibles (email complet, IP) sont masqués par défaut et révélés à la demande, avec audit (`user.pii.reveal`).
