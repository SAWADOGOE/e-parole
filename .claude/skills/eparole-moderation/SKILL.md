---
name: eparole-moderation
description: Use when implementing e-Parole reporting and moderation - report dialog, moderation cases, priority queue, decisions (dismiss, warn, hide, remove, suspend, ban), sanctions, appeals, local community moderation, evidence snapshots, or anti-abuse rules (spam, financial fraud, impersonation of pastors).
---

# e-Parole — modération

## Instructions
1. Lire `docs/admin/ADMIN-MODERATION.md` et `docs/20-PRIVACY-AND-MODERATION.md`.
2. Signalement : un par personne et par cible ; regroupé dans un `ModerationCase` ouvert unique par cible.
3. Priorité depuis le motif : `SELF_HARM`/`MINOR_SAFETY` = 0, `FRAUD_FINANCIAL`/`IMPERSONATION`/`HARASSMENT`/`HATE` = 1,
   `SPAM`/`DANGEROUS_LINK`/`SEXUAL` = 2, `OTHER` = 3.
4. Message privé signalé : créer un `evidenceSnapshot` (message + 5 précédents) au moment du signalement ; c'est la seule
   donnée de conversation visible par la modération.
5. Contenu de communauté : dossier visible dans `/manage/[id]/moderation` ; motifs graves aussi dans la file plateforme.
6. Décision = transaction : `ModerationAction` + effet (masquage, retrait, sanction) + audit + notification avec voie de contestation.
7. Masquage automatique provisoire à 5 signalements de comptes de plus de 7 jours ; **jamais de suppression automatique**.
8. Appel : réexaminé par un modérateur différent de l'auteur de la décision.
9. Contenus sensibles (`SEXUAL`, `SELF_HARM`) floutés jusqu'au clic dans la file.
10. Détection de mots-clés d'escroquerie (Orange Money, « semence » contre prière…) → signalement automatique priorité 1.

## Vérifications
- [ ] Le modérateur n'accède à aucune donnée privée hors snapshot
- [ ] Notification et audit créés pour chaque décision
- [ ] Raccourcis clavier fonctionnels dans la file

## Références
`docs/admin/ADMIN-MODERATION.md`, `docs/20-PRIVACY-AND-MODERATION.md`, skill `eparole-rbac`.
