# Cloudflare pilot access status

Updated 8 November 2026, based on qualification performed on 6 November.
The8 November read-only recheck confirmed an active DNS token and the unchanged Vercel CNAME;
it made no mutations (`output/cloudflare-readonly-20261108.json`).

**DNS management passed. Public Proxmox ingress is deferred by the operator.** The new app remains
on the private Tailscale staging address; `ai.afribit.africa` still serves the existing Vercel origin.

| Area | Evidence | Status |
|---|---|---|
| Exact Afribit zone | Scoped token verified; DNS records listed | Passed |
| DNS writes | Disposable TXT created/read/updated/deleted;31 original records unchanged | Passed |
| Tunnel management | Requested read scope rejected, HTTP400/code1001 | Permission gap |
| Zero Trust organization and Access apps | Separate requested read scopes each rejected | Permission gap; configuration unknown |
| Settings audit | Read only: SSL full, HTTPS redirect off, minimum TLS1.0, TLS1.3 on, DNSSEC disabled | Hardening review pending; no settings changed |
| Public pilot HTTPS/PWA | Existing public HTTP200 is the old origin | Not qualified for the new app |

The shared-account membership grants zone access, not account Tunnel/Zero Trust authority.
Minting a token cannot increase that membership's authority.
[Cloudflare token creation](https://developers.cloudflare.com/fundamentals/api/how-to/create-via-api/).

When this work resumes, the account owner can create a dedicated Afribit tunnel or grant suitable
granular access. If the zone moves to an Afribit-owned account, create fresh tunnel credentials there.
The tunnel and DNS zone must be in the same account; do not reuse an unverified personal-account
tunnel. [DNS routing requirements](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/dns/),
[granular permissions](https://developers.cloudflare.com/cloudflare-one/networks/connectors/granular-permissions/).

The private operator report is `internal/cloudflare/README.md`; credential values are stored
separately and must never be published. Temporary discovery/audit credentials were revoked.
Keep management credentials off the app host. Protect only the dedicated connector credential there.

Before enabling public use, complete the [Proxmox pilot gates](proxmox-education-pilot.md), preserve
the exact current `ai` DNS record for rollback, and verify real-phone HTTPS, authorization, streaming
and PWA behavior. App membership is separate from optional Cloudflare Access controls. TLS at
Cloudflare does not provide host-proof or edge-proof encrypted source storage.
