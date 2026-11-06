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

## Implémenté en Phase 1
- **IP client** : seul l'en-tête `X-Real-IP` est pris en compte (`TRUSTED_IP_HEADER`), jamais `X-Forwarded-For`.
  ⚠️ **Prérequis de déploiement** : le reverse proxy doit écraser `X-Real-IP` (Caddy : `header_up X-Real-IP {remote_host}`).
  Sans lui, Better Auth utilise **un compteur partagé par route** : 5 connexions / 15 min pour toute la plateforme.
- **Limites par compte** (email haché SHA-256, indépendant de l'IP) : connexion 10 / 15 min, reset 3 / h, renvoi de vérification 3 / h.
  Le verrouillage du TOTP après échecs répétés est fourni par Better Auth (`failedVerificationCount`, `lockedUntil`).
- **CSP** : nonce par requête pour les scripts (`'strict-dynamic'`) ; `style-src 'unsafe-inline'` accepté pour les attributs `style`
  de Radix et Sonner (risque limité : aucune exécution de script).
- **Formulaires d'authentification** en `method="post"` : une soumission avant hydratation ne place jamais le mot de passe dans l'URL.
- **Sessions** : la liste n'expose jamais les jetons au navigateur ; révocation par identifiant de session, filtrée sur l'utilisateur.
- `birthYear` n'est pas modifiable après l'inscription (hook `user.update.before`).
- **MFA par session** : `/admin` exige `session.mfaVerifiedAt`, posé uniquement après vérification d'un code TOTP ou de
  secours pour CETTE session. Activer ou désactiver la 2FA révoque les autres sessions. Pas d'« appareil de confiance ».
- **Verrouillage 2FA** par compte : 5 échecs → 15 min (Better Auth `accountLockout`).
- **Limites de connexion** : seuls les **échecs** sont comptés (email+IP 10 / 15 min, email seul 50 / h), pour qu'un tiers
  ne puisse pas bloquer un compte avec des requêtes valides.
- **Énumération à l'inscription** : `autoSignIn: false` → réponse identique que l'adresse existe ou non ; le titulaire
  reçoit un email « tentative d'inscription ».
- **Port web** lié à `127.0.0.1` dans `compose.yaml` : seul le reverse proxy local doit joindre l'application.
- `x-request-id` entrant accepté seulement s'il respecte `^[A-Za-z0-9-]{8,64}$`.
- Journalisation des accès refusés (`/admin`, `/manage`) : une fois par requête, 20 / h / utilisateur au plus.
- Jobs email (adresse + lien à jeton) supprimés de pg-boss 1 h après traitement.
- Rôle `eparole_app` : ni `DELETE` sur `user` (suppression logique), ni écriture sur `_prisma_migrations` ;
  clé étrangère de l'audit en `RESTRICT` (une action `SET NULL` contournerait l'append-only).
- Comptes non `ACTIVE` : `getCurrentSession()` renvoie `null` (plus aucune lecture possible).

## Implémenté en Phase 3
- **Autorisation sociale** : visibilité d'abord (404), puis `authorize()` avec la ressource réelle ; mises à jour avec l'auteur
  dans la condition SQL (aucun IDOR possible, testé). Nouvelles permissions : voir [ADMIN-ROLES-PERMISSIONS](admin/ADMIN-ROLES-PERMISSIONS.md#permissions-ajoutées-en-phase-3-réseau-social-et-modération).
- **Limites nommées** : `post.create` (10/h pour un compte de moins de 7 jours, 60/h ensuite), `comment.create`, `reaction.set`,
  `relation.follow`, `relation.block`, `report.create` (20/h), `upload.request` (40/h), `profile.update`, `profile.search`, `feed.page`.
- **Purge** horaire des fenêtres `rate_limit` expirées (clés Better Auth contenant une IP comprises) et des sessions expirées
  (job `maintenance.purge`) : dette de la Phase 2 soldée.
- **Uploads** : URL présignée PUT 60 s (type et taille signés), liste blanche JPEG/PNG/WebP, 10 Mo, magic bytes, SVG/GIF/HEIC refusés,
  décodage borné, ré-encodage sans métadonnées, original supprimé ([ADR-012](adr/ADR-012-MEDIA-PIPELINE.md)). CSP `connect-src`
  étendue à l'origine du stockage (`S3_PUBLIC_ENDPOINT`).
- **Texte des membres** rendu par React (aucune injection de balisage) ; liens `rel="nofollow ugc noopener noreferrer"`,
  seuls `http:`/`https:` deviennent des liens.
- **Refus d'accès admin** : `requireAdminPermission()` journalise `security.admin_access_denied` et répond 404 sur toutes les pages
  `/admin` qui exigent une permission (dette de la Phase 2 généralisée).
- **Contraste** : en-têtes des tableaux d'administration et panneau sombre de la connexion corrigés (violations axe révélées en Phase 3).

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
