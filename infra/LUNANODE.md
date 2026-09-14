# Deploying to the Insats Lunanode server

Notes for standing up Afribit AI on the Insats Lunanode VPS. Fill in specifics
(hostname, IP, sizing) once the instance is provisioned — this is the checklist
to work from, not a finished runbook.

## 1. Base server

- [ ] Ubuntu LTS (22.04/24.04) instance sized for: Postgres + pgvector, Redis, the API process, and the built web PWA served as static files (or via Nginx).
- [ ] Non-root deploy user with SSH key auth only (disable password auth).
- [ ] Firewall: allow 22 (SSH, restricted if possible), 80/443 (HTTP/HTTPS) only. Postgres/Redis ports stay internal — never exposed publicly.
- [ ] `ufw` or provider firewall configured before anything else goes live.

## 2. Runtime

- [ ] Docker + Docker Compose (or native Node 22+ / Postgres 16 / Redis 7 if not containerizing).
- [ ] Reverse proxy (Nginx or Caddy) terminating TLS (Let's Encrypt) in front of the API and the web build.
- [ ] Node process manager (systemd unit or pm2) for `apps/api` if not containerized.

## 3. Data

- [ ] Run `infra/docker-compose.yml` (or equivalent managed Postgres) with `pgvector` extension available.
- [ ] Run `pnpm db:migrate` against the production database before first deploy.
- [ ] Automated daily Postgres backups (PRD §36) — pg_dump to object storage at minimum.

## 4. Secrets

- [ ] `OPENROUTER_API_KEY` set as a server-side environment variable only — never shipped to the browser build (PRD §36).
- [ ] `.env` (or systemd `EnvironmentFile`) not committed to git, permissions restricted to the deploy user.
- [ ] Separate `.env` per environment (dev/staging/production) — PRD §36 environment separation.

## 5. Deploy flow (initial, pre-CI)

1. Build web: `pnpm --filter @afribit/web build` → serve `apps/web/dist` via Nginx.
2. Build api: `pnpm --filter @afribit/api build` → run `node apps/api/dist/server.js` under systemd/pm2, or containerize.
3. Point Nginx: `/` → web build, `/api` → API process (or run API on a subdomain, e.g. `api.afribit.chat`).

## 6. Observability

- [ ] Ship API logs (pino, already structured JSON) somewhere durable — even a rotated file + `journalctl` is a start; a real log sink comes later.
- [ ] `/health` and `/health/providers` wired into an uptime check.

This file intentionally stays a checklist until the Lunanode instance details
(hostname, sizing, chosen reverse proxy) are known — update it as those
decisions get made rather than guessing them here.
