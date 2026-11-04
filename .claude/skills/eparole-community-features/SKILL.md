---
name: eparole-community-features
description: Use when building e-Parole communities (churches, youth groups, prayer groups, choirs) - creation, public/private visibility, join requests, invitations, local roles (OWNER/ADMIN/MODERATOR/MEMBER), internal posts, the /manage space, or cross-community isolation.
---

# e-Parole — communautés et espace responsable

## Instructions
1. Lire `docs/admin/ADMIN-COMMUNITIES.md` et la matrice de communauté dans `docs/admin/ADMIN-ROLES-PERMISSIONS.md`.
2. Toute lecture/écriture interne à une communauté commence par `requireCommunityRole(communityId, minRole)` qui renvoie
   un `CommunityScope` ; les repositories l'exigent en premier paramètre.
3. Communauté privée : inexistante (404) pour un non-membre, y compris son nom dans les métadonnées et la recherche.
4. Adhésion : `OPEN` (actif immédiat), `REQUEST` (statut `PENDING`, approbation MODERATOR+), `INVITE_ONLY` (lien ou invitation nominative).
5. Un seul `OWNER` actif ; transfert de propriété avec ré-auth ; l'OWNER ne peut pas se retirer sans transférer.
6. Hiérarchie locale : on ne gère que des rôles strictement inférieurs au sien.
7. Les rôles globaux ne donnent pas de rôle local ; la modération plateforme passe par `/admin/moderation`.
8. Créer une communauté « Église locale » ne donne **aucun** badge vérifié.
9. Compteur `memberCount` mis à jour dans la même transaction que l'adhésion.
10. Toute tentative d'accès croisé → 404 + audit `security.cross_community_attempt`.

## Vérifications
- [ ] Test d'intégration : responsable de A sans accès à B (lecture, modération, export, statistiques)
- [ ] Non-membre ne voit rien d'une communauté privée (pages, recherche, notifications, métadonnées)
- [ ] `/manage` utilisable à 360 px

## Références
`docs/admin/ADMIN-COMMUNITIES.md`, `docs/11-DATABASE-DESIGN.md#isolation-entre-communautés`, `docs/06-USER-STORIES.md`.
