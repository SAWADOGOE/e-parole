---
name: eparole-prayers
description: Use when working on e-Parole prayer requests and intercession - creating requests, visibility (PRIVATE, FOLLOWERS, COMMUNITY, PUBLIC), anonymity, "Je prie pour toi" support, comments, answered prayers and testimonies, distress signals, or anything that displays prayer content.
---

# e-Parole — prières et intercession

## Pourquoi c'est sensible
Les demandes de prière contiennent souvent maladie, conflits familiaux, détresse. Une fuite est grave.

## Instructions
1. Lire `docs/20-PRIVACY-AND-MODERATION.md#visibilité-des-demandes-de-prière`.
2. Défaut à la création : `PRIVATE`. L'UI explique précisément **qui verra** la demande avant validation.
3. Visibilité appliquée dans le repository (`findVisible(actor, id)`) ; invisible → 404.
4. Anonymat : le client ne reçoit jamais l'`authorId` d'une demande anonyme (sauf l'auteur), y compris pour les responsables
   de communauté. Vérifier les sérialiseurs et les notifications.
5. `PUBLIC` : visible des connectés seulement, jamais indexée (`noindex`), jamais visible déconnecté. Interdite aux mineurs.
6. « Je prie pour toi » : idempotent (`PrayerSupport` clé composite), compteur en transaction, notification regroupée.
7. Commentaires désactivables par l'auteur ; l'auteur peut masquer un commentaire.
8. Exaucement : `answeredAt` + publication liée de type `TESTIMONY`.
9. Mots de détresse (suicide, automutilation) : afficher des ressources d'aide à l'auteur et créer un dossier priorité 0.
10. Aucune promesse de guérison ou de résultat dans la microcopie.
11. Aucun accès admin/modérateur aux prières `PRIVATE`. Pas de contenu de prière dans les logs, l'audit ou les analytics.

## Vérifications
- [ ] Matrice de tests visibilité × relation (auteur, abonné, membre, non-membre, bloqué, déconnecté, responsable, admin)
- [ ] Anonymat vérifié dans la réponse réseau (pas seulement à l'écran)
- [ ] Revue `security-auditor`

## Références
`docs/20-PRIVACY-AND-MODERATION.md`, `docs/06-USER-STORIES.md#prières`, `docs/11-DATABASE-DESIGN.md`.
