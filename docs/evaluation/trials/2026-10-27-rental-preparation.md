# Rental preparation: network isolation and telemetry — 27 October 2026

**Result:** RunPod connections still time out from this machine. No rental was started. Independent
progress: F-024's portable telemetry helper is built and passes **12 fixture tests**, with zero actual
GPU calls. Known session model charges remain **$0.00423240**; this pass spent **$0**. Existing request
allowances ($1.505) and held-aside reserve ($2) remain within the original $10 envelope.

## Every new trial

| Trial | Purpose and outcome |
|---|---|
| [a10f552f](../../../output/trials/a10f552f-7941-4ef0-8b42-d266287a1627.json) | Fresh authenticated read-only REST v2 organization/Pods and GraphQL readiness; connection timeouts before HTTP response, no mutations |
| [6b3fb7c2](../../../output/trials/6b3fb7c2-55ad-4a3c-a896-55cb64100549.json) | Public network isolation: GitHub HTTP 200 in 311 ms; OpenRouter HTTP 200 in 591 ms; RunPod default and both resolved IPv4 addresses timed out around 4 seconds. No account credentials used |
| [20e7100d](../../../output/trials/20e7100d-5d47-4002-a271-516ff589c2fa.json) | Read-only request to the provider's documented legacy `https://rest.runpod.io/v1/pods` also timed out. No HTTP/auth result, pod mutation or fallback lifecycle adapter |
| [ae0e6e09](../../../output/trials/ae0e6e09-f06c-4dc1-8ce2-239262c606e0.json) | Initial telemetry fixture suite: 11/11 pass, zero GPU/account calls |
| [1edbed19](../../../output/trials/1edbed19-3fab-4004-90e4-99ca4020fcd2.json) | Full-suite telemetry run: 11/11 pass, zero GPU/account calls |
| [142b4414](../../../output/trials/142b4414-3d80-479e-8c9d-c6c7fbe52807.json) | Final targeted telemetry suite: 12/12 pass after adding explicit unexpected-failure finalization coverage |

The full suite also retains its normal per-invocation showcase/rental/discovery/artifact trial records,
including deliberate rejected cases. Combined community API trial
[ab4e5f56](../../../output/trials/ab4e5f56-e9f1-4851-9295-fa63b8343d3a.json) passes 9/9 locally, no hosted calls.
No earlier failed record, ledger, allowance or billing observation was erased/reset.

## Network findings

The [engineering debug skill](C:/Users/edmun/.codex/plugins/cache/claude-cowork/engineering/1.2.0/skills/debug/SKILL.md)
was used to reproduce/isolate the connection failure. DNS resolves RunPod to public IPv4 addresses;
both fail connection tests while unrelated public services respond. Explicit HTTP(S)/ALL proxy
environment variables are absent. This narrows the symptom to the tested RunPod connection paths,
not general outbound internet failure. The underlying network/provider cause remains unknown.
No HTTP response means credentials have not been accepted or rejected by these attempts.

Official [v2 lifecycle docs](https://docs.runpod.io/api-reference-v2/pods/get-a-pod),
[creation docs](https://docs.runpod.io/api-reference-v2/pods/create-a-pod),
[v1 migration guide](https://docs.runpod.io/api-reference-v2/migrate-from-v1) and
[legacy list endpoint](https://docs.runpod.io/api-reference/pods/GET/pods) were reviewed. The migration
guide documents the legacy host and its 15 November 2026 retirement; the one read-only diagnostic does
not adopt it as a production dependency. No undocumented endpoint or TLS-verification bypass was used.

An optional question about whether the console opens in the user's browser was sent; no answer was
needed for offline work. No VPN, firewall, DNS, proxy, account or payment setting was changed. Read-only
preflight must succeed before a real lifecycle/cleanup experiment can start.

## Telemetry component evidence

[F-024 specification](../../features/F-024-rented-gpu-telemetry.md),
[guide](../../guides/rented-gpu-telemetry.md),
[final fixture summary](../../../output/gpu-telemetry/142b4414-3d80-479e-8c9d-c6c7fbe52807/summary.json).

The Python standard-library helper runs on the rented host, not on the laptop for these tests. It
invokes `nvidia-smi` without a shell; bounds query time/duration/sample count; retains partial records;
refuses old output directories/stale markers; distinguishes missing measurements from zero; and
reports sampled per-device VRAM/utilization/power maxima. A completion marker ends sampling, not
billing. Sampled activity is not proof of full model GPU residency or an attested TEE.

The initial and full-suite runs each passed 11 tests. Final review added an unexpected-adapter-error
case so a partial run cannot finalize as successful after that exception; final targeted run passes
12. No hardware, model or API calls occurred in any telemetry fixture. The preview path is exercised
inside the fixture suite and writes its own UUID artifact in a temporary directory.

Validation: full `pnpm test`, workspace `pnpm typecheck` and `pnpm build` pass. The final Python-only
failure-finalization refinement was verified by the 12-test targeted rerun; TypeScript/API production
behavior did not change after the broader checks. Python **3.12.10**, no pip dependencies. API/shared
source hash `63542ff9ec98d62e3e1de3eab517124a83f12af2329e793149c915e9ce7d2f9c`, uncommitted base
`965d4c3`. Separate helper/test hash:
`d314121720ef62b260ad6ad51f3112fabe82dfd51e9331f1b87aa9c017c3cd32`.

## Remaining P4 exit evidence

Live RunPod control access, exact deployable quote, pinned serving recipe/artifacts, independently
verified cleanup, actual GPU measurements and final bill remain open. No rental or hardware success
is claimed from fixture results. The existing model's clock/daypart errors remain pending community
language review. Training, real private data, Mesh and TEE work have not been introduced.
