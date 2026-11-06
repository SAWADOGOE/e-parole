# 22 — Docker et développement local

**Statut : implémenté en Phase 1** (`compose.yaml`, `Dockerfile`, `.dockerignore`, `.env.example`, `docker/postgres/init/`).

## Services (`compose.yaml`)
| Service | Image | Port hôte (dev) | Réseau | Volume | Healthcheck |
|---|---|---|---|---|---|
| `web` | build local (`Dockerfile`, cible `runner`) | `${WEB_PORT:-53000}` | `edge`, `internal` | — | `GET /api/health` |
| `worker` | même Dockerfile, cible `worker` (`tsx src/worker.ts`) | — | `internal` | — | — (⚠️ à ajouter : heartbeat) |
| `db` | `postgres:17.11-alpine` | `127.0.0.1:${DB_PORT:-55432}` (dev seulement) | `internal` | `eparole_pgdata` | `pg_isready` |
| `storage` | `chrislusf/seaweedfs:4.48` (`weed mini`) | `127.0.0.1:${S3_PORT:-58333}` | `internal` | `eparole_s3data` | HTTP S3 |
| `mail` | `axllent/mailpit` | UI `127.0.0.1:${MAIL_UI_PORT:-58025}`, SMTP `127.0.0.1:${SMTP_PORT:-51025}` | `internal` | — | HTTP UI |

**Convention de ports (décision de l'utilisateur)** : chaque port hôte est le port standard du service **précédé d'un 5**,
pour éviter les conflits avec d'autres projets locaux.

| Service | Port standard | Port e-Parole |
|---|---|---|
| Next.js | 3000 | 53000 |
| Next.js (E2E Playwright) | 3100 | 53100 |
| PostgreSQL | 5432 | 55432 |
| SeaweedFS S3 (dev) | 8333 | 58333 |
| Mailpit UI / SMTP | 8025 / 1025 | 58025 / 51025 |
| Redis (Phase 7) | 6379 | 56379 |

Tout nouveau service suit la même règle. Les ports restent surchargeables par variable d'environnement. À l'intérieur
du réseau Docker, les services gardent leurs ports standards (ex. `db:5432`).
En dev, Next.js tourne de préférence **hors Docker** (`pnpm dev`) pour la vitesse ; Docker fournit db, storage, mail.
Profil `full` pour tout lancer en conteneurs.

## Dockerfile (multi-stage, spécification)
1. `base` : `node:22-alpine`, `corepack enable`, utilisateur non root `node`.
2. `deps` : copie `package.json` + `pnpm-lock.yaml`, `pnpm install --frozen-lockfile`.
3. `build` : `prisma generate`, `pnpm build` (`output: "standalone"`), build du worker.
4. `runner` : copie `.next/standalone`, `.next/static`, `public`, `dist/worker.js` ; `USER node` ; `NODE_ENV=production` ;
   pas d'outils de build ; `HEALTHCHECK`.

Migrations : service ponctuel `migrate` (`prisma migrate deploy`) exécuté avant `web` (`depends_on: condition: service_completed_successfully`).

## `.env.example`
Référence : le fichier [`.env.example`](../.env.example) (aucune valeur réelle). Il distingue `DATABASE_URL`
(rôle applicatif `eparole_app`), `MIGRATION_DATABASE_URL` (propriétaire, migrations et seed) et `TEST_DATABASE_URL`
(base `eparole_test`). Générer un `.env` local avec `node scripts/dev/create-env.mjs`.

## `.dockerignore`
`node_modules`, `.next`, `.git`, `.env*` (sauf `.env.example`), `coverage`, `playwright-report`, `docs`, `.claude`.

## Premier démarrage (vérifié en Phase 1)
```bash
corepack prepare pnpm@11.28.9 --activate   # pnpm 12 non pris en charge par Corepack 0.34
pnpm install
node scripts/dev/create-env.mjs            # .env avec secrets aléatoires (jamais affichés)
docker compose up -d --wait db storage mail
pnpm db:deploy && pnpm db:seed             # SUPER_ADMIN local : voir SEED_SUPER_ADMIN_* dans .env
pnpm dev                                   # http://localhost:53000
pnpm worker                                # second terminal : envoi des emails (Mailpit : http://127.0.0.1:58025)
```
Utiliser `127.0.0.1` (et non `localhost`) dans les URL de services : les ports sont liés à l'IPv4 locale.

Rôles PostgreSQL : `eparole_owner` (migrations, seed) et `eparole_app` (application et worker, **sans SUPERUSER**,
sans UPDATE/DELETE sur `audit_log`). Le schéma `pgboss` appartient à `eparole_app`. La base `eparole_test` sert aux
tests d'intégration et E2E.

## Commandes
| Action | Commande |
|---|---|
| Démarrer l'infra de dev | `docker compose up -d db storage mail` |
| Tout démarrer | `docker compose --profile full up -d --build` |
| Arrêter | `docker compose down` (les volumes sont conservés) |
| Logs | `docker compose logs -f web worker` |
| Migrer | `pnpm db:migrate` (création, dev) · `pnpm db:deploy` (application) · `docker compose run --rm migrate` |
| Seed démo | `pnpm db:seed` |
| Importer la Bible (Phase 2) | `pnpm bible:import --source ebible --translation lsg --file <chemin>` |
| Tests | `pnpm test` · `pnpm test:integration` · `pnpm build && pnpm test:e2e` |
| Image web | `docker build --target runner -t eparole-web .` |

## Texte biblique (première installation)
Le fichier source n'est pas dans le dépôt. Sans import, `/bible` affiche un état vide. Procédure : [docs/bible/BIBLE-MODULE.md](bible/BIBLE-MODULE.md#import-contrôlé).
Commencer par `pnpm db:seed`, qui crée les 66 livres et la liste de références du verset du jour.

## Sauvegardes et restauration
- Dump : `docker compose exec db pg_dump -U eparole_owner -Fc eparole > backups/eparole-$(date +%F).dump`
- Restauration (base vide) : `docker compose exec -T db pg_restore -U eparole_owner -d eparole --clean --if-exists < backups/<fichier>.dump`
- Stockage objet : synchronisation S3 (`aws s3 sync` ou `rclone`) vers un bucket de sauvegarde. ⚠️ Non testé en Phase 1.
- En production : job quotidien chiffré, rétention selon [11](11-DATABASE-DESIGN.md#sauvegarde-restauration-rétention),
  test de restauration mensuel documenté.

## Stockage des images (Phase 3)
`S3_PUBLIC_ENDPOINT` est l'adresse du stockage vue par le navigateur (URL présignées d'envoi), par défaut `S3_ENDPOINT`.
En dev : `http://127.0.0.1:58333`. SeaweedFS accepte les requêtes CORS du navigateur par défaut. Le worker doit tourner
(`pnpm worker`) pour que les images envoyées deviennent visibles. Données de démonstration locales : `pnpm demo:social`.
