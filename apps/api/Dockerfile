# Multi-package pnpm workspace build. Only @afribit/api and its workspace
# dependency (@afribit/shared, type-only at runtime) are installed/built --
# apps/web is never touched, so this image stays scoped to the API.
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter "@afribit/api..."

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @afribit/api build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter "@afribit/api..." --prod
COPY --from=build /app/apps/api/dist apps/api/dist
COPY apps/api/config apps/api/config
# seedCommunityManuals.ts resolves these relative to its own compiled
# location (apps/api/dist/db/data) at runtime -- tsc doesn't copy non-.ts
# assets, so they're placed manually to match.
COPY apps/api/src/db/data/bitcoin_basics_manual.json apps/api/dist/db/data/bitcoin_basics_manual.json
COPY apps/api/src/db/data/communication_skills_manual.json apps/api/dist/db/data/communication_skills_manual.json
# migrate.ts walks up from its compiled location to <repo root>/db/migrations.
COPY db/migrations db/migrations

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/server.js"]
