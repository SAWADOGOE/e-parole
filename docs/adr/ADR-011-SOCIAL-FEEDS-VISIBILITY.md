# ADR-011 — Fils, visibilité et blocage : règles d'accès en SQL, sans cache partagé

- **Statut** : Proposé (Phase 3), en attente de validation du propriétaire
- **Date** : 2026-11-06
- **Complète** : [ADR-010](ADR-010-BIBLE-RENDERING-CACHE.md) (CSP à nonce, rendu dynamique)

## Contexte
Toute publication est publique pour les membres connectés (décision du propriétaire, 2026-11-05), mais un blocage doit
tout cacher dans les deux sens, sur chaque surface : fils, profil, publication, commentaires, réactions, mentions,
notifications, favoris, recherche, images. Un oubli sur une seule surface suffit à exposer une personne qui se protège.
Le fil doit rester rapide sur réseau lent (budget de [docs/29](../29-PERFORMANCE.md)) et sans N+1.

## Options
1. **Filtrer dans l'UI ou dans les services** après lecture. Simple, mais chaque nouvel écran peut oublier un filtre.
2. **Row Level Security PostgreSQL.** Robuste, mais demande un contexte de session par requête avec un pool Prisma :
   écartée au MVP ([docs/11](../11-DATABASE-DESIGN.md)).
3. **Fragments SQL partagés composés par chaque requête de lecture** (`notBlocked`, `notMuted`, `visibleAccount`),
   dans `src/features/social/server/sql.ts`.

## Décision
Option 3.
- Chaque requête de lecture du module social (publications, commentaires, personnes, images, mentions) compose ces
  fragments ; la table `notification` applique les mêmes règles à l'écriture **et** à la lecture (un blocage postérieur
  efface aussi les notifications passées de l'autre personne).
- **Visibilité avant permission** : les services lisent d'abord la ressource sous ces règles (`findVisiblePostAccess`,
  `findVisibleCommentAccess`, `findVisibleUserId`) ; une ressource invisible répond `NOT_FOUND` (404), puis seulement
  `authorize()` vérifie la permission avec la ressource réelle.
- **Pas de colonne `visibility` sur `post`** : une colonne qui ne peut valoir qu'une valeur serait du poids mort, et la
  visibilité « Communauté » n'est pas décidée (Phase 4 l'ajoutera par migration additive si besoin).
- **Fils chronologiques par curseur** `(createdAt, id)`, 15 par page, index partiel `WHERE deletedAt IS NULL AND NOT isHidden`.
  Une page = **une** requête (auteur, avatar, compteurs, réaction et favori de l'acteur, images et mentions agrégées en JSON)
  + une requête pour les versets cités. Mesuré constant (test d'intégration avec compteur de requêtes).
- **Aucun cache partagé** des fils, profils ou publications : ils dépendent des blocages et des sourdines de l'acteur.
  Seuls le texte biblique et le catalogue restent en cache (ADR-010).
- Pages suivantes rendues **côté serveur** par une Server Action qui renvoie des éléments React : aucun composant de
  publication n'est envoyé au navigateur. Sans JavaScript, un lien « Charger la suite » pagine classiquement.
- « Tu es à jour » : le chargement automatique (à 80 % de la page) s'arrête au-delà des publications des 48 dernières heures ;
  la suite ne se charge que sur demande.

## Conséquences
- ➕ Une seule implémentation de chaque règle ; 17 tests d'intégration couvrent chaque surface dans les deux sens.
- ➕ Temps de réponse mesuré : fil complet p95 ≈ 36 ms en local (50 mesures).
- ➖ Requêtes SQL brutes (`$queryRaw`) : typage manuel des lignes ; toute nouvelle requête doit composer les fragments
  (règle vérifiée en revue).
- ➖ Sans cache partagé, la charge du fil croît avec les lecteurs ; à réévaluer en Phase 8 (tests de charge k6).
