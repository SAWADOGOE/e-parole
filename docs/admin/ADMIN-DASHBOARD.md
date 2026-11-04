# Dashboard administrateur

## Règle absolue
**Aucune valeur fictive présentée comme réelle.** Sans donnée : état vide explicite (« Aucune inscription sur la période »).
En développement, les données de seed sont marquées « Démo » (badge visible sur le dashboard si `isDemo` détecté).

## Indicateurs (MVP)
| KPI | Définition exacte | Source |
|---|---|---|
| Utilisateurs | Comptes `ACTIVE` + `SUSPENDED` (hors supprimés) | `user` |
| Nouveaux inscrits | Comptes créés sur la période, email vérifié | `user.createdAt` |
| Utilisateurs actifs (7 j / 30 j) | Au moins une session rafraîchie sur la période | `session.updatedAt` |
| Publications / du jour | Posts non supprimés créés sur la période / aujourd'hui (UTC) | `post` |
| Communautés | Communautés `ACTIVE` | `community` |
| Demandes de prière | **Nombre total seulement**, toutes visibilités, sans détail | `prayer_request` |
| Signalements ouverts | Dossiers `OPEN` + `IN_PROGRESS`, ventilés par priorité | `moderation_case` |
| Comptes suspendus | Statut `SUSPENDED` | `user` |
| Ajoutés plus tard | Églises vérifiées (P5), enseignements, prédications (P6), événements (P7), contenus en attente (P6) | |

Chaque KPI affiche la valeur, la variation vs période précédente et un lien vers la liste filtrée.

## Visualisations
- Courbe des inscriptions et des actifs (jour/semaine), sélecteur 7 j / 30 j / 90 j / personnalisé.
- Barres empilées des dossiers de modération par motif.
- Activité récente : 20 dernières entrées d'audit (actions d'administration, pas d'actions des membres).
- Alertes : dossiers priorité 0 non assignés, échecs de jobs, sauvegarde manquante.

## Confidentialité
- Aucune liste nominative de demandes de prière, ni de répartition par dénomination ou église au niveau individuel.
- Agrégats avec seuil : aucune statistique sur un groupe < 5 personnes (évite la ré-identification).
- Le dashboard d'un `MODERATOR` se limite à la modération ; celui d'un `CONTENT_EDITOR` aux contenus.

## Technique
Vues matérialisées (`admin_daily_stats`) rafraîchies par job toutes les 15 min ; heure de dernière mise à jour affichée.
Graphiques Recharts via composant `chart` shadcn, palettes issues des tokens, tableau de données accessible en alternative.
