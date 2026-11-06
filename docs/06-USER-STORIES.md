# 06 — User stories

Format : *En tant que…, je veux…, afin de…* suivi de critères d'acceptation (Given/When/Then abrégés).
Les identifiants `US-n` sont repris dans le [backlog](27-BACKLOG.md) et les tests E2E.

## Bible
**US-1 — Lire un chapitre** (REQ-BIB-1)
En tant que membre, je veux ouvrir Jean 3 afin de lire le chapitre entier.
- L'URL `/bible/lsg/jean/3` est rendue côté serveur et partageable.
- Les numéros de versets sont visibles et ancrables (`#v16`).
- Boutons chapitre précédent et suivant ; au chapitre 21 de Jean, « suivant » mène à Actes 1.
- Fonctionne sans JavaScript pour la lecture (Server Component).

**US-2 — Aller à une référence** (REQ-BIB-2)
- « jn 3 16 », « Jean 3:16 », « Jean 3.16 », « 1 Co 13:4-7 », « Psaume 23 », « ps23 » sont reconnus.
- Une référence invalide (« Jean 30 ») affiche « Jean compte 21 chapitres » avec suggestion, pas une page d'erreur.

**US-3 — Rechercher « grâce »** (REQ-BIB-3)
- « grace » sans accent trouve « grâce ». Résultats paginés, termes surlignés, filtre AT/NT et par livre.
- Une expression entre guillemets (« "le bon berger" ») cherche la phrase exacte.

**US-4 — Surligner et annoter** (REQ-BIB-6)
- Sélection d'un ou plusieurs versets contigus → barre d'actions (copier, surligner, note, favori, partager).
- Les notes sont strictement privées ; aucun autre rôle, y compris admin, n'y accède via l'UI.

**US-5 — Partager un verset dans une publication** (REQ-BIB-5)
- La publication affiche le texte exact, la référence et « Louis Segond 1910 » ; le texte n'est pas modifiable par l'auteur.

## Social
**US-10 — Publier un témoignage** : type « Témoignage », jusqu'à 4 images (≤ 10 Mo chacune avant compression).
La publication est toujours publique (visible par tout membre connecté, jamais par un compte bloqué) ; la visibilité
« Communauté » sera décidée en Phase 4. Brouillon conservé localement en cas de perte réseau.
**US-11 — Commenter** : réponse à un commentaire sur un seul niveau ; l'auteur du post peut masquer un commentaire.
**US-12 — Réagir** : trois réactions, Amen 🙏, J'aime ❤️, Encouragé 💪, chacune avec un libellé texte ; une réaction par
personne et par cible (publication ou commentaire), modifiable et retirable.
**US-13 — Suivre un auteur** : le fil Abonnements affiche ses publications par ordre chronologique.
**US-14 — Bloquer** : un utilisateur bloqué ne voit plus mes contenus, ne peut ni commenter ni m'écrire, et n'est pas notifié.

## Prières
**US-20 — Demander une prière privée à ma communauté**
- Visibilité « Communauté : Jeunesse AD Ouaga » ; invisible pour un non-membre même via l'URL directe (404, pas 403).
- Option « Publier anonymement » : les membres voient « Un membre de la communauté » ; les responsables locaux
  ne voient pas non plus l'identité (décision Q3, [28](28-ARCHITECTURAL-DECISIONS.md#questions-tranchées-2026-11-04-par-lutilisateur)).
**US-21 — « Je prie pour toi »** : un clic, idempotent, l'auteur est notifié de façon regroupée (« 5 personnes prient pour toi »).
**US-22 — Témoignage d'exaucement** : depuis ma demande, « Dieu a répondu » → formulaire de témoignage lié.

## Communautés
**US-30 — Créer la communauté de mon église** : nom, catégorie « Église locale », ville, description, règlement ;
je deviens `COMMUNITY_OWNER`. Le badge « Église vérifiée » n'apparaît qu'après validation admin.
**US-31 — Approuver des demandes d'adhésion** depuis `/manage/members?status=pending`, en lot.
**US-32 — Un responsable ne voit pas une autre communauté** : `/manage/<autre-id>` renvoie 404 ; testé en E2E.

## Administration
**US-40 — Suspendre un compte** : motif obligatoire, durée, confirmation par saisie du @handle,
écriture dans l'audit log, notification à l'utilisateur avec voie de contestation.
**US-41 — Traiter un signalement** : la modératrice voit le contenu signalé, l'historique de l'auteur (sanctions),
et non ses messages privés ; elle choisit Ignorer, Avertir, Masquer, Retirer, Suspendre.
**US-42 — Programmer le verset du jour** : choix d'une référence, prévisualisation, date ; l'historique empêche les doublons sur 30 jours (avertissement).
**US-43 — Un ADMIN ne peut pas promouvoir quelqu'un SUPER_ADMIN** : action refusée côté serveur, tentative auditée.
