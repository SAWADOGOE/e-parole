# Plugins Claude Code — audit

Audit du **2026-11-04** sur Claude Code **2.1.318**. Sources consultées : `~/.claude/settings.json` (`enabledPlugins`),
`~/.claude/plugins/installed_plugins.json`, et le catalogue local de la marketplace officielle
`claude-plugins-official` (dépôt GitHub `anthropics/claude-plugins-official`, fichier `.claude-plugin/marketplace.json`).

**Aucun plugin n'a été installé, désinstallé ou modifié pendant la Phase 0.**

## Plugins déjà installés (portée utilisateur)
| Plugin | Version | Fonction | Utilité e-Parole | Classement |
|---|---|---|---|---|
| `frontend-design@claude-plugins-official` | 1.1.1 | Skill de direction artistique pour l'UI | Écrans membres, éviter le design générique | **INDISPENSABLE** (présent) |
| `code-review@claude-plugins-official` | 1.0.1 | Commande de revue de PR | Revue avant fusion | **INDISPENSABLE** (présent) |
| `security-guidance@claude-plugins-official` | 2.0.17 | Hooks d'alerte sur motifs dangereux + revue LLM des diffs et commits | Prières, RBAC, uploads | **INDISPENSABLE** (présent). Requiert Python 3.8+ sur le PATH |
| `typescript-lsp@claude-plugins-official` | 1.0.0 | Diagnostics TypeScript via LSP | Typage strict | **RECOMMANDÉ** (présent). ⚠️ Vérifier la compatibilité avec TypeScript 7 en Phase 1 |
| `claude-md-management@claude-plugins-official` | 1.0.0 | Audit et mise à jour de CLAUDE.md | Garder CLAUDE.md concis | **RECOMMANDÉ** (présent) |
| `github@claude-plugins-official` | fa4eb54397ee | MCP GitHub | PR, issues, CI | **RECOMMANDÉ** (présent) mais **en échec** : « Authorization header is badly formatted » → reconfigurer le jeton |

Des serveurs MCP `plugin:design:*` (Slack, Figma, Linear, Atlassian, Notion, Intercom) apparaissent aussi dans
`claude mcp list` ; ils proviennent d'un plugin « design » non listé dans `installed_plugins.json` (probablement synchronisé
depuis le compte). Non nécessaires au projet.

## Plugins candidats (existence vérifiée dans la marketplace officielle, non installés)
| Plugin | Source déclarée | Fonction | Utilité | Risques | Classement |
|---|---|---|---|---|---|
| `context7` | `./external_plugins/context7` → MCP HTTP `https://mcp.context7.com/mcp` | Documentation à jour des librairies | Next 16, Prisma 7, Better Auth, Tailwind 4 évoluent vite | Requêtes envoyées à un service tiers (Upstash) ; limite anonyme | **INDISPENSABLE** |
| `playwright` | `./external_plugins/playwright` → `npx @playwright/mcp@latest` | Pilotage navigateur | Tests visuels, a11y, parcours | **Déjà disponible** comme MCP utilisateur `playwright` → ne pas installer le plugin en doublon | **INUTILE** (doublon) |
| `superpowers` | `https://github.com/obra/superpowers.git` (sha `bb92a77`) | Brainstorming, TDD, debug systématique, sous-agents | Méthode de travail | Plugin tiers (non Anthropic), ajoute beaucoup de skills qui peuvent recouvrir les nôtres | **FACULTATIF** |
| `claude-code-setup` | `./plugins/claude-code-setup` | Recommandations d'automatisations (hooks, skills, MCP) | Ponctuel | Faible | **FACULTATIF** |
| `feature-dev` | `./plugins/feature-dev` | Agents exploration/architecture/revue | Recouvre nos agents | Redondance | **FACULTATIF** |
| `pr-review-toolkit` | `./plugins/pr-review-toolkit` | Agents de revue spécialisés (tests, erreurs, types) | Complète `code-review` | Redondance partielle | **RECOMMANDÉ** en Phase 3 |
| `commit-commands` | `./plugins/commit-commands` | Commandes commit/push/PR | Pratique | Inclut du push : à utiliser avec prudence | **FACULTATIF** |
| `prisma` | `https://github.com/prisma/claude-plugin.git` | MCP Prisma (Prisma Postgres, migrations) | Orienté Prisma Postgres (cloud) | Peut provisionner des bases distantes | **FACULTATIF** (pas de Prisma Postgres prévu) |
| `figma` | `https://github.com/figma/mcp-server-guide.git` | Lecture de maquettes | Si un designer produit des maquettes Figma | Compte Figma requis | **FACULTATIF** |
| `vercel` | `https://github.com/vercel/vercel-plugin.git` | Déploiement Vercel | Non retenu (VPS) | — | **INUTILE** |

## Commandes (à exécuter par l'utilisateur, après validation)
Format officiel de Claude Code : `/plugin install <nom>@<marketplace>`.
```text
/plugin install context7@claude-plugins-official
/plugin install pr-review-toolkit@claude-plugins-official      # Phase 3
```
Réparer le MCP GitHub : vérifier le jeton utilisé par le plugin `github` (variable d'environnement attendue par le
plugin, voir son README), puis `/mcp` pour reconnecter. ⚠️ Nom exact de la variable non vérifié pendant l'audit.
