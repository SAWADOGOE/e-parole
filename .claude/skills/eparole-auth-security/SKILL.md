---
name: eparole-auth-security
description: Use when touching authentication (Better Auth), sessions, MFA, password flows, rate limiting, file uploads, CSP/security headers, secrets, logging of personal data, or any code handling prayers, private messages or Bible notes in e-Parole.
---

# e-Parole — authentification et sécurité

## Instructions
1. Lire `docs/12-AUTHENTICATION.md`, `docs/19-SECURITY.md`, `docs/20-PRIVACY-AND-MODERATION.md`.
2. Better Auth 1.7.x : utiliser les helpers `requireActor()`, `requireVerifiedActor()`, `requireAdminActor()` ;
   ne pas lire les cookies à la main.
3. Rôles globaux → MFA obligatoire, session ≤ 12 h, ré-auth < 10 min pour les actions sensibles.
4. Messages d'erreur d'auth non énumérants. Limites nommées (`auth.signin` 5/15 min).
5. Uploads : URL présignée courte, liste blanche MIME + magic bytes, taille ≤ 10 Mo, re-encodage `sharp`, suppression EXIF/GPS,
   SVG refusé. Bucket privé pour les documents de vérification.
6. Rendu de contenu utilisateur : jamais `dangerouslySetInnerHTML` ; liens `rel="nofollow ugc noopener"`.
7. CSP avec nonce, HSTS, `frame-ancestors 'none'`.
8. Logs : identifiants seulement. Jamais de contenu de prière, message, note, mot de passe, token, email en clair.
9. Secrets : variables d'environnement uniquement ; `.env.example` sans valeur réelle ; ne jamais afficher un secret dans l'UI.
10. Données sensibles (foi, église, prières) : privé par défaut, consentement explicite, minimisation.

## Contraintes
Aucune fonctionnalité d'aperçu de lien (SSRF) sans revue. Aucune dépendance de sécurité « maison » si Better Auth la fournit.

## Vérifications
- [ ] Tests négatifs (non connecté, non vérifié, suspendu, rôle insuffisant)
- [ ] Aucune PII dans les logs ajoutés
- [ ] Revue `security-auditor` demandée

## Références
`docs/12-AUTHENTICATION.md`, `docs/19-SECURITY.md`, `docs/admin/ADMIN-SECURITY.md`, `SECURITY.md`.
