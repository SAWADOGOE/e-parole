# Confidentialité

- Données sensibles : convictions religieuses, église, demandes de prière, messages privés, notes bibliques, âge.
- Privé par défaut : prières créées en `PRIVATE`, champs église/localisation/dénomination masqués.
- Visibilité appliquée dans les repositories ; invisible → 404 (pas 403).
- Anonymat des prières : `authorId` jamais envoyé au client (sauf à l'auteur), y compris aux responsables de communauté.
- Prières `PUBLIC` : connectés seulement, `noindex`, interdites aux mineurs.
- Aucun accès admin/modérateur aux messages privés, prières privées, notes ; seul l'`evidenceSnapshot` d'un signalement est visible.
- Logs, audit, analytics : identifiants uniquement, jamais de contenu ni d'email en clair ; IP tronquées après 90 jours.
- Mineurs (< 18) : non découvrables par défaut, messagerie limitée aux abonnés mutuels, pas de géolocalisation.
- Minimisation : année de naissance seulement ; pas de champ collecté sans usage documenté.
- Export et suppression en libre-service ; respecter les durées de rétention de `docs/11-DATABASE-DESIGN.md`.
- Fixtures et seeds : aucune donnée réelle.
