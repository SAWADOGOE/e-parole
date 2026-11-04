# 22 — Docker et développement local

**Statut : spécification.** Aucun fichier Docker n'est créé en Phase 0 et aucun service n'a été lancé.

## Services (`compose.yaml`)
| Service | Image | Port hôte (dev) | Réseau | Volume | Healthcheck |
|---|---|---|---|---|---|
| `web` | build local (`Dockerfile`, cible `runner`) | `${WEB_PORT:-3410}` | `edge`, `internal` | — | `GET /api/health` |
| `worker` | même image, `CMD node dist/worker.js` | — | `internal` | — | heartbeat pg-boss |
| `db` | `postgres:17-alpine` | `127.0.0.1:${DB_PORT:-55432}` (dev seulement) | `internal` | `eparole_pgdata` | `pg_isready` |
| `storage` | `minio/minio` | `127.0.0.1:${S3_PORT:-59000}`, console `59001` | `internal` | `eparole_s3data` | `mc ready local` |
| `mail` | `axllent/mailpit` | UI `127.0.0.1:${MAIL_UI_PORT:-58025}`, SMTP `127.0.0.1:${SMTP_PORT:-51025}` | `internal` | — | HTTP UI |

Ports hors des plages usuelles (3000, 5432, 9000, 8025) pour éviter les conflits avec d'autres projets locaux.
En dev, Next.js tourne de préférence **hors Docker** (`pnpm dev`) pour la vitesse ; Docker fournit db, storage, mail.
Profil `full` pour tout lancer en conteneurs.

## Dockerfile (multi-stage, spécification)
1. `base` : `node:22-alpine`, `corepack enable`, utilisateur non root `node`.
2. `deps` : copie `package.json` + `pnpm-lock.yaml`, `pnpm install --frozen-lockfile`.
3. `build` : `prisma generate`, `pnpm build` (`output: "standalone"`), build du worker.
4. `runner` : copie `.next/standalone`, `.next/static`, `public`, `dist/worker.js` ; `USER node` ; `NODE_ENV=production` ;
   pas d'outils de build ; `HEALTHCHECK`.

Migrations : service ponctuel `migrate` (`prisma migrate deploy`) exécuté avant `web` (`depends_on: condition: service_completed_successfully`).

## `.env.example` (clés prévues, sans valeurs réelles)
```dotenv
APP_URL=http://localhost:3410
DATABASE_URL=postgresql://eparole:CHANGE_ME@localhost:55432/eparole
BETTER_AUTH_SECRET=CHANGE_ME_32_BYTES_MIN
BETTER_AUTH_URL=http://localhost:3410
S3_ENDPOINT=http://localhost:59000
S3_REGION=us-east-1
S3_BUCKET_PUBLIC=eparole-public
S3_BUCKET_PRIVATE=eparole-private
S3_ACCESS_KEY_ID=CHANGE_ME
S3_SECRET_ACCESS_KEY=CHANGE_ME
SMTP_HOST=localhost
SMTP_PORT=51025
SMTP_FROM="e-Parole <no-reply@eparole.local>"
LOG_LEVEL=info
```

## `.dockerignore`
`node_modules`, `.next`, `.git`, `.env*` (sauf `.env.example`), `coverage`, `playwright-report`, `docs`, `.claude`.

## Commandes prévues (Phase 1)
| Action | Commande |
|---|---|
| Démarrer l'infra de dev | `docker compose up -d db storage mail` |
| Tout démarrer | `docker compose --profile full up -d --build` |
| Arrêter | `docker compose down` (les volumes sont conservés) |
| Logs | `docker compose logs -f web worker` |
| Migrer | `pnpm db:migrate` (dev) · `docker compose run --rm migrate` |
| Seed démo | `pnpm db:seed` |
| Importer la Bible | `pnpm bible:import --source ebible --translation lsg --file <chemin>` |
| Tests | `pnpm test` · `pnpm test:integration` · `pnpm test:e2e` |

## Sauvegardes et restauration
- Dump : `docker compose exec db pg_dump -U eparole -Fc eparole > backups/eparole-$(date +%F).dump`
- Restauration (base vide) : `docker compose exec -T db pg_restore -U eparole -d eparole --clean --if-exists < backups/<fichier>.dump`
- Stockage objet : `mc mirror` vers un bucket de sauvegarde.
- En production : job quotidien chiffré, rétention selon [11](11-DATABASE-DESIGN.md#sauvegarde-restauration-rétention),
  test de restauration mensuel documenté.
