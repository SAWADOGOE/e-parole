# 07 — Périmètre du MVP

Le MVP correspond aux **Phases 1 à 4 + l'administration minimale** de la [roadmap](08-ROADMAP.md).
Il doit permettre un **pilote fermé** avec 5 à 10 communautés au Burkina Faso.

## Critère directeur
Une église pilote peut : créer sa communauté, y inviter ses membres, lire la Bible ensemble, partager des versets
et des témoignages, porter des demandes de prière, et être modérée de façon fiable.

## Inclus dans le MVP

| Module | Inclus |
|---|---|
| Comptes | Inscription email, vérification, connexion, reset, sessions, MFA admin, export, suppression |
| Profils | Avatar, bannière, bio, visibilité des champs sensibles, suivre, bloquer |
| Bible | LSG 1910, lecteur, navigation, référence, recherche FTS, réglages, surlignage, notes, favoris, partage, verset du jour |
| Social | Publications (texte, images, verset, types), commentaires, réactions, fils Abonnements/Découvrir, favoris, mentions, signalement |
| Prières | Demandes avec visibilité et anonymat, « Je prie pour toi », commentaires désactivables, exaucement + témoignage |
| Communautés | Création, public/privé, adhésion, invitations par lien, rôles locaux, publications et prières internes, `/manage` |
| Notifications | In-app (cloche), préférences par type, emails transactionnels uniquement |
| Admin minimale | Dashboard KPI réels, utilisateurs (recherche, suspension, rôles), modération (signalements, décisions), audit log, verset du jour, feature flags |
| Transverse | FR, i18n prête, mode sombre, PWA installable (manifest, sans offline), économie de données |

## Exclus du MVP (et pourquoi)

| Exclu | Phase | Raison |
|---|---|---|
| Messagerie privée | 7 | Coût de modération et de temps réel ; WhatsApp couvre le besoin au pilote |
| Événements | 7 | Les annonces de communauté suffisent au pilote |
| CMS complet (enseignements, prédications, workflow de revue) | 6 | Le verset du jour suffit ; les enseignants publient via des publications « Enseignement » |
| Plans de lecture | 6 | Dépend d'un contenu éditorial à produire |
| Darby / comparaison | 6 | LSG suffit au pilote ; import Darby prêt techniquement |
| Églises vérifiées | 5 | Procédure humaine à définir |
| Contestations (appeals) | 5 | Contestation par email au pilote |
| Audio / vidéo | 7+ | Coût de stockage et de bande passante |
| Offline | 7 | Complexité PWA, besoin à mesurer |
| Analytics avancés | 5+ | KPI de base suffisent |

## Définition de « terminé » pour le MVP
- Parcours E2E verts : inscription, lecture Jean 3, recherche « grâce », publication avec verset, demande de prière communauté,
  création de communauté + approbation, suspension admin, traitement d'un signalement, refus d'accès inter-communautés.
- Audit sécurité des policies (agent `security-auditor`) sans finding critique ou élevé ouvert.
- Axe + revue manuelle clavier sur les 10 écrans principaux, sans violation AA.
- LCP p75 < 2,5 s (Lighthouse « Slow 4G », Moto G Power) sur `/`, `/bible/lsg/jean/3`, `/prieres`.
- Sauvegarde quotidienne restaurée avec succès au moins une fois.
