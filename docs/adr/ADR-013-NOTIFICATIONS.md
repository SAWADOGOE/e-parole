# ADR-013 — Notifications in-app : groupes en base, SSE sur LISTEN/NOTIFY, repli polling

- **Statut** : Proposé (Phase 3), en attente de validation du propriétaire
- **Date** : 2026-11-06
- **Applique** : [ADR-005](ADR-005-REALTIME.md)

## Contexte
REQ-NOTIF-1 demande une cloche avec regroupement (« 5 personnes ont réagi »). ADR-005 fixe SSE au MVP, sans Redis ni
service tiers, avec repli en polling. Les réseaux mobiles coupent les connexions longues.

## Décision
- **Regroupement à l'écriture** : une ligne `notification` par (destinataire, `groupKey`) **non lue** (index unique partiel),
  les acteurs distincts dans `notification_actor`. Un nouvel événement rejoint le groupe ouvert (upsert atomique) ; une fois
  lu, un nouvel événement ouvre un nouveau groupe.
- **Règles en SQL**, à l'écriture comme à la lecture : jamais d'un compte bloqué ou vers lui, ni d'une personne en sourdine,
  ni d'un type désactivé dans les préférences. Les acteurs bloqués après coup disparaissent du compte et de la phrase.
- **Temps réel** : `pg_notify('eparole_notifications', <id du destinataire>)` dans la transaction (livré au commit) ; une
  seule connexion `LISTEN` par processus web, partagée par les flux SSE `/api/notifications/stream` (session + `Origin`
  ou `Sec-Fetch-Site` vérifiés). Le flux n'envoie que le **nombre** de non-lues ; battement 25 s, recyclage 10 min.
- **Repli** : après 3 erreurs du flux, ou sans `EventSource`, le client interroge `/api/notifications/count` toutes les 60 s.
  La logique temps réel est chargée quand le navigateur est inactif (budget JS du fil).
- Décisions de modération et retours aux signaleurs : notifications « système » sans acteur, toujours délivrées.

## Conséquences
- ➕ Aucune nouvelle brique d'infrastructure ; aucun contenu dans la charge utile NOTIFY ni dans le flux.
- ➖ Une connexion PostgreSQL dédiée par processus web ; avec plusieurs instances, chacune a la sienne (acceptable).
- ➖ Pas de notification par email ni push (P2, Phase 7) : un compte suspendu ne voit pas sa notification (il ne peut plus
  se connecter) ; le message d'erreur de connexion reste générique. À traiter avec les contestations (Phase 5).
