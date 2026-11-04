# 30 — Monitoring et observabilité

**Statut : spécification.** Mise en place progressive : minimale au pilote, complète en Phase 8.

## Pilote (coût ≈ 0)
| Besoin | Outil |
|---|---|
| Disponibilité | Sonde externe sur `/api/health` (Uptime Kuma auto-hébergé ou service gratuit) |
| Logs | `pino` JSON → `docker compose logs`, rotation `json-file` (max 50 Mo × 5) |
| Erreurs | Logs `level=error` avec `requestId` ; ⚠️ Sentry (auto-hébergé ou SaaS) à décider : attention aux PII envoyées |
| Ressources | `node_exporter` + alertes simples (disque > 80 %, RAM) |
| Sauvegardes | Alerte si le dump quotidien manque ou fait < 50 % de la taille précédente |

## Phase 8
Prometheus + Grafana (ou Grafana Cloud free tier), métriques applicatives (`prom-client`) : latence par route,
erreurs, jobs pg-boss en attente/échec, taille de la file de modération, connexions DB.

## Alertes prioritaires
1. `/api/health` en échec 3 fois de suite.
2. Taux d'erreur 5xx > 2 % sur 5 min.
3. Jobs `email.*` en échec > 10 en 15 min.
4. File de modération : dossier priorité 0 non assigné depuis 1 h.
5. Sauvegarde absente.

## Règles de journalisation
Jamais de contenu de prière, de message, de note biblique, de mot de passe, de token, d'email en clair.
Identifiants techniques uniquement (`userId`, `postId`). IP tronquées après 90 jours.
