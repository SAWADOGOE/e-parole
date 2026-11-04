# Paramètres — `/admin/settings`

## Modules
| Module | Exemples | Critique (SUPER_ADMIN) | Phase |
|---|---|---|---|
| Général | Nom affiché, email de contact, langue par défaut, pages légales | — | 5 |
| Identité visuelle | Logo, couleur d'accent (choix parmi tokens validés AA), image de partage | — | 5 |
| Inscriptions | Ouvertes / sur invitation / fermées ; âge minimal | ✅ | MVP (ouvert/fermé) |
| Rôles et permissions | Lecture de la matrice (non éditable : définie en code), attribution via `/admin/users` | — | MVP |
| Catégories | Catégories de communautés, prières, contenus | — | 5 |
| Publication | Taille max des textes, nombre d'images, types de posts activés | — | 5 |
| Modération | Seuil de masquage automatique provisoire, mots-clés de détection, domaines interdits | ✅ (seuils) | 5 |
| Médias | Taille max, formats, quotas par utilisateur | ✅ | 5 |
| Notifications | Fréquence des digests, notifications par défaut | — | 7 |
| Traductions bibliques | Lien vers `/admin/bible/translations` | ✅ | 2 |
| Feature flags | Activation de modules (messagerie, événements, hashtags), rollout par pourcentage ou par rôle | ◐ | MVP |
| Communautés | Qui peut créer une communauté, limite par utilisateur | — | 5 |
| Limites d'utilisation | Rate limits nommés | ✅ | 5 |
| Rétention | Durées de conservation | ✅ | 5 |

## Stockage
`PlatformSetting { key (unique), value Json, schemaVersion, updatedById, updatedAt }`, valeurs validées par un schéma Zod
par clé (registre en code). `FeatureFlag { key, enabled, rolloutPercent, allowedRoles[] }`.
Lecture via cache mémoire (TTL 60 s) + invalidation par tag lors de la mise à jour.

## Journal des modifications
Chaque modification écrit `setting.updated` dans l'audit log avec ancienne et nouvelle valeur (sauf valeurs marquées
`sensitive`, dont seul le changement est noté).

## Secrets
**Aucun secret n'est stocké ni affiché** dans `/admin/settings` : SMTP, clés S3, secret d'auth restent en variables
d'environnement. L'écran indique seulement « SMTP : configuré ✓ » (test d'envoi possible) sans afficher de valeur.
