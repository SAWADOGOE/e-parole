# Agents du projet

Emplacement : `.claude/agents/<nom>.md`. Format Claude Code : frontmatter YAML `name`, `description`, `tools`
(liste restreinte ; omis = tous les outils), `model` optionnel (`sonnet`, `opus`, `haiku`, `inherit`), puis le prompt système.

## Répartition (sans recouvrement)
| Agent | Écrit | Outils | Ne fait pas |
|---|---|---|---|
| `software-architect` | ADR, docs d'architecture | Read, Grep, Glob, Write, Edit (docs) | Code applicatif |
| `frontend-design-expert` | Composants et pages UI | Read, Grep, Glob, Write, Edit, Bash | Logique serveur, schéma |
| `nextjs-expert` | Routes, layouts, actions, cache | Read, Grep, Glob, Write, Edit, Bash | Design visuel, schéma DB |
| `database-expert` | `schema.prisma`, migrations, requêtes | Read, Grep, Glob, Write, Edit, Bash | UI |
| `bible-integration-expert` | `features/bible`, scripts d'import | Read, Grep, Glob, Write, Edit, Bash, WebFetch | Éditer le texte biblique |
| `admin-architecture-expert` | `/admin`, `/manage`, CMS, modération | Read, Grep, Glob, Write, Edit, Bash | Espace membre |
| `security-auditor` | Rapport | Read, Grep, Glob, Bash (lecture) | Modifier le code |
| `accessibility-reviewer` | Rapport | Read, Grep, Glob, Bash (lecture) | Modifier le code |
| `test-engineer` | Tests, factories | Read, Grep, Glob, Write, Edit, Bash | Code de production (sauf testabilité minime signalée) |
| `devops-expert` | Docker, CI, scripts d'exploitation | Read, Grep, Glob, Write, Edit, Bash | Push, déploiement réel |
| `code-reviewer` | Rapport de revue | Read, Grep, Glob, Bash (git diff) | Modifier le code |

Les agents en lecture seule n'ont pas `Write`/`Edit`. Aucun agent n'est autorisé à pousser, fusionner ou déployer.
