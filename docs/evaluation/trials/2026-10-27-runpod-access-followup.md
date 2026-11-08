# RunPod access after browser confirmation — 27 October 2026

**Result:** the API key is valid and the account is funded. API access is **intermittent**, not fixed.
One GraphQL response reported **$12.8186071649 credit, zero existing pods and $0/hour spend**. Native
HTTPS also reached REST with certificate verification enabled. Later read attempts timed out. No pod,
key, account, network or payment setting was changed, and no model/rental spend occurred.

## Observations and all trials

Edmund confirmed the console opens in his browser. Read-only Windows inspection initially saw the
console loading shell; the active browser tab later changed, and no browser input was issued. No login,
password-manager interaction, form submission or third-party message occurred. Browser content outside
the task was not copied into project artifacts. UI observation is not proof of backend API availability.

| Trial | Outcome |
|---|---|
| [d2872e97](../../../output/trials/d2872e97-c858-4931-a87c-aae0b9485ccf.json) | REST reads timed out, but GraphQL returned HTTP 200: valid key, $12.8186071649 balance, zero pods, no ongoing spend, automatic payment disabled. Existing spend limit is not our $10 experiment cap |
| [45085b06](../../../output/trials/45085b06-2f1e-4b6d-87db-98a9cf1628cc.json) | Separate read-only GraphQL schema probe timed out; no mutation |
| [9234dcae](../../../output/trials/9234dcae-19f3-4284-8e3e-b091c92b23b7.json) | OS and Google public DNS returned the same IPv4 addresses. Console HEAD HTTP 200; unauthenticated API probe with TLS 1.2/HTTP1 HTTP 401. No credentials or system setting change |
| [e9f4875c](../../../output/trials/e9f4875c-9f3d-45e1-9f59-8246c3118137.json) | Curl comparison probes timed out; native Node HTTPS reached REST HTTP 200 with TLS 1.2 and verified certificate. Response envelope has `pagination`/`pods`. GraphQL HTTP 400 explicitly rejected introspection; no attempt to bypass that restriction |
| [06df5e9c](../../../output/trials/06df5e9c-a90f-4249-8391-016be54b20a8.json) | New explicit compatibility transport passes 7 localhost/mock tests; zero real account calls |
| [05ec0f44](../../../output/trials/05ec0f44-3ad3-44bc-8c50-a4fb9ca78449.json) | Real read-only check using the implemented transport timed out on its first request. Absent-pod read, repeated conformance and OpenAPI reads were not reached |
| [2e822743](../../../output/trials/2e822743-3ab7-4b17-a45b-721ccddb804c.json) | Explicit compatibility-mode watchdog preview validates; reports expired placeholder/unfunded example; zero account calls |
| [13f820fc](../../../output/trials/13f820fc-7bb0-49f6-bc7e-3407b15bc76d.json) | Full-suite compatibility tests pass 7/7; no real account calls |
| [a970fed1](../../../output/trials/a970fed1-3949-4948-8f85-0676aa4f8692.json) | Public address-family probes: auto selection reached verified TLS 1.2/HTTP 401 through IPv4 after another address timed out; forced IPv4 timed out and IPv6 lookup returned ENOENT. No reliable address-family fix established |

The full suite also retains the usual per-invocation records, including deliberate invalid CLI cases.
One initial documentation/skill read was truncated by output limits; required remaining guidance was
read separately before further UI work. All Windows inspection was read-only. No authentication or
security UI was automated.

The new optional `https-tls12` client uses canonical RunPod HTTPS, normal hostname/certificate
verification, a whole-request deadline, a 1 MiB response bound, no redirects and no automatic retry or
transport fallback. It is wired into the existing sanitized GET/DELETE adapter; fetch remains the
default. The feature is [F-025](../../features/F-025-runpod-https-compatibility.md).

**Interpretation:** successful TLS 1.2 requests suggested a compatibility hypothesis. Later failures,
including a TLS 1.2 probe, mean TLS version is not an established root cause or reliable fix. Current
credentials do not need replacement based on these results. Console reachability, account validation,
stable control-plane operation and verified resource cleanup are different findings.

## Validation and remaining gates

Seven tests cover authenticated GET/DELETE against localhost, response sanitization, URL/method/header
scope, redirect refusal, header/body deadlines, response bounds, non-success status/no retry, and
explicit TLS verification plus mocked certificate rejection. Actual certificate verification succeeded
in the earlier independent native HTTPS read; this is not live create/delete conformance.

`pnpm test`, API `pnpm --filter @afribit/api typecheck` and workspace `pnpm build` pass. Full suite
includes 7 new HTTPS, 12 telemetry, 9 combined harness, 94 PostgreSQL, 14 rental, 14 showcase, 6 discovery,
5 artifact, 14 GPU-gate and 77 web unit cases plus other API checks. No UI change or deployment.
API/shared source hash `ad3a09ad0934bc79a55bcf3f863849fcabb21a97981eb00f74ea0ad5ef8886da`, uncommitted
base `965d4c3`. No provider response body containing account identity/environment/credentials was saved.

Known session model charges remain **$0.00423240**. Prior request allowances **$1.505** plus **$2 held
aside** still share the original $10; the RunPod balance is separate account credit, not a new budget.
No rental was started. Before launching: verify stable read/control access, exact quote/model/runtime,
independent shutdown and real owned-resource deletion/absence behavior. TEE and language readiness are
still unproved. The next attempt should use the documented client mode explicitly and preserve every
earlier failure; do not describe it as an automatic or proven network fix.

Sources: [RunPod API reference](https://docs.runpod.io/api-reference-v2/pods/get-a-pod),
[GraphQL specification](https://graphql-spec.runpod.io/),
[Google's DNS JSON API](https://developers.google.com/speed/public-dns/docs/doh/json).
