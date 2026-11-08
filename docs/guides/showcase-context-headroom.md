# Keep room for an answer in a model comparison

**Integrated follow-up:** [F-029](community-rental-live-run.md) applies this same estimator at the
native transport boundary in an explicit operator context scope, after the normal API assembles
retrieval/history/personal memory. Twenty-seven offline integration checks pass. Its live hook
requires context8192 worker evidence; no real8192 GPU run is implied. Unscoped deployments retain
their existing behavior. The estimator lives in the shared prompt layer; the showcase import remains
compatible. Stream interruption after a prefix is distinct from a reviewed fallback before output.

The 27 October rental exposed a faulty evaluation recipe: the full product prompt consumed 4089
of 4096 tokens for two code-switched cases, leaving seven output tokens. The transport completed,
but the answers did not. [F-028](../features/F-028-showcase-context-headroom.md) now checks headroom
before dispatch and fails length-limited answers. [Dated evidence](../evaluation/trials/2026-10-28-context-headroom.md).

## Freeze an explicit recipe

Showcase plans accept two optional fields:

```json
{
  "promptMode": "compact",
  "contextWindowTokens": 8192
}
```

`promptMode` selects the existing full or compact community-pack builder for the supplied-context
variant. The bare variant keeps its simple baseline prompt. Omitted mode retains the full builder.
Compact uses the pack's compact safety/style/identity text and retains all supplied passages and
the question. Selection is explicit: the runner never silently drops facts, few-shots, safety text,
history or user content to fit. This setting belongs to the showcase, not the production prompt mode.

The declared context must be an integer from 512 to 131072, larger than the requested output limit.
Native local-provider Ollama runs also use `LOCAL_LLM_NUM_CTX`, even when the plan omits the declaration.
A declared context must match that native runtime setting. Other transports use a declared window
as an operator assertion; this tool cannot verify a hosted model's context capacity. Without either
source, context evidence is explicitly null, not a pass or a capacity claim.

Before ledger creation or provider dispatch, each task checks:

```text
prompt estimate = UTF-8 bytes of message content + 64 per message + 256 template allowance
remaining estimate = context window - prompt estimate - maximum requested output tokens
```

A negative result refuses the entire prepared comparison before any task is sent. This intentionally
overestimates many ordinary text prompts. It is **not an exact tokenizer count or universal upper
bound**: model-specific templates, special-token handling and tokenization can differ. Do not apply
English characters-per-token heuristics to Sheng/Kiswahili and call them measurements. An exact
model/template tokenizer check and a real runtime rerun remain needed for qualification.

Previews and manifests retain estimator version, byte count, framing allowances, output reservation
and remaining estimate per task. Fingerprints include both context and completion protocol versions;
old ledgers cannot be silently reused under the changed evaluator. Keep their existing records.

## Preview without inference

From the repository root:

```powershell
pnpm --filter @afribit/api showcase:eval --plan ../../docs/examples/showcase-compact-context-plan.json
```

The [example](../examples/showcase-compact-context-plan.json) uses an unverified placeholder model and
the existing local-container hostname. It preserves current experiment allocations and makes eight
prepared tasks, zero model/account calls and no rental reservation. It is not a deployable rented
endpoint or a funded new rental. If native Ollama is configured for another window, preview refuses
the mismatch; align settings only for a reviewed experiment, without editing production defaults.

The old default full-prompt preview may now refuse a small configured native context. That refusal
is useful evidence; do not disable the guard or grow the runtime window without checking GPU fit.
Historical operator rental scripts still describe context4096 and earlier frozen recipes; they are
not updated/reallocated by this feature. No paid rerun was performed on 28 October.

On the frozen four-question synthetic benchmark, offline preparation found:

| Recipe | Largest prompt estimate | Output reservation | Minimum estimated room | Admission |
|---|---:|---:|---:|---|
| Full / 4096 | 22048 | 300 | -18252 | Refused |
| Full / 8192 | 22048 | 300 | -14156 | Refused |
| Compact / 8192 | 4074 | 300 | 3818 | Accepted by estimate |

These figures are admission estimates, not measured prompt-token counts. They do not prove that
full/8192 cannot work with an exact tokenizer, or that compact/8192 fits a particular GPU at four
concurrent contexts. Compact/8192 is a candidate for the next funded comparison; its accuracy,
natural Sheng, latency and device memory have not been measured on a real model in this pass.

## Incomplete answers stay incomplete

When a stream returns `finishReason: length`, the runner preserves its partial answer and usage,
sets failed status with `failureCode: truncated`, increments `truncated`, and marks its anonymous
review entry `complete: false`. CLI execution exits unsuccessful when any task fails. Billing and
dispatch reservations remain independent: an incomplete answer still used compute. Error finishes
also fail evaluation; human quality scores stay blank until a person reviews them.

Old artifacts retain their original transport-completion status. A newly derived
[anonymous review pack](../../output/review-completeness/9bc10378-39c1-467b-a2c1-8dc3b13fc279/blind-review.json)
combines the 16 rental answers, marks the four length finishes incomplete, shuffles them, and adds
no human scores. Its separate operator file retains source hashes/mapping. Share the review pack
only after local review; keep the mapping separate to preserve reviewer blinding.

Run `pnpm --filter @afribit/api test:showcase` for 19 localhost checks, including multibyte content,
exact boundary/output reservation, old-recipe rejection, runtime mismatch before ledger creation,
compact native-adapter settings/manifest evidence and incomplete-answer handling. Fixtures use no
model or GPU and cannot qualify language quality. The full repository suite also runs these checks.
