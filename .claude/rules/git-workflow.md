# Workflow Git

- Avant toute modification : `git status`, branche courante, modifications existantes à préserver.
- Branches : `feat/…`, `fix/…`, `docs/…`, `chore/…`, `refactor/…`, `test/…` ; jalons `phase-N/…`.
- Conventional Commits : `type(scope): résumé impératif ≤ 72 caractères` (scopes : auth, bible, social, prayers,
  communities, admin, manage, moderation, ui, db, infra).
- Avant de proposer un commit : `pnpm lint && pnpm typecheck && pnpm test` (quand disponibles).
- Interdits sans demande explicite : commit, push, force push, merge, rebase de branche partagée, `reset --hard`,
  suppression de fichiers ou de branches, déploiement.
- Ne jamais committer `.env`, secrets, dumps de base, fichiers sources bibliques volumineux ou données réelles.
- Revue : `code-reviewer`, puis `security-auditor` si la PR touche auth, policies, prières, messagerie, uploads ou admin ; validation humaine.
