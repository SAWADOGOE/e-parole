# ADR-003 — Better Auth

- **Statut** : Accepté (Phase 0)
- **Date** : 2026-11-04

## Contexte
Besoins MVP : email + mot de passe, vérification email, reset, sessions en base révocables, MFA TOTP obligatoire pour les
administrateurs, rate limiting des endpoints d'auth, adapter Prisma. Interdiction d'utiliser des versions bêta.

## Options
| | Better Auth 1.7.16 | Auth.js / next-auth |
|---|---|---|
| Version stable adaptée à l'App Router | Oui | v5 en `beta` (5.0.0-beta.32) ; v4.24 stable mais ancienne API |
| Email/mot de passe | Natif | Credentials provider minimaliste, déconseillé par la doc |
| 2FA | Plugin officiel | À développer |
| Sessions DB + révocation | Natif | Via adapter |

## Décision
**Better Auth 1.7.x** avec : `emailAndPassword` (vérification requise), plugin `twoFactor`, adapter Prisma, sessions en
base, rate limiting intégré. Les rôles et communautés restent dans notre domaine (pas de plugins `admin`/`organization`).

## Conséquences
- ➕ Couverture native des exigences, moins de code de sécurité maison.
- ➖ Bibliothèque plus jeune qu'Auth.js : suivre les avis de sécurité, épingler la version, tests E2E des flux d'auth.
- Les tables `user`, `session`, `account`, `verification`, `two_factor` suivent le schéma Better Auth ; nos champs métier
  vont dans `Profile` et `User` (champs additionnels déclarés).
