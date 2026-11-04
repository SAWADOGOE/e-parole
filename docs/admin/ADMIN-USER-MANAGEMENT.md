# Gestion des utilisateurs — `/admin/users`

## Liste
Colonnes : avatar + nom affiché + @handle · statut (badge) · rôles globaux · badges · inscription · dernière activité ·
signalements reçus (30 j). Email masqué (`a***@gmail.com`).
Recherche : handle, nom (trigrammes), email exact (correspondance exacte uniquement, pas de recherche partielle).
Filtres : statut, rôle, badge, date d'inscription, « avec signalements ». Tri : inscription, activité. Pagination 50.
Actions groupées : aucune action destructive groupée au MVP (export de la sélection seulement, `SUPER_ADMIN`).

## Fiche `/admin/users/[id]`
Onglets :
1. **Aperçu** : profil public, statut, rôles, badges, compteurs agrégés (publications, communautés).
2. **Sanctions** : historique des avertissements, suspensions, bannissements avec motif, auteur, date, contestation.
3. **Signalements** : reçus et émis (abus de signalement détectable).
4. **Sessions** : appareils (type, date, ville approximative), révocation.
5. **Rôles** : attribution/retrait (selon la matrice).
6. **Audit** : actions de l'admin sur ce compte et actions admin de ce compte.

**Non affichés** : prières privées, notes bibliques, messages privés, contenu des communautés privées.

## Actions sensibles
| Action | Garde-fous |
|---|---|
| Suspendre | Motif (liste + texte), durée, ré-auth, confirmation par saisie du @handle, notification avec voie de contestation, révocation des sessions |
| Réactiver | Motif, audit |
| Bannir | `ADMIN`+, motif détaillé, double confirmation, contenus masqués |
| Attribuer un rôle | Matrice + hiérarchie, ré-auth, notification à l'intéressé, l'acteur ne peut pas se l'attribuer |
| Révéler l'email / l'IP | Bouton explicite, motif obligatoire, audit `user.pii.reveal` |
| Forcer la réinitialisation du mot de passe | Révoque les sessions, email à l'utilisateur |
| Supprimer définitivement | `SUPER_ADMIN`, uniquement sur demande documentée ; sinon suppression par l'utilisateur |

Toutes les actions écrivent dans l'audit log **dans la même transaction**.
