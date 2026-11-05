# Rôles et permissions (RBAC)

Décision : [ADR-008](../adr/ADR-008-ADMIN-RBAC.md). Rôles **globaux** stockés en base (`UserRole`), rôles **locaux**
stockés sur `CommunityMember.role`, permissions **définies en code** (`src/server/policies/permissions.ts`).

## Rôles globaux
| Rôle | Mission | Attribué par |
|---|---|---|
| `SUPER_ADMIN` | Opérations globales sensibles : rôles élevés, traductions, paramètres critiques | `SUPER_ADMIN` (seed initial par CLI) |
| `ADMIN` | Gestion courante : utilisateurs, communautés, églises, paramètres non critiques | `SUPER_ADMIN` |
| `MODERATOR` | Traitement des signalements et sanctions jusqu'à la suspension 30 j | `ADMIN`+ |
| `CONTENT_EDITOR` | Rédaction et (selon flag `canPublish`) publication éditoriale | `ADMIN`+ |
| `MEMBER` | Implicite (aucune ligne `UserRole`) | — |

Un utilisateur peut cumuler plusieurs rôles globaux (ex. `MODERATOR` + `CONTENT_EDITOR`).

## Rôles locaux
Dans le schéma, l'enum `CommunityRole` porte les valeurs `OWNER`, `ADMIN`, `MODERATOR`, `MEMBER` ; la documentation les
préfixe `COMMUNITY_` pour éviter toute confusion avec les rôles globaux.

| Rôle | Mission |
|---|---|
| `COMMUNITY_OWNER` | Un seul par communauté. Transfert de propriété, suppression, nomination des admins |
| `COMMUNITY_ADMIN` | Membres, paramètres, contenus, nomination des modérateurs |
| `COMMUNITY_MODERATOR` | Modération des contenus de la communauté, approbation des demandes d'adhésion |
| `COMMUNITY_MEMBER` | Participer selon le règlement |

