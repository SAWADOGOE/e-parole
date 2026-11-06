# 04 — Exigences produit

Chaque exigence a un identifiant stable (`REQ-<MODULE>-<n>`) repris dans le backlog et les tests.
Priorité : **M** = MVP, **P2** = phase suivante, **F** = futur.

## Comptes et profils (AUTH, PROF)
| ID | Exigence | Prio |
|---|---|---|
| REQ-AUTH-1 | Inscription email + mot de passe, vérification email obligatoire avant publication | M |
| REQ-AUTH-2 | Connexion, déconnexion, réinitialisation du mot de passe | M |
| REQ-AUTH-3 | Liste des sessions actives et révocation | M |
| REQ-AUTH-4 | MFA TOTP obligatoire pour tout rôle global ≠ `MEMBER` | M |
| REQ-AUTH-5 | Export des données (JSON) et suppression du compte avec délai de grâce de 30 jours | M |
| REQ-AUTH-6 | Connexion Google, numéro de téléphone (OTP SMS) | F |
| REQ-PROF-1 | Profil : avatar, bannière, nom affiché, @handle unique, bio | M |
| REQ-PROF-2 | Champs sensibles (église, ville, pays, dénomination) avec visibilité par champ : public / abonnés / moi | M |
| REQ-PROF-3 | Abonnements, abonnés, blocage, mise en sourdine | M |
| REQ-PROF-4 | Badges vérifiés (pasteur, responsable d'église, enseignant) sans permission associée | P2 |

## Bible (BIB) — voir [bible/BIBLE-MODULE.md](bible/BIBLE-MODULE.md)
| ID | Exigence | Prio |
|---|---|---|
| REQ-BIB-1 | Lecture LSG 1910 : livre, chapitre, versets, précédent/suivant | M |
| REQ-BIB-2 | Saisie de référence (« Jean 3:16 », « Ps 23 », « 1 Co 13:4-7 ») | M |
| REQ-BIB-3 | Recherche plein texte (mot, expression, filtre livre/testament) | M |
| REQ-BIB-4 | Réglages de lecture : taille, interligne, thème, mode focus ; reprise du dernier chapitre | M |
| REQ-BIB-5 | Sélection de versets : copier, partager (publication, communauté, message), favori | M |
| REQ-BIB-6 | Surlignage (5 couleurs) et notes personnelles privées | M |
| REQ-BIB-7 | Verset du jour éditorialisé | M |
| REQ-BIB-8 | Seconde traduction (Darby) et comparaison côte à côte | P2 |
| REQ-BIB-9 | Plans de lecture avec progression | P2 |
| REQ-BIB-10 | Lecture hors connexion (PWA) des chapitres déjà ouverts | F |

## Réseau social (SOC)
| ID | Exigence | Prio |
|---|---|---|
| REQ-SOC-1 | Publications : texte, jusqu'à 4 images, verset cité, types (texte, témoignage, question biblique, méditation, annonce). **Toute publication est publique** : visible par tout membre connecté, sans choix de visibilité (décision du propriétaire, 2026-11-05). La visibilité « Communauté » sera décidée en Phase 4 | M |
| REQ-SOC-2 | Commentaires avec un niveau de réponse | M |
| REQ-SOC-3 | Réactions limitées, exactement trois (Amen 🙏, J'aime ❤️, Encouragé 💪), toujours accompagnées d'un libellé texte ; une par personne et par cible, modifiable et retirable | M |
| REQ-SOC-4 | Fil « Abonnements » et fil « Découvrir » chronologiques | M |
| REQ-SOC-5 | Favoris, partage, mentions, hashtags | M (favoris, mentions) / P2 (hashtags) |
| REQ-SOC-6 | Signalement de tout contenu | M |

## Prières (PRAY) — voir [20-PRIVACY-AND-MODERATION.md](20-PRIVACY-AND-MODERATION.md)
| ID | Exigence | Prio |
|---|---|---|
| REQ-PRAY-1 | Demande avec catégorie, visibilité (publique, abonnés, communauté, privée), anonymat optionnel | M |
| REQ-PRAY-2 | « Je prie pour toi » (une fois par personne) avec compteur visible par l'auteur | M |
| REQ-PRAY-3 | Commentaires désactivables par l'auteur | M |
| REQ-PRAY-4 | Marquer « exaucée » et publier un témoignage | M |
| REQ-PRAY-5 | Archivage automatique après 90 jours (configurable) | P2 |

## Communautés (COM)
| ID | Exigence | Prio |
|---|---|---|
| REQ-COM-1 | Créer une communauté (publique ou privée), catégorie, règlement | M |
| REQ-COM-2 | Adhésion libre, sur demande ou sur invitation | M |
| REQ-COM-3 | Rôles locaux et espace `/manage` | M |
| REQ-COM-4 | Publications et prières internes à la communauté | M |
| REQ-COM-5 | Profil « Église » vérifié lié à une communauté | P2 |
| REQ-COM-6 | Événements de communauté | P2 |

## Contenus éditoriaux (EDIT)
| ID | Exigence | Prio |
|---|---|---|
| REQ-EDIT-1 | CMS : méditations, enseignements, prédications, articles, annonces | P2 (verset du jour en M) |
| REQ-EDIT-2 | Workflow DRAFT → IN_REVIEW → APPROVED → SCHEDULED → PUBLISHED (+ REJECTED, ARCHIVED) | P2 |

## Messagerie, événements, notifications
| ID | Exigence | Prio |
|---|---|---|
| REQ-MSG-1 | Conversations 1-1 avec demandes de message pour les non-abonnés | P2 |
| REQ-MSG-2 | Conversations de groupe, temps réel, présence | F |
| REQ-EVT-1 | Événements avec fuseau horaire, lieu ou lien, inscription, rappel | P2 |
| REQ-NOTIF-1 | Notifications in-app (cloche) avec regroupement | M |
| REQ-NOTIF-2 | Préférences par type et canal (in-app, email) ; digest email | M (in-app) / P2 (email) |

## Administration (ADM) — voir [admin/ADMIN-OVERVIEW.md](admin/ADMIN-OVERVIEW.md)
| ID | Exigence | Prio |
|---|---|---|
| REQ-ADM-1 | Dashboard KPI réels (aucune donnée fictive) | M (version minimale) |
| REQ-ADM-2 | Gestion des utilisateurs : recherche, suspension, rôles, historique | M |
| REQ-ADM-3 | File de modération : signalements, décisions, sanctions | M |
| REQ-ADM-4 | Audit log consultable | M |
| REQ-ADM-5 | Gestion du verset du jour | M |
| REQ-ADM-6 | Contestations (appeals) | P2 |
| REQ-ADM-7 | Paramètres, feature flags, catégories | P2 (flags en M) |
| REQ-ADM-8 | Analytics détaillés | F |

## Exigences non fonctionnelles
| ID | Exigence |
|---|---|
| NFR-1 | LCP p75 < 2,5 s sur profil « Slow 4G » ; JS initial < 170 Ko gzip sur `/` |
| NFR-2 | WCAG 2.2 AA sur tous les espaces |
| NFR-3 | Disponibilité visée 99,5 % (mono-VPS) au lancement |
| NFR-4 | RPO 24 h (dump quotidien) puis 15 min (WAL archiving) en Phase 8 ; RTO 4 h |
| NFR-5 | Toute action d'écriture vérifiée côté serveur par une policy testée |
| NFR-6 | Français par défaut, toutes les chaînes UI externalisées (next-intl) |
