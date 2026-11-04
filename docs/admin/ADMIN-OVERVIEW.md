# Administration — vue d'ensemble

e-Parole dispose d'un **back-office professionnel** (`/admin`) et d'un **espace responsable** (`/manage`).
Ce ne sont pas des pages de statistiques : ce sont des outils de gouvernance de la plateforme.

**Statut : conçu, non implémenté.** Une administration minimale sécurisée fait partie du MVP.

## Espaces
| Espace | Route | Qui | Périmètre |
|---|---|---|---|
| Administration générale | `/admin` | `SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `CONTENT_EDITOR` (MFA obligatoire) | Toute la plateforme, selon permissions |
| Responsable | `/manage/[communityId]` | `COMMUNITY_OWNER`, `COMMUNITY_ADMIN`, `COMMUNITY_MODERATOR` | Uniquement leurs communautés |

## Navigation retenue (simplifiée selon la roadmap)
```text
/admin
  /                       Dashboard                         MVP
  /users                  Utilisateurs + détail /users/[id]  MVP
  /moderation             File de dossiers + /cases/[id]     MVP
  /moderation/appeals     Contestations                      Phase 5
  /bible/daily-verses     Versets du jour                    MVP
  /bible/translations     Traductions et imports             Phase 2 (lecture), import par CLI
  /bible/reading-plans    Plans de lecture                   Phase 6
  /communities            Communautés                        Phase 4 (liste, suspension)
  /churches               Vérification des églises           Phase 5
  /content                CMS (filtre par type)              Phase 6
  /roles                  Attribution des rôles globaux      MVP (dans /users/[id] au début)
  /audit-logs             Journal d'audit                    MVP
  /settings               Paramètres + feature flags         MVP (flags) / Phase 5
  /analytics              Statistiques détaillées            Phase 5+

/manage/[communityId]
  /                       Tableau de bord de la communauté   MVP
  /members                Membres et demandes                MVP
  /moderation             Signalements locaux                MVP
  /settings               Profil, règlement, adhésion        MVP
  /posts /prayers         Gestion des contenus               Phase 4
  /events /teachings      Événements, enseignements          Phase 6-7
```
Changements par rapport à l'arborescence proposée : `/admin/posts`, `/admin/comments`, `/admin/prayers` **ne sont pas
créés** comme listes générales — l'accès aux contenus passe par la modération (dossier) ou la fiche utilisateur, ce qui
évite un écran de navigation libre dans les prières. `/admin/content/meditations|teachings|sermons` sont fusionnés en
`/admin/content?kind=…`. `/admin/notifications` (annonces plateforme) est reporté en Phase 7.

## Documents
[Architecture](ADMIN-ARCHITECTURE.md) · [Rôles et permissions](ADMIN-ROLES-PERMISSIONS.md) · [Dashboard](ADMIN-DASHBOARD.md) ·
[Utilisateurs](ADMIN-USER-MANAGEMENT.md) · [Communautés](ADMIN-COMMUNITIES.md) · [Églises](ADMIN-CHURCHES.md) ·
[Contenus](ADMIN-CONTENT-MANAGEMENT.md) · [Bible](ADMIN-BIBLE-MANAGEMENT.md) · [Modération](ADMIN-MODERATION.md) ·
[Paramètres](ADMIN-SETTINGS.md) · [UI/UX](ADMIN-UI-UX.md) · [Sécurité](ADMIN-SECURITY.md) · [Audit](ADMIN-AUDIT-LOG.md)
