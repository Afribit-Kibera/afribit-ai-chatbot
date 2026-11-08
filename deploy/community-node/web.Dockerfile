# Builds the Afribit web app and serves it with Caddy (same origin as the API).
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter "@afribit/web..."
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
COPY docs/governance/privacy-notice-draft.md docs/governance/privacy-notice-draft.md
COPY apps/api/src/db/data/bitcoin_basics_manual.json apps/api/src/db/data/bitcoin_basics_manual.json
# Empty = call the API on the same origin (/api/...), which is how Caddy serves it.
ENV VITE_API_URL=""
# White-label: a pack folder name under packs/ (for example my-community). When set, the page title, the
# PWA manifest and the pre-rendered app page are branded with that pack's name before the build
# (apps/web/scripts/brand.mjs). Empty = Afribit's defaults. The in-app look comes from the API at run time.
ARG COMMUNITY_PACK=""
COPY packs packs
RUN if [ -n "$COMMUNITY_PACK" ]; then node apps/web/scripts/brand.mjs "packs/$COMMUNITY_PACK"; fi
RUN pnpm --filter @afribit/web build

FROM caddy:2-alpine
COPY deploy/community-node/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
