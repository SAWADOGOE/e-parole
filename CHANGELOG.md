# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Versionnage SemVer à partir de la Phase 1.

## [Non publié]

### Ajouté — Phase 3 : réseau social (2026-11-06)
- Profils `/@handle` : avatar, bannière, bio, @handle modifiable (unique, réservés refusés, 1 changement par 24 h), champs sensibles
  avec visibilité par champ (public / abonnés / moi), privés par défaut ; abonnés, abonnements, recherche de membres découvrables.
- Images : URL présignées PUT (60 s), job `media.process` (magic bytes, refus SVG/GIF/HEIC, EXIF/GPS retirés, AVIF/WebP 320 à 1280 px),
  quotas, nettoyage quotidien, diffusion contrôlée par `/api/media`, mode économie de données.
- Publications typées (texte, témoignage, question biblique, méditation, annonce), **toujours publiques**, jusqu'à 4 images avec texte
  alternatif, un verset cité par référence et rendu par `VerseQuote`, brouillon local, mentions avec autocomplétion, liens et références
  bibliques cliquables, modification et suppression ; bouton « Publier » dans la barre d'actions du lecteur (US-5).
- Commentaires sur un niveau, masquage par l'auteur de la publication, verrouillage ; trois réactions (Amen, J'aime, Encouragé),
  une par personne et par cible, modifiable et retirable ; compteurs exacts sous concurrence.
- Abonnements, blocage (tout est caché dans les deux sens, jamais notifié), sourdine, favoris privés.
- Fils Abonnements et Découvrir chronologiques, curseur, 15 par page, préchargement à 80 %, « Tu es à jour » après 48 h.
- Notifications in-app regroupées, cloche en direct (SSE + LISTEN/NOTIFY, repli polling 60 s), préférences par type.
- Modération v1 : signalements (motif, précisions, copie figée), dossiers, priorités 0 à 3, masquage provisoire à 5 signalements,
  `/admin/moderation` (file, filtres, dossier, décisions Ignorer / Avertir / Masquer / Retirer / Suspendre / Bannir), audit sans contenu.
- Worker : `media.process`, `media.cleanup`, `maintenance.purge` (fenêtres anti-abus et sessions expirées), `moderation.sanctions.expire`.
- ADR-011, ADR-012, ADR-013 ; données de démonstration locales `pnpm demo:social`.

