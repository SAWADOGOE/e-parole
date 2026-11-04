# Stratégie hors connexion

**Phase 7 — hors MVP.** Au MVP : PWA installable (manifest, icônes) sans service worker de contenu.

## Licence d'abord
Le stockage sur l'appareil n'est activé que pour les traductions dont `licenseType` permet la redistribution
(domaine public, CC). LSG 1910 et Darby sont éligibles.

## Approche
| Niveau | Contenu | Mécanisme |
|---|---|---|
| 1 — Automatique | Chapitres récemment lus (50 derniers) | Service worker, stratégie *stale-while-revalidate* sur `/api/bible/:t/:book/:chapter` (JSON immuable, cache 1 an) |
| 2 — Volontaire | « Télécharger la Bible pour lecture hors ligne » (~1,5 Mo compressé par traduction) | Paquet JSON par livre → IndexedDB, progression visible, Wi-Fi conseillé |
| 3 — Données personnelles | Surlignages, notes créés hors ligne | File d'attente IndexedDB, synchronisation au retour réseau, résolution « dernier écrit gagne » |

Outil : Serwist (successeur de next-pwa) ⚠️ à vérifier (version stable, compatibilité Next 16) en Phase 7.

## Hors périmètre
Publications, prières et messages hors ligne : non prévus (risques de confidentialité sur appareil partagé et de conflits).
Les brouillons de publication sont toutefois conservés localement.

## Confidentialité
Option « Effacer les données hors ligne » dans les paramètres ; les notes stockées localement sont purgées à la déconnexion.
