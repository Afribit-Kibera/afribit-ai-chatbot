# F-025 — Explicit verified HTTPS compatibility for rental control

**Status:** Built; 7 fixture checks pass, live stability unqualified · **Roadmap:** Mesh proof P4 · **Date:** 27 October 2026.

RunPod connectivity from this machine is intermittent. A live read using native Node HTTPS with TLS
1.2 reached REST v2 with a verified certificate while other probes timed out. This does not prove TLS
version is the underlying network cause. Add an explicit `https-tls12` transport to the existing GET/
DELETE watchdog adapter; keep the fetch default and do not retry/fall back automatically.

Use the canonical RunPod HTTPS origin (loopback HTTP only for fixtures), normal certificate and hostname
verification, TLS 1.2, a whole-request deadline, bounded response body and no redirects. Credentials
remain in memory/environment and never enter logs or saved response bodies. The adapter's existing
identity/storage/termination/absence checks still govern any cleanup operation. A transport change
does not grant permission to delete a different resource or claim billing reconciliation.

Acceptance: fixture requests preserve explicit authentication, TLS verification, method/path scope;
HTTP status and body handling are bounded; redirects never dispatch a second request; connection/body
errors, bad certificates, oversized bodies and deadlines reject safely. Existing rental tests pass.
Record one real read-only conformance check separately; no create/delete is part of that check.

No new package, global TLS override, certificate exception, DNS/VPN/firewall/account change or browser
authentication automation. Live pod creation, deletion conformance, independent supervision and final
bill remain separate gates. GraphQL introspection was denied and is not a reason to weaken service
security or infer an undocumented schema.

**Evidence:** [live follow-up and all trials](../evaluation/trials/2026-10-27-runpod-access-followup.md).
Native HTTPS reached a verified REST response; the implemented-client follow-up timed out. TLS version
is not an established cause/fix. Key/account validation succeeded through GraphQL; no pod was created
or deleted. Full tests, API typecheck and workspace build pass. Fetch remains the default.
