# AGENTS.md

Instructions pour tout agent de code (Claude Code ou autre assistant) travaillant sur e-Parole.
La source de vérité opérationnelle est [CLAUDE.md](CLAUDE.md). Ce fichier résume les règles communes et
présente les agents spécialisés du dépôt.

## Règles communes
1. Lire `CLAUDE.md` puis le document `docs/` du module concerné avant toute modification.
2. Respecter la phase en cours ([docs/08-ROADMAP.md](docs/08-ROADMAP.md)). Ne pas anticiper une phase non validée.
3. Vérifier chaque permission côté serveur et valider chaque entrée avec Zod.
4. Ne jamais modifier le texte biblique importé ni inventer une traduction.
5. Ne jamais committer de secrets ni exposer de prières privées ou de messages privés dans des logs, fixtures ou captures.
6. Signaler honnêtement ce qui n'a pas été testé ou vérifié.

## Agents spécialisés (`.claude/agents/`)

| Agent | Rôle | Écrit du code ? |
|---|---|---|
| `software-architect` | Découpage des modules, ADR, cohérence globale | Docs et ADR |
| `frontend-design-expert` | UI, design system, parcours | Oui (UI) |
| `nextjs-expert` | Routing, rendu, cache, Server Actions | Oui |
| `database-expert` | Schéma Prisma, index, migrations, recherche plein texte | Oui (schéma) |
| `bible-integration-expert` | Lecteur, import, recherche, licences | Oui (module Bible) |
| `admin-architecture-expert` | `/admin`, `/manage`, CMS, modération | Oui |
| `security-auditor` | Audit sécurité, RBAC, confidentialité | Non (lecture seule) |
| `accessibility-reviewer` | Audit WCAG 2.2 AA | Non (lecture seule) |
| `test-engineer` | Stratégie et écriture des tests | Oui (tests) |
| `devops-expert` | Docker, CI, déploiement, sauvegardes | Oui (infra) |
| `code-reviewer` | Revue de diff avant fusion | Non (lecture seule) |

Détails : [docs/claude/CLAUDE-AGENTS.md](docs/claude/CLAUDE-AGENTS.md).
