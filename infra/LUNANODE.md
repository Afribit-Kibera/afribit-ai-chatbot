# Deployed on Insats' Lunanode server

`apps/api` is live at `https://afribit-api.insats.org`, deployed 2026-09-24
onto Insats' existing `insats-prod` LunaNode VM (a separate, unrelated
business's shared infrastructure — see the naming/isolation notes below
before assuming anything about this box). This file used to be a
pre-deploy checklist; it now records what's actually running, so treat it
as the source of truth for this deployment, not a plan.

## 1. Base server

- [x] `insats-prod`, Ubuntu 24.04, LunaNode Toronto. Resized `m.2` -> `m.4`
      (2GB -> 4GB RAM, 1 -> 2 vCPU, 20GB -> 35GB storage) on 2026-09-24
      specifically to give this deploy real headroom without risking
      Insats' own live services, which already run on this box.
- [x] Non-root deploy access: SSH key auth only, via the `ubuntu` user with
      passwordless sudo (Insats' existing convention on this VM, not
      something set up for this project specifically).
- [x] Firewall: only 22/80/443 are open (UFW, already configured for
      Insats). Postgres/Redis are not exposed — see below.

**Important — this is not a dedicated Afribit AI server.** `insats-prod`
also runs Insats' own production services (`insats-engine`,
`insats-web-network`, `insats-index`, `insats-intelligence`, Caddy,
PostgreSQL) for a completely separate business. This deploy is isolated at
the container level (own Docker network, own Postgres/Redis, own system
user, memory-capped) specifically so it can't affect that traffic, but it
is **not** on its own VM. Full reasoning and verification:
`G:\My Drive\workspaces\insats\docs\44-afribit-ai-colocation-and-vm-resize-2026-09-24.md`
(outside this repo, in the Insats ops workspace).

## 2. Runtime

- [x] Docker `29.8.1` / Compose `v5.5.1`, installed on `insats-prod` for
      this deploy (wasn't there before).
- [x] Caddy (already running for Insats) also terminates TLS for
      `afribit-api.insats.org` — new site block, `security_common` header
      snippet shared with `engine.insats.org`, `reverse_proxy` to
      `127.0.0.1:3001`.
- [x] Containerized — no systemd unit/pm2 needed; `docker compose` with
      `restart: unless-stopped` handles process supervision.

Dedicated system user `afribit-ai` (no login shell) owns
`/srv/afribit-ai`. Releases are extracted to
`/srv/afribit-ai/releases/<timestamp>` and symlinked at
`/srv/afribit-ai/current`, mirroring Insats' own release/rollback
convention on this same box.

`apps/api/Dockerfile` (in this repo) is a multi-stage pnpm-workspace build
scoped to `@afribit/api` and its type-only `@afribit/shared` dependency —
it never touches `apps/web`. Built and tested locally (`docker build` +
full migrate/seed/promote/health cycle against local Postgres/Redis
containers) before ever being built on the server, which caught two real
bugs (the runtime image was initially missing `apps/api/config/` and the
two manual JSON data files `seedCommunityManuals.ts` reads by relative
path) that a typecheck-only CI job would not have caught.

## 3. Data

- [x] `afribit-postgres` (`pgvector/pgvector:pg16`) running as its own
      container, own named Docker volume (`afribit_pgdata`), own network
      (`afribit-net`) — **not** the `insats` database, no shared instance,
      no shared credentials with anything Insats owns. No published port;
      only reachable from `afribit-api` over the internal Docker network.
- [x] All 9 migrations applied (`001_init.sql` through `009_auth.sql`).
- [x] Both community manuals seeded and promoted: 62 `knowledge_entries`
      -> `published`, 271 `language_entries` -> `approved`
      (`allowed_for_training` correctly left `false`).
- [x] Embeddings backfilled (62/62) for semantic retrieval.
- [ ] **No automated backup yet.** This is the biggest real gap versus a
      "real" production database — `afribit_pgdata` has no scheduled
      `pg_dump`/snapshot today. Do this before treating real user data as
      safe.

## 4. Secrets

- [x] `JWT_SECRET`, the Postgres password, and the VAPID keypair were all
      generated fresh on the server itself (`openssl rand -hex`, and the
      already-built image's own `web-push` dependency) — none reused from
      any Insats credential.
- [x] `OPENROUTER_API_KEY` is the same key already validated through this
      session's live eval work; transferred to the server as an isolated
      one-line file over `scp` and deleted immediately after use, never
      printed to a terminal or chat transcript.
- [x] Stored at `/etc/afribit-ai/api.env` (`root:afribit-ai`, mode `640`)
      and `/etc/afribit-ai/postgres.env` (`root:root`, mode `600`) —
      outside the release directory, so a redeploy doesn't touch them.

## 5. Deploy flow (as actually done, 2026-09-24)

1. `docker build -f apps/api/Dockerfile -t afribit-api:test .` locally;
   full local smoke test (Postgres + Redis containers, migrate, seed,
   promote, `/health`) before shipping anything.
2. `tar` a release (excludes `apps/web`, `node_modules`, `.git`, `docs`,
   `.docx` sources) -> `scp` to `insats-prod` -> extract to
   `/srv/afribit-ai/releases/<timestamp>` -> symlink `current`.
3. `docker build` the same Dockerfile on the server (matches Insats' own
   convention of building from source on the target host rather than
   shipping a saved image).
4. `docker compose up -d` (compose file lives at
   `/srv/afribit-ai/docker-compose.yml`, stable across releases).
5. `docker exec afribit-api node dist/db/migrate.js` /
   `seedCommunityManuals.js` / `promoteCommunityManuals.js` /
   `embedBackfill.js`.
6. Cloudflare DNS `A afribit-api.insats.org -> 172.81.179.3` (DNS-only, not
   proxied — matches `pay.insats.org`'s pattern).
7. New Caddy site block, validated with `caddy validate` before installing,
   `systemctl reload caddy` (not restart), then verified all of Insats'
   pre-existing public endpoints were unaffected.
8. Two real end-to-end chat requests over public HTTPS, not just a health
   check, before calling this done.

**apps/web is not part of this deploy.** It still targets Vercel — see the
main [README's Deploying section](../README.md#deploying).

## 6. Observability

- [x] API logs (pino, structured JSON) via `docker logs afribit-api`.
- [x] `/health` confirmed working both internally and over public HTTPS.
- [ ] No uptime/alerting wired up yet, and no log shipping beyond
      `docker logs` — still a real gap for a production service.

## Redeploying

There's no CI/CD wired to this server yet — a new release means repeating
step 1-5 above by hand (build locally, test locally, tar, scp, extract,
rebuild the image on the server, `docker compose up -d --build`, re-run any
new migrations). Automating this is a reasonable next step once this
deploy has been live for a while without incident.
