# Communautés — `/admin/communities` et `/manage`

## Côté plateforme (`/admin/communities`, Phase 4)
- Liste : nom, catégorie, publique/privée, membres, propriétaire, statut, signalements 30 j, badge église.
- Fiche : profil, règlement, responsables, historique de modération, statistiques **agrégées** (membres, publications/semaine).
- Actions : suspendre / restaurer (motif, notification aux responsables), transférer la propriété en cas d'abandon (après
  30 j d'inactivité du propriétaire et demande d'un admin local), gérer les catégories (Phase 5).
- Un admin plateforme **ne lit pas** les publications d'une communauté privée depuis cet écran ; il y accède seulement via un
  dossier de modération (contenu signalé).

## Côté responsable (`/manage/[communityId]`)
| Écran | Contenu | Rôle minimal |
|---|---|---|
| Tableau de bord | Nouveaux membres, demandes en attente, signalements locaux, activité de la semaine | MODERATOR |
| Membres | Liste, recherche, rôles, retrait, bannissement ; onglet « Demandes » avec approbation en lot | MODERATOR |
| Invitations | Liens d'invitation (expiration, nombre d'usages), invitations nominatives | MODERATOR (selon paramètres) |
| Modération | Signalements sur les contenus de la communauté ; masquer, retirer, exclure | MODERATOR |
| Contenus (Phase 6) | Méditations, enseignements, prédications, annonces de la communauté (voir [ADMIN-CONTENT-MANAGEMENT](ADMIN-CONTENT-MANAGEMENT.md#contenus-de-communauté)) | ADMIN |
| Paramètres | Nom, description, avatar, bannière, catégorie, visibilité, politique d'adhésion, règlement, qui peut publier | ADMIN |
| Propriété | Transfert, suppression | OWNER |

Sélecteur de communauté en tête de `/manage` si l'utilisateur en gère plusieurs.

## Isolation
`/manage/[communityId]` charge `requireCommunityRole(communityId, minRole)` ; toutes les requêtes reçoivent le
`CommunityScope`. Tentative sur une communauté non gérée → 404, tentative journalisée (`security.cross_community_attempt`).

## Création ≠ vérification
Créer une communauté « Église locale » ne confère aucun badge. La vérification d'église est un processus distinct
([ADMIN-CHURCHES.md](ADMIN-CHURCHES.md)).
