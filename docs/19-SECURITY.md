# 19 — Sécurité

## Modèle de menaces (résumé)
| Actif | Menace | Contrôle |
|---|---|---|
| Prières privées, messages | Fuite par IDOR, admin trop puissant, logs | Policies par ressource, 404 sur invisible, aucun accès admin au contenu, logs sans PII |
| Comptes admin | Phishing, vol de session | MFA obligatoire, sessions 12 h, ré-auth pour actions sensibles, audit |
| Communautés | Accès croisé entre communautés | `CommunityScope` obligatoire, tests d'isolation |
| Identité pastorale | Usurpation pour escroquerie | Badges vérifiés manuels, signalement `IMPERSONATION` prioritaire, liste de noms protégés |
| Texte biblique | Altération | Tables en écriture interdite pour le rôle applicatif, checksum à l'import |
| Uploads | Fichiers malveillants, stockage abusif | Liste blanche MIME + magic bytes, re-encodage `sharp`, quotas, URL présignées courtes |
| Plateforme | Spam, bots, comptes jetables | Rate limiting, vérification email, réputation progressive des nouveaux comptes |

## Contrôles techniques
- **Autorisation** : `authorize(actor, permission, resource?)` appelée dans chaque service ; matrice testée exhaustivement
  ([admin/ADMIN-ROLES-PERMISSIONS.md](admin/ADMIN-ROLES-PERMISSIONS.md)). Le middleware Next ne sert qu'à rediriger, jamais à autoriser.
- **Validation** : Zod sur toute entrée serveur (Server Actions, Route Handlers, jobs). Limites de longueur partout.
- **XSS** : React échappe par défaut ; **aucun** `dangerouslySetInnerHTML` sauf rendu du contenu éditorial depuis un format
  de blocs structuré (pas de HTML brut stocké). Liens utilisateur en `rel="nofollow ugc noopener"`.
- **CSP** stricte avec nonce (`script-src 'self' 'nonce-…'`), `frame-ancestors 'none'`, `img-src` limité au domaine média.
- **CSRF** : Server Actions protégées par la vérification d'origine de Next.js ; cookies `SameSite=Lax` ; Route Handlers
  mutants vérifient `Origin`.
- **Rate limiting** : stocké en PostgreSQL (table `rate_limit` avec fenêtres glissantes) au MVP ; Redis si charge.
  Limites nommées : `auth.signin`, `post.create` (10/h pour un compte < 7 jours, 60/h ensuite), `comment.create`,
  `report.create`, `upload.request`, `prayer.create`.
- **Anti-bot** : honeypot + délai minimal sur l'inscription ; ⚠️ Cloudflare Turnstile envisagé (service tiers, données envoyées à Cloudflare — à valider).
- **Liens dangereux** : pas d'aperçu de lien au MVP (évite SSRF) ; détection de domaines de phishing connus en Phase 5.
- **En-têtes** : HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive.
- **Secrets** : variables d'environnement, `.env` jamais committé, `.env.example` sans valeurs réelles ; en production,
  fichiers secrets Docker ou gestionnaire du fournisseur.
- **Base** : rôle applicatif sans `SUPERUSER`, sans droit `UPDATE/DELETE` sur `bible_verse` (rôle d'import séparé).
- **Dépendances** : `pnpm audit` en CI, Dependabot/Renovate, lockfile obligatoire, `onlyBuiltDependencies` explicite.
- **Logs** : pas de corps de requête, pas de contenu de prière/message, emails hachés dans les logs applicatifs.

## Données sensibles
Les convictions religieuses sont une **catégorie particulière de données** dans de nombreux droits (RGPD art. 9 ;
loi burkinabè n° 001-2021/AN sur la protection des données personnelles, contrôlée par la CIL) ⚠️ **à faire valider par
un juriste**. Conséquences produit : consentement explicite à l'inscription, minimisation (année de naissance seule,
champs d'église optionnels et privés par défaut), export et suppression en libre-service.

## Sécurité opérationnelle
- Accès SSH par clé uniquement, pare-feu (80/443 seulement), mises à jour automatiques de sécurité.
- PostgreSQL et MinIO non exposés publiquement.
- Sauvegardes chiffrées (`age`) et testées mensuellement.

## Questions ouvertes
- Adresse et procédure de divulgation responsable (SECURITY.md).
- Recours à Cloudflare (proxy/Turnstile) compatible avec la position sur la confidentialité ?
- Hébergement : en Afrique de l'Ouest (latence) ou en Europe (offre, prix) ? Impact juridique des transferts.
