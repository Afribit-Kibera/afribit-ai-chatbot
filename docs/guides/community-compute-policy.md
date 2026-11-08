# Configure community compute safely

**Local implementation, 26 October 2026; not deployed.** Apply migration **024** after 020–023 with the
matching API release. Back up the database and follow the existing coordinated migration procedure.
The API now denies model/embedding calls for packs without an enabled compute policy. Approved-card
answers continue working. Configure every served pack before expecting generation after this release.

## Start with the local example

[compute-local-only.json](../examples/compute-local-only.json) is a complete first-policy request with no
paid routes and a zero monetary allowance. Edit model names and base URLs to match the deployment's
actual local chat and embedding configuration. `region: community` means collocated with the API host
under its configured on-machine rule, not an independently verified location. Owned hardware, power and
hourly rental expenses are not metered by this allowance.

Use a current administrator's authenticated request to the selected pack:

```text
GET /api/v1/admin/community/compute
Authorization: Bearer <administrator token>
x-pack: <installed pack id>

PUT /api/v1/admin/community/compute
Authorization: Bearer <administrator token>
x-pack: <installed pack id>
Content-Type: application/json
<contents of the edited example>
```

The GET result contains `enabled`, `version`, `policy` and current UTC-day `usage`. Version 0 means no
policy exists. PUT needs that exact `expectedVersion`; subsequent edits use the returned version.
Enablement is explicit. To stop new work, save `enabled: false` with the current policy/version.
Already admitted requests may finish. These are trusted administrator powers until P6 quorum governance.
There is no automatic live configuration, new admin screen or user-facing reset/refund action.

## What a route permits

Each route pins `kind` (`chat`/`embeddings`), provider (`local`/`openrouter`), effective model and full
normalized base URL. `LOCAL_LLM_MODEL` overrides must match the allowed model, not the profile's original
default. URLs cannot contain credentials, queries or fragments; remote endpoints require HTTPS, including
remote GPUs otherwise reached through an HTTP tunnel. Put TLS in front of those endpoints before allowing
them here. Local inference/embedding redirects and OpenRouter chat redirects are rejected.

`maxInputBytes` bounds the UTF-8 JSON context envelope (messages/schema or embedding inputs), not a
token count. `maxOutputTokens` is a rejection ceiling, not a request to truncate. The API also imposes
8,000 bytes per question, 128 KiB per envelope, 64 messages and 4,096 output tokens. Existing profile
limits still apply. If the final prompt exceeds policy, the chat uses an approved-card fallback rather
than drop history, community facts or safety instructions to squeeze it through.

For OpenRouter chat, supply approved upstream slugs, integer prompt/completion prices in **micro-USD per
million tokens**, positive `reservationMicrousd` and `billingBoundConfirmed: true`. One USD is 1,000,000
micro-USD; a price of USD 1 per million tokens is `1000000` in these price fields. This is a unit example,
not a current model quote. Obtain real prices and confirm the account/provider's billing terms before use.
The request pins `only`/`order`, disables upstream failover, requires parameter support and ZDR, and sends
price ceilings. Each app-level fallback is independently admitted against its own approved route.
These options were checked against [OpenRouter's provider-routing documentation](https://openrouter.ai/docs/guides/routing/provider-selection)
on 26 October 2026; no live conformance or billing test was run.

The validator requires the fixed reservation to cover a conservative quoted envelope: route input-byte
cap plus 16,384 token-equivalents of framing margin, and the route output ceiling, at the supplied rates.
This margin is an application assumption, not verified tokenizer/invoice evidence. Confirm it against
the intended workload and enforce an upstream key/account spending ceiling before paid evaluation.
Request price caps and ZDR still rely on the broker/provider honoring them; they do not hide text from
the endpoint operator or establish a TEE.

EU/US routes require `https://eu.openrouter.ai/api/v1` or `https://us.openrouter.ai/api/v1`, respectively,
under OpenRouter's documented Business/Enterprise regional offering. Verify account entitlement first.
`unrestricted` requests no regional guarantee. Remote local-provider GPU routes have no verified region
adapter and only support unrestricted policy. A Kenya-only claim is not inferred from a hostname or
tunnel. Hosted embeddings cannot be enabled in this release: they need a verified upstream/pricing
adapter. Set `EMBEDDING_PROVIDER=local` and permit the local embedding endpoint, or use lexical retrieval.

## Allowances, errors and cancellation

`dailyBudgetMicrousd` and `dailyAttemptLimit` apply per pack, on UTC calendar days. Each real attempt,
including waiter, chef, background label, embedding batch and fallback, reserves its configured full
allowance and one attempt slot atomically in PostgreSQL. Local work may reserve zero money but still
consumes a slot. Concurrent workers cannot oversubscribe that bucket. Reservations and counters survive
process restarts and policy edits; re-enabling a policy does not reset today's usage.

Reservations are never automatically refunded: successful, failed, timed-out, interrupted and cancelled
calls all retain their full allowance. Missing provider cost reports do not reopen capacity. A reported
cost above the reservation disables further dispatch and creates an overrun audit entry; inspect the
upstream bill and revise the bound before re-enabling. Settlement errors leave reservations charged.
Policy storage failures and stale policy versions deny dispatch before transport.

Gateway deadlines abort transport and bound the whole stream. Aborting HTTP cannot prove a remote
provider stopped work or billing. A partial stream ends as interrupted; it cannot start another paid
fallback. Direct card answers need neither a model reservation nor an embedding call.

This is an **application dispatch allowance**, not a vendor invoice or hourly-GPU cap. It does not cover
idle pods, storage, rental startup/download time, fees or out-of-band API-key use. The proposed first
showcase ceiling remains USD 10 overall; per-pack daily allowances do not enforce that cross-account,
cross-day total. Use an upstream account/key limit and a separate rental shutdown/budget mechanism
before any paid run. No such paid run or account change was performed here.

The API installs enforcement at startup. Trusted CLI/evaluation programs do not automatically install it;
they must call `enforceComputePolicies()` or use a separately reviewed evaluation budget controller.
Integrating that controller is required before P4 paid comparisons. The host administrator can always
bypass application code with provider credentials, so upstream limits remain necessary.

## Verify

`pnpm test` exercises policies/reservations against embedded PostgreSQL and real provider classes against
localhost HTTP fixtures, including direct SDK paths, stream cancellation, quota races and overrun stops.
The ledger stores route, bound, status and reported-cost metadata without prompts/credentials. No real
model, GPU or external service participates in those checks. Full Mesh/TEE, production PostgreSQL load,
actual regional residency, tokenizer/price validation and a real rental bill remain separate evidence.
