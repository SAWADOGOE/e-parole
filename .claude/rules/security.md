# Sécurité

- Validation Zod de toute entrée serveur ; limites de longueur partout.
- Auth via les helpers (`requireActor`, `requireVerifiedActor`, `requireAdminActor`) ; MFA obligatoire pour les rôles globaux.
- Rate limiting nommé sur auth, création de contenu, signalements, uploads.
- Pas de `dangerouslySetInnerHTML` ; liens utilisateur `rel="nofollow ugc noopener"` ; CSP avec nonce.
- Route Handlers mutants : vérifier `Origin`.
- Uploads : URL présignée courte, MIME + magic bytes, ≤ 10 Mo, re-encodage, suppression EXIF/GPS, SVG refusé.
- Pas d'aperçu de lien (SSRF) sans revue.
- Secrets : variables d'environnement uniquement ; jamais dans le dépôt, les logs ou l'UI ; `.env.example` sans valeur réelle.
- Nouvelle dépendance : version stable exacte, justification, `pnpm audit`.
- Jamais de push, déploiement, accès à une base de production ou modification de configuration globale sans demande explicite.