## Badges de profil (aucune permission)
`PASTOR` (pasteur vérifié), `CHURCH_LEADER` (responsable d'église vérifié), `BIBLE_TEACHER` (enseignant vérifié).
Attribués par `ADMIN`+ après vérification documentée (voir [ADMIN-CHURCHES.md](ADMIN-CHURCHES.md)). Ils **ne donnent
aucun droit** d'administration ; ils affichent une marque de confiance et peuvent, au plus, relever des limites de débit.

## Matrice — permissions globales
✅ autorisé · ◐ autorisé avec restriction · — refusé. « Propre » = ressource dont l'acteur est l'auteur.

| Permission | MEMBER | CONTENT_EDITOR | MODERATOR | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|---|
| `post:create` / `comment:create` / `prayer:create` | ✅ (email vérifié) | ✅ | ✅ | ✅ | ✅ |
| `post:update` / `post:delete` | ◐ propre | ◐ propre | ◐ propre | ◐ propre | ◐ propre |
| `content:hide` / `content:remove` (modération) | — | — | ✅ | ✅ | ✅ |
| `report:create` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `moderation:case:read` | — | — | ✅ | ✅ | ✅ |
| `moderation:case:assign` | — | — | ◐ soi-même | ✅ | ✅ |
| `moderation:sanction:warn` | — | — | ✅ | ✅ | ✅ |
| `moderation:sanction:suspend` | — | — | ◐ ≤ 30 j | ✅ | ✅ |
| `moderation:sanction:ban` | — | — | — | ✅ | ✅ |
| `moderation:appeal:decide` | — | — | ◐ pas ses propres décisions | ✅ | ✅ |
| `user:read:admin` (fiche admin) | — | — | ◐ si lié à un dossier | ✅ | ✅ |
| `user:pii:reveal` (email, IP) | — | — | — | ✅ (audité) | ✅ (audité) |
| `user:suspend` / `user:reactivate` | — | — | ◐ ≤ 30 j | ✅ | ✅ |
| `user:export` (export admin d'un compte) | — | — | — | — | ✅ (sur demande légale, audité) |
| `role:grant:moderator` / `role:grant:editor` | — | — | — | ✅ | ✅ |
| `role:grant:admin` / `role:grant:super_admin` | — | — | — | — | ✅ |
| `badge:grant` | — | — | — | ✅ | ✅ |
| `community:suspend` / `community:restore` | — | — | ◐ suspendre (signalement) | ✅ | ✅ |
| `church:verify` | — | — | — | ✅ | ✅ |
| `editorial:create` / `editorial:update:own` | — | ✅ | — | ✅ | ✅ |
| `editorial:review` (approuver / rejeter) | — | ◐ pas son propre contenu | — | ✅ | ✅ |
| `editorial:publish` / `editorial:schedule` | — | ◐ si `canPublish` | — | ✅ | ✅ |
| `daily_verse:manage` | — | ✅ | — | ✅ | ✅ |
| `reading_plan:manage` | — | ✅ | — | ✅ | ✅ |
| `bible:translation:read` | — | ✅ | — | ✅ | ✅ |
| `bible:translation:publish` / `bible:import` | — | — | — | — | ✅ |
| `settings:read` | — | — | — | ✅ | ✅ |
| `settings:update` (non critiques) | — | — | — | ✅ | ✅ |
| `settings:update:critical` (inscriptions, limites, rétention) | — | — | — | — | ✅ |
| `feature_flag:update` | — | — | — | ◐ flags non critiques | ✅ |
| `audit:read` | — | — | ◐ ses propres actions | ✅ | ✅ |
| `analytics:read` | — | ◐ contenus éditoriaux | ◐ modération | ✅ | ✅ |
| `private_message:read` | — | — | — | — | — (**jamais**) |
| `private_prayer:read` / `bible_note:read` | — | — | — | — | — (**jamais**) |

## Matrice — permissions de communauté
Évaluées avec le rôle local de l'acteur **dans la communauté de la ressource**. Les rôles globaux ne donnent pas
automatiquement de rôle local : un `MODERATOR` global agit via `/admin/moderation`, pas via `/manage`.

| Permission | MEMBER | MODERATOR | ADMIN | OWNER |
|---|---|---|---|---|
| `community:post:create` (si le règlement l'autorise) | ✅ | ✅ | ✅ | ✅ |
| `community:post:hide` / `community:comment:hide` | — | ✅ | ✅ | ✅ |
| `community:member:approve` (demandes) | — | ✅ | ✅ | ✅ |
| `community:member:remove` / `ban` | — | ◐ membres simples | ◐ jusqu'à MODERATOR | ✅ (sauf soi-même) |
| `community:role:grant:moderator` | — | — | ✅ | ✅ |
| `community:role:grant:admin` | — | — | — | ✅ |
| `community:settings:update` | — | — | ✅ | ✅ |
| `community:invite:create` | ◐ si autorisé par les paramètres | ✅ | ✅ | ✅ |
| `community:stats:read` (agrégées) | — | ✅ | ✅ | ✅ |
| `community:editorial:create` / `update:own` | — | — | ✅ | ✅ |
| `community:editorial:publish` / `schedule` / `archive` | — | — | ✅ | ✅ |
| `community:transfer_ownership` / `community:delete` | — | — | — | ✅ (ré-auth) |
| `community:prayer:read_anonymous_author` | — | — | — | — (**jamais**) |

## Permissions techniques ajoutées en Phase 1
| Permission | Usage | Rôles |
|---|---|---|
| `admin:access` | Accès au shell `/admin` | Tout rôle global (MFA exigée par la garde de page) |
| `community:read` | Lecture interne d'une communauté | Tout membre actif |
| `community:manage:access` | Accès à `/manage/[id]` | `COMMUNITY_MODERATOR` et plus |

## Règles transverses
1. **Hiérarchie** : nul ne peut agir sur un compte de rôle égal ou supérieur au sien (un `ADMIN` ne suspend pas un `ADMIN`).
2. **Pas d'auto-élévation** : on ne peut pas s'attribuer un rôle. Le rôle `SUPER_ADMIN` ne peut être retiré par
   personne depuis l'interface (hiérarchie stricte) : son retrait passe par une procédure CLI auditée (à écrire en Phase 8),
   ce qui garantit qu'il reste toujours au moins un `SUPER_ADMIN`.
3. **Statut du compte** : un compte `SUSPENDED` perd toutes ses permissions d'écriture, rôles inclus.
4. **Communauté suspendue** : lecture seule pour tous ses membres ; `/manage` en lecture seule.
5. **Visibilité avant permission** : une ressource invisible pour l'acteur renvoie `NOT_FOUND` avant tout test de permission.

## Implémentation
```ts
// src/server/policies/permissions.ts
export const GLOBAL_PERMISSIONS = { /* permission -> rôles + restriction */ } as const satisfies PermissionMatrix;
export async function authorize(actor: Actor, permission: Permission, resource?: PolicyResource): Promise<void>;
```
La matrice ci-dessus est la **spécification** de ce fichier ; un test paramétré vérifie que code et document concordent.
