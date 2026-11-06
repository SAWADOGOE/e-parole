# Journal d'audit — `/admin/audit-logs`

## Ce qui est journalisé
| Domaine | Actions |
|---|---|
| Comptes | `user.suspend`, `user.reactivate`, `user.ban`, `user.force_password_reset`, `user.pii.reveal`, `user.export.admin`, `user.delete.admin` |
| Rôles | `role.grant`, `role.revoke`, `badge.grant`, `badge.revoke` |
| Modération | `moderation.case.assign`, `moderation.decision`, `moderation.appeal.decide` |
| Communautés | `community.suspend`, `community.restore`, `community.ownership.transfer`, `community.member.role_change` (local), `community.member.ban` (local) |
| Bible | `bible.import.staged`, `bible.version.activated`, `bible.translation.published`, `daily_verse.*` |
| Éditorial | `editorial.submit`, `editorial.approve`, `editorial.reject`, `editorial.publish`, `editorial.archive` |
| Paramètres | `setting.updated`, `feature_flag.updated` |
| Sécurité | `auth.mfa.enabled`, `auth.mfa.reset`, `security.admin_access_denied`, `security.cross_community_attempt` |

Ajouté en Phase 3 : `moderation.auto_hide` (masquage provisoire, sans acteur), `user.suspension.expired` (levée automatique).
`moderation.decision` enregistre la décision, le type de cible, la durée et l'identifiant de l'auteur visé — jamais le motif
communiqué, la note interne ni le contenu signalé (testé).

Les actions ordinaires des membres (publier, commenter, prier) ne sont **pas** dans l'audit log.

## Format
`{ actorId, actorRole, action, targetType, targetId, metadata, ip, userAgent, createdAt }`.
`metadata` contient les éléments utiles à la reconstitution (ancien/nouveau rôle, durée, motif codé) **mais jamais**
de contenu de prière, message, note, ni de mot de passe ou token.

## Intégrité
- Table en **append-only** : le rôle applicatif n'a que `INSERT` et `SELECT` (pas d'`UPDATE`/`DELETE`).
- Écriture dans la même transaction que l'action.
- Phase 8 : chaînage par hash (`prevHash`) et export périodique vers un stockage immuable ⚠️.

## Consultation
Filtres : acteur, action, type de cible, cible, période. Export CSV (`SUPER_ADMIN`). Un `MODERATOR` ne voit que ses actions.
Rétention 2 ans ; IP tronquée à /24 (IPv4) ou /48 (IPv6) après 90 jours.
