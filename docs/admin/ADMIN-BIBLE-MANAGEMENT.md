# Administration biblique — `/admin/bible`

## Principe
Le texte biblique est une **donnée de référence protégée**. L'administration gère la publication, les versions, les
métadonnées et l'éditorial autour du texte ; elle **ne permet pas d'éditer un verset**.

## Écrans
| Écran | Contenu | Permission | Phase |
|---|---|---|---|
| `/admin/bible/translations` | Liste : code, nom, licence, source, version active, nombre de versets, checksum, statut de publication | `bible:translation:read` | 2 |
| Détail traduction | Historique des versions importées, rapport d'import, preuve de licence, attribution affichée | idem | 2 |
| Publier / dépublier une traduction | Bascule `isPublished` avec ré-auth | `bible:translation:publish` | 2 |
| Activer une version | Bascule atomique de version (après import staged) | `bible:import` | 2 |
| `/admin/bible/daily-verses` | Calendrier mensuel, programmation, aperçu, historique, alerte de doublon (30 j) | `daily_verse:manage` | MVP |
| `/admin/bible/reading-plans` | Plans : création, jours, passages, statut éditorial | `reading_plan:manage` | 6 |
| Méditations liées | Via `/admin/content?kind=MEDITATION` | `editorial:*` | 6 |

## Import
L'import n'est **pas déclenché depuis l'UI** au MVP : il passe par la CLI (`pnpm bible:import`) exécutée par un
`SUPER_ADMIN` sur le serveur, avec le rôle PostgreSQL d'import. L'UI affiche le résultat (version `STAGED`) et permet
l'activation. Raisons : fichiers volumineux, opération rare, surface d'attaque réduite.

## Verset du jour
- Choix de la référence via `ReferenceInput`, aperçu exact du texte et de l'attribution.
- Petite phrase éditoriale facultative (≤ 200 caractères), **séparée** du verset.
- Statuts du workflow éditorial ; programmation jusqu'à 90 jours à l'avance.
- Si aucun verset n'est programmé pour un jour : sélection automatique dans une liste curatée (`daily_verse_pool`),
  signalée « automatique » dans l'historique.

## Audit
`bible.import.staged`, `bible.version.activated`, `bible.translation.published`, `daily_verse.scheduled`,
`daily_verse.updated`.
