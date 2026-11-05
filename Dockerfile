# syntax=docker/dockerfile:1.7
# e-Parole — image multi-stage (docs/22-DOCKER-SETUP.md). Utilisateur non root, sortie Next.js standalone.

ARG NODE_IMAGE=node:22.23.4-alpine

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1 \
    CHECKPOINT_DISABLE=1
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /app

# --- Dépendances (couche mise en cache tant que le lockfile ne change pas)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# --- Build Next.js + client Prisma
FROM deps AS build
COPY . .
RUN pnpm exec prisma generate && pnpm build

# --- Worker pg-boss (même code, exécuté avec tsx)
FROM build AS worker
ENV NODE_ENV=production
USER node
CMD ["pnpm", "exec", "tsx", "src/worker.ts"]

# --- Application web
FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
