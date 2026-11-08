# Home Proxmox education pilot

Status, 8 November 2026: **private staging; participant release pending**. The selected public
name is `ai.afribit.africa`. Its current public origin is still the existing Vercel deployment.
See [F-035](../features/F-035-community-learning-release.md) for scope and release checks.

Latest8 November reachability check: both Proxmox SSH paths and the private app HTTP connection
timed out. The deployment below is the recorded staged configuration; current availability is
unconfirmed. Restore reachability before repeating live-model/phone checks. No fresh model
request started during the [release follow-up](../evaluation/trials/2026-11-08-open-source-release.md).

## What is staged

Proxmox node `home`, dedicated LXC101 `private-ai`, Debian13,4 cores,12GiB RAM.
Deployment directory `/opt/afribit-pilot/releases/20261106-a`, Docker project `afribit-pilot`.
The pre-existing `/opt/private-ai` project and its model files are preserved. The six old
NVIDIA device references prevented guest startup; their original configuration is backed up at
`/root/afribit-101-before-pilot-20261106.conf` on the Proxmox host. A physical GTX980 exists,
but CUDA device nodes are unavailable. This pilot currently uses CPU inference.

Postgres, API, Ollama and the Open Notebook/SurrealDB source engine have no public ports.
Their Docker networks are internal. The source gateway shares the API's network namespace and
binds `127.0.0.1:5055`; its password is never delivered to browsers. Only Caddy joins the ingress
network. The web listener is **`100.125.232.77:4189` on the guest's Tailscale interface**,
reachable from the existing home Linux VM/tunnel host. It is not bound to the household LAN.

Unique runtime secrets are in `/opt/afribit-pilot/runtime.env`, mode0600. Private staging account
credentials are in `/opt/afribit-pilot/stage-accounts.json`, mode0600. Do not paste either file,
copy them into this repository, expose them through the app or use staging passwords for participants.
The three `.invalid` identities are synthetic operator tests, not actual human reviewers.

All26 migrations applied. The installed Kibera pack has61 source cards. Community membership is
required; anonymous library requests return401. Registration is invitation-only. The local compute
policy allows20 attempts/day, zero hosted-provider allowance, only cached stock `qwen3:8b` on the
internal model endpoint. No cloud keys or fine-tuning were enabled. This proves neither teaching
quality nor sufficient CPU capacity. The first full-prompt source question timed out. After fixing
compact prompting, the real-service smoke passed8 groups, including a source-grounded local answer
in179.2 seconds. That latency is unsuitable for comfortable community use. Evidence is in the
[trial report](../evaluation/trials/2026-11-06-community-learning-release.md).

## Cloudflare handoff: connect the selected public hostname

This is an operator-only staging origin until the remaining release checks pass. No participant
invitation should be issued solely because the hostname starts working.

**Deferred by the operator:** DNS token qualification succeeded, but shared-account Tunnel and
Zero Trust access was denied. The membership is limited to the Afribit zone. Existing tunnel and
Access configuration could not be inspected. See the [access report](cloudflare-pilot-access.md).
The following steps are a future handoff, not completed changes.

1. Use a **dedicated Afribit tunnel in the same Cloudflare account as afribit.africa**. The account
   owner must create it or grant suitable access; another option is moving the zone to Afribit's own
   account with a new tunnel and credentials. Do not assume the existing home connector belongs to
   that account. Preserve other application routes.
2. Add a published application/public-hostname route for **`ai.afribit.africa`**. Service type:
   **HTTP**. Service URL: **`100.125.232.77:4189`**. No extra path filter. Keep proxying enabled.
3. Inspect DNS first. If there is an exact `ai` record pointing to Vercel, record its type, target
   and proxy setting for rollback, then change only that exact record to this tunnel's generated
   CNAME target. If `ai` currently inherits a wildcard, add an exact record; **do not delete or
   change the wildcard, apex or other application records**. The tunnel hostname wizard can create
   the CNAME when there is no exact-record conflict.
4. Keep Cloudflare cache rules from caching `/api/*`, `/app*`, `/pilot*`, `/review*` or `/voice*`.
   The origin sends `Cache-Control: no-store` on those paths. Do not enable a Cache Everything rule.
5. Verify HTTPS, sign-in,401 for an anonymous library request, source import/read/delete, a streamed
   answer/Stop, account switching and the installable app from an actual phone. Confirm a source
   engine/database/model/admin port is not reachable through the new hostname.

The existing tunnel host successfully reached the private app with HTTP200. A zone-restricted DNS
token passed disposable TXT create/read/update/delete and preserved all31 original records. The
exact `ai` CNAME remains pointed to Vercel. No router, household uplink or tunnel route was changed.

Cloudflare terminates HTTPS and can inspect web traffic, including requests to view personal sources.
Tailscale encrypts the connection between the tunnel host and guest. Local-only **model processing**
does not mean end-to-end encrypted browser storage or a host-proof/edge-proof vault. The home server
operator can read plaintext. Passkeys, phone-held encryption and GPU TEEs are not enabled.

## Update, evidence and rollback

Use the dedicated compose file, not the old private-ai compose project:

```sh
cd /opt/afribit-pilot/releases/20261106-a
docker compose -p afribit-pilot --env-file /opt/afribit-pilot/runtime.env -f deploy/community-node/pilot.compose.yml ps
```

Build and smoke evidence lives at `/opt/afribit-pilot/evidence/`. The pre-migration Postgres dump
is `/opt/afribit-pilot/backups/before-migration-20261106.dump`. This is a **local, access-controlled
dump**, not proof of encrypted backups or a successful restore. A tested encrypted backup/restore,
retention policy, source-volume backup and startup ordering after Tailscale remain release gates.

The8 November clean-interface update recreates only `web`. Evidence:
`build-clean-web-20261108.log` and `clean-web-smoke-20261108.json` (HTTP200 app, anonymous library401,
new learning asset present, zero model calls). The prior web image is preserved as
`afribit-pilot-web:before-clean-ui-20261108`; its ID is in
`web-before-clean-ui-20261108.image`. To revert that UI without touching data:

```sh
docker image tag afribit-pilot-web:before-clean-ui-20261108 afribit-pilot-web:latest
docker compose -p afribit-pilot --env-file /opt/afribit-pilot/runtime.env -f deploy/community-node/pilot.compose.yml up -d --no-deps --no-build web
```

Run from the deployment directory above. Recheck the app and anonymous denial after rollback.

Before changing an active database, make a new timestamped backup and test restoration separately.
Keep image digests/config before updating. After API recreation, recreate `source_gateway` so it joins
the new API namespace. Restore its test credentials only for staging probes; do not rerun bootstrap
against an existing user database. `bootstrap-pilot.mjs` refuses that database rather than replacing users.

Rollback an ingress regression by restoring the recorded exact `ai` DNS target and disabling only
the new hostname route. For an app regression, restore the previous app image/config. Do not run
`down -v`, delete model weights, drop the database or overwrite the existing `/opt/private-ai` stack.

Before inviting adults: review the Bitcoin101 small-step curriculum and Sheng wording with actual
community reviewers, measure source-grounding/latency on the intended model, finish the privacy notice
and deletion/backup procedures, and test public HTTPS/PWA with real account switching. Published
synthetic smoke chapters are withdrawn, never presented as pilot education material.
