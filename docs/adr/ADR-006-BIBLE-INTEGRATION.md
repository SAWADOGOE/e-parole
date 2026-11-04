# ADR-006 — Bible stockée localement, import depuis eBible.org

- **Statut** : Accepté (Phase 0)
- **Date** : 2026-11-04

## Contexte
La lecture doit être intégrée, rapide sur réseau lent, consultable sans dépendre d'un tiers, citable partout avec un
texte exact, et cherchable en plein texte. Quatre API ont été analysées ([comparaison](../bible/BIBLE-API-COMPARISON.md)).

## Options
1. Appeler une API externe à chaque lecture (avec cache).
2. **Stocker les traductions libres de droits dans PostgreSQL**, importées depuis une source fiable ; API externes en secours.
3. Fichiers JSON statiques dans le dépôt.

## Décision
Option 2.
- Source primaire : fichiers **eBible.org** (`fraLSG`, puis `frajnd`), domaine public.
- Sources secondaires (contrôle croisé, futur) : HelloAO (`fra_lsg`, stockage explicitement autorisé), Midvash (`lsg`).
- getBible écarté comme source de référence (métadonnée de licence LSG contradictoire). API.Bible écartée au MVP
  (clé, quotas, FUMS, restrictions de cache, traductions sous droits non nécessaires).
- Couche `BibleSourceProvider` pour l'import, `BibleReader` pour la lecture : changer de fournisseur ne touche pas l'application.
- Le texte est immuable en base (droits PostgreSQL), versionné par import, contrôlé par checksum.

## Conséquences
- ➕ Zéro dépendance runtime, latence minimale, FTS local, cache CDN, hors-ligne possible.
- ➖ Responsabilité de la qualité de l'import (versification, typographie) → rapport d'intégrité et validation humaine.
- ➖ Les traductions modernes sous droits nécessiteront un contrat ou un fournisseur distant derrière la même interface.
