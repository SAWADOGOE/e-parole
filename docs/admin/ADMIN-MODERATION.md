# Centre de modération — `/admin/moderation`

Politique générale : [20-PRIVACY-AND-MODERATION.md](../20-PRIVACY-AND-MODERATION.md).

## File de dossiers
Un **dossier** (`ModerationCase`) regroupe tous les signalements d'une même cible. Colonnes : priorité, motif dominant,
type de cible, extrait (tronqué, flouté si `SEXUAL` ou `SELF_HARM` jusqu'au clic), nombre de signalements, âge du dossier,
assigné, communauté. Tri par défaut : priorité puis ancienneté.
Filtres : statut, priorité, motif, type, assigné à moi / non assigné, communauté. Recherche par id de dossier ou @handle.

## Détail d'un dossier `/admin/moderation/cases/[id]`
```text
┌───────────────────────────────┬───────────────────────────┐
│ Contenu signalé (snapshot +    │ Auteur : @handle           │
│ état actuel)                   │ Compte créé il y a 3 j     │
│                                │ Sanctions : 1 avertissement│
│ Signalements (4)               │ Signalements reçus 30 j : 6│
│  · FRAUD_FINANCIAL × 3         │                            │
│  · SPAM × 1                    │ Décision                   │
│  « demande 5000 F pour prier » │ ○ Ignorer  ○ Avertir       │
│                                │ ○ Masquer  ○ Retirer       │
│ Historique du dossier          │ ○ Suspendre [7 j ▾]        │
│                                │ Motif communiqué : [...]   │
│                                │ Note interne : [...]       │
│                                │ [Appliquer]   (raccourci ⌘↵)│
└───────────────────────────────┴───────────────────────────┘
```
Le contexte auteur se limite aux métadonnées de modération ; **pas d'accès** à ses messages, prières privées, notes.
Pour un message privé signalé : seul l'`evidenceSnapshot` (message signalé + 5 précédents) est visible.

## Décisions
| Décision | Effet | Notification |
|---|---|---|
| Ignorer | Dossier `DISMISSED` | Signaleurs : « Nous avons examiné… » (générique) |
| Avertir | Sanction `WARNING` | Auteur, avec règle concernée |
| Masquer | Contenu `isHidden`, visible par l'auteur avec mention | Auteur + contestation |
| Retirer | Soft delete, conservé 1 an pour contestation | Auteur + contestation |
| Suspendre | Compte `SUSPENDED` pour N jours, sessions révoquées | Auteur + contestation |
| Bannir | `ADMIN`+ | Auteur |
| Restaurer | Annule masquage/retrait (après appel) | Auteur |

## Contestations `/admin/moderation/appeals` (Phase 5)
L'auteur conteste depuis la notification (texte ≤ 1 000 caractères, une contestation par décision). Réexamen par un
modérateur **différent** de l'auteur de la décision. Résultat final notifié. Au MVP : contestation par email.

## Modération locale vs plateforme
Les dossiers sur des contenus de communauté apparaissent dans `/manage/[id]/moderation`. Les motifs graves
(`FRAUD_FINANCIAL`, `IMPERSONATION`, `MINOR_SAFETY`, `SELF_HARM`, `HATE`) apparaissent aussi dans la file plateforme,
qui a le dernier mot.

## Outils anti-abus (progressifs)
Limites de débit, réputation des nouveaux comptes (7 jours : 10 publications/h, pas de lien externe), détection de
duplications (même texte posté N fois), liste de domaines interdits, mots-clés d'escroquerie connus (« envoie Orange Money
pour ta bénédiction ») signalés automatiquement en priorité 1 — jamais supprimés automatiquement.
