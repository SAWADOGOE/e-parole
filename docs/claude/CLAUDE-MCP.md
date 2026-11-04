# Serveurs MCP — audit

Audit du **2026-11-04** via `claude mcp list` et la session en cours. **Aucune configuration n'a été modifiée.**

## Présents
| Serveur | Type | Statut constaté | Utilité e-Parole |
|---|---|---|---|
| `playwright` | stdio `npx -y @playwright/mcp@latest` (utilisateur) | ✔ Connecté | Vérification visuelle, a11y, parcours E2E exploratoires. ⚠️ `@latest` non épinglé : préférer une version fixée |
| `plugin:github:github` | HTTP `https://api.githubcopilot.com/mcp/` | ✘ HTTP 400 « Authorization header is badly formatted » | PR/issues/CI dès qu'un remote existe |
| `plugin:pdf-viewer:pdf` | stdio | ✔ | Non nécessaire |
| `claude.ai Claude Docs`, `Gmail`, `Google Calendar`, `Google Drive` | HTTP (connecteurs du compte) | ✔ | Non nécessaires au code ; ne pas y envoyer de données du projet sans demande |
| `plugin:design:{slack,figma,linear,atlassian,notion,intercom}` | HTTP | Authentification requise | Figma éventuellement (maquettes) ; les autres non |
| `ide` | — | Connexion fermée | Intégration IDE, non bloquant |
| Claude in Chrome | extension | Disponible | Alternative à Playwright pour inspecter des pages |

## Recommandés
| MCP | Utilité | Configuration proposée | Sécurité | Statut |
|---|---|---|---|---|
| **Context7** | Docs à jour (Next 16, Prisma 7, Better Auth) | Via le plugin `context7` (MCP HTTP hébergé) | Les requêtes partent chez Upstash : n'y mettre aucun secret ni code sensible | À installer après validation |
| **Playwright** | Tests navigateur | Déjà présent ; épingler la version dans une config **projet** `.mcp.json` en Phase 1 | Accès navigateur local | Présent |
| **GitHub** | PR, CI | Réparer l'authentification du plugin existant | Jeton à portée minimale (repo e-parole uniquement), jamais dans le dépôt | À réparer |
| **PostgreSQL lecture seule** | Inspection du schéma et des données de **dev** | Serveur MCP Postgres maintenu (⚠️ le serveur de référence `@modelcontextprotocol/server-postgres` a été archivé ; choisir une alternative maintenue en Phase 1) avec un rôle `eparole_readonly` sur la base locale | **Jamais** connecté à la production ; rôle `SELECT` seul, sans accès aux tables `prayer_request`, `message`, `bible_note` | Phase 1, après validation |
| **Figma** | Maquettes | Plugin `figma` ou MCP `plugin:design:figma` existant | Compte Figma | Facultatif |

## Règles
- Aucune configuration MCP globale (`~/.claude.json`) modifiée sans demande.
- Configuration projet partagée dans `.mcp.json` (sans secrets ; secrets via variables d'environnement `${VAR}`).
- Aucune base de production connectée à un MCP.
