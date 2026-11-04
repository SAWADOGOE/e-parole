# Skills du projet

Emplacement : `.claude/skills/<nom>/SKILL.md`. Format vérifié pour Claude Code 2.1.x : frontmatter YAML avec `name`
(minuscules, chiffres, tirets) et `description` (quand utiliser le skill — c'est ce que Claude lit pour décider de le
charger), puis le corps Markdown chargé à l'invocation. Invocables aussi par `/<nom>`.

| Skill | Se déclenche quand… |
|---|---|
| `eparole-architecture` | On crée un module, déplace du code, ajoute une dépendance entre modules |
| `eparole-frontend-design` | On conçoit ou modifie un écran de l'espace membre |
| `eparole-responsive-design` | On travaille la disposition mobile/tablette/desktop |
| `eparole-nextjs` | Routes, layouts, Server Actions, cache, rendu |
| `eparole-typescript` | Types, schémas Zod, erreurs typées |
| `eparole-prisma-postgres` | Schéma, migrations, requêtes, index, FTS |
| `eparole-auth-security` | Auth, sessions, MFA, uploads, en-têtes, secrets |
| `eparole-bible` | Lecteur, références, recherche, citations, import |
| `eparole-bible-licensing` | Ajout ou examen d'une traduction ou d'une source biblique |
| `eparole-community-features` | Communautés, adhésions, rôles locaux, `/manage` |
| `eparole-prayers` | Demandes de prière, visibilité, anonymat, témoignages |
| `eparole-admin` | Écrans et actions `/admin` |
| `eparole-rbac` | Permissions, `authorize()`, matrice |
| `eparole-moderation` | Signalements, dossiers, sanctions, contestations |
| `eparole-testing` | Écriture de tests, choix du niveau |
| `eparole-accessibility` | Toute UI ; audit WCAG |
| `eparole-performance` | Budgets, images, bundles, requêtes |
| `eparole-docker-devops` | Docker, CI, déploiement, sauvegardes |
| `eparole-code-review` | Revue d'un diff avant fusion |

Les skills renvoient vers `docs/` plutôt que de dupliquer la documentation.
Skills utilisateur déjà présents et complémentaires : `ui-ux-pro-max`, `design-system`, `ui-styling`, `security-audit`,
`clean-code`, `clean-code-review` (dans `~/.claude/skills`, hors dépôt).
