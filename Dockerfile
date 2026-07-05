FROM node:20-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

FROM deps AS build

COPY tsconfig.base.json ./
COPY backend ./backend
COPY frontend ./frontend
COPY packages/shared ./packages/shared

RUN npm run db:generate
RUN npm run build

FROM node:20-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL=file:/data/antre.db
ENV LLM_ERROR_LOG_DIR=/data/logs

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

# Run as the non-root "node" user (uid 1000) shipped by the base image.
# /data is a mounted volume: its host directory must be writable by uid 1000
# (see the cluster manifest for the hostPath ownership note).
RUN chmod +x ./scripts/docker-entrypoint.sh \
  && mkdir -p /data \
  && chown -R node:node /data /app

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["./scripts/docker-entrypoint.sh"]