### Modifié — Phase 3
- Dépendances : `@aws-sdk/client-s3` et `@aws-sdk/s3-request-presigner` 3.1159.0, `sharp` 0.35.5 (sans `allowBuilds`).
- Profil d'un mineur créé non découvrable ; mineurs existants migrés.
- Pages `/admin` : refus d'accès journalisé (`security.admin_access_denied`) et 404 généralisés ; dialogue de ré-authentification partagé.
- Coque de l'espace membre allégée d'environ 24 Ko de JS (client d'authentification, `sonner`, menu du compte chargés à la demande).
- Contraste : en-têtes des tableaux admin et panneau sombre de la page de connexion.

### Ajouté — Phase 2 : Bible intégrée (2026-11-05)
- Louis Segond 1910 importée depuis eBible.org : 66 livres, 1 189 chapitres, 31 170 versets, checksums par verset et global, licence documentée.
- Import contrôlé : `pnpm bible:import` (dry-run, rapport d'intégrité, version STAGED), `bible:activate`, `bible:crosscheck`.
- Immutabilité du texte par droits PostgreSQL : rôle `eparole_bible_import`, `REVOKE` du rôle applicatif.
- Lecteur `/bible/lsg/[livre]/[chapitre]` lisible sans JavaScript, sélecteur, raccourcis clavier, réglages de lecture, thème sépia, reprise de lecture.
- Parseur de références françaises, recherche plein texte (accents, expressions, filtres, facettes, curseur).
- Surlignages, notes privées, favoris, `/bible/mes-notes`, copie et partage de lien, `VerseQuote`.
- Verset du jour : affichage, `/admin/bible/daily-verses`, sélection automatique ; `/admin/bible/translations`.
- ADR-010 : rendu et cache sous CSP à nonce.
- Errata tracés : coquilles de la source corrigées par une nouvelle version (Gn 50:10, Éz 21:32), sur décision du propriétaire.

### Décisions et dettes traitées après la Phase 2 (2026-11-05)
- Sélection de versets : le motif listbox est remplacé par un bouton bascule sur le numéro de verset ; le chapitre reste un texte.
- Budget JS du lecteur révisé à 175 Ko gzip ; ADR-010 accepté.
- `prisma migrate dev` réparé : migration de Phase 1 tolérante à la base fantôme, colonne générée décrite dans le schéma.
- Rôle applicatif imposé (`eparole_app`) et droits vérifiés au démarrage du web et du worker.

### Revues de la Phase 2 (`security-auditor`, `accessibility-reviewer`, `code-reviewer`)
- Texte : vérification dans la transaction d'import, SHA-256 recalculés à l'activation, trigger d'immutabilité, retour arrière de version, styles de paragraphe inconnus refusés.
- Sécurité : limite de recherche sans IP de confiance, curseur et caractère NUL bornés, refus admin journalisés.
- Accessibilité : focus jamais perdu, raccourcis à une touche désactivables, barre d'actions après le texte, rien de focalisé sous la barre, contraste forcé.
- Lecteur : lisible sans JavaScript, statuts 404 et 308 réels, attribution conservée en mode focus.
- Données : surlignages et favoris sérialisés et écrits par différence, réglages locaux préservés à l'inscription.

### Ajouté — Phase 1 : fondations (2026-11-04)
- Next.js 16.4.3 (App Router), TypeScript 6.0.3 strict, Tailwind 4 avec les tokens du design system, primitives Radix.
- Docker Compose (PostgreSQL 17, SeaweedFS S3, Mailpit) sur les ports 5xxxx ; Dockerfile multi-stage non root.
- Prisma 7.10.1 : schéma de base, 3 migrations (extensions, contraintes, audit append-only, schéma pg-boss), seed.
- Better Auth 1.7.14 : inscription, vérification email, connexion, reset, sessions, 2FA TOTP et codes de secours.
- RBAC : matrice de permissions en code, `authorize()`, gardes `/admin` (MFA, 12 h) et `/manage` (404).
- Espaces membre, responsable et administration ; utilisateurs, rôles (ré-authentification) et journal d'audit.
- pg-boss et worker pour les emails ; next-intl (fr) ; CSP avec nonce et en-têtes de sécurité.
- Tests : unitaires, d'intégration (PostgreSQL réel) et E2E (Playwright + axe) ; CI GitHub Actions.

### Sécurité (revues `security-auditor` et `code-reviewer`)
- MFA vérifiée par session pour `/admin`, révocation des autres sessions au changement de 2FA, pas d'appareil de confiance.
- Anti-énumération à l'inscription, limites de connexion sur les seuls échecs, verrouillage 2FA à 5 échecs.
- Redirection `retour` robuste, `x-request-id` validé, port web lié à 127.0.0.1, rétention des jobs email 1 h.
- Droits PostgreSQL réduits (`DELETE user`, `_prisma_migrations`), clé d'audit en RESTRICT.

### Modifié
- TypeScript 6, pnpm 11 et SeaweedFS remplacent TypeScript 7, pnpm 12 et MinIO ([ADR-009](docs/adr/ADR-009-PHASE1-TOOLING.md)).

### Ajouté — Phase 0 (2026-11-04)
- Documentation de conception (`docs/`, `docs/bible/`, `docs/admin/`, `docs/claude/`, `docs/adr/`).
- `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `.gitignore`.
- 19 skills, 11 agents et 14 rules Claude Code dans `.claude/`.
- Aucun code applicatif, aucune dépendance installée.

### Décidé — validation de la Phase 0 (2026-11-04)
- Routes françaises côté membres (Q2).
- Les responsables de communauté ne voient pas l'auteur d'une prière anonyme (Q3).
- Contenu éditorial rédigé par l'équipe admin (plateforme) et par les responsables de communauté (`/manage`) (Q8).
