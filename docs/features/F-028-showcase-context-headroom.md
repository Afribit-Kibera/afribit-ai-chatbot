# F-028 - Context headroom and incomplete-answer evaluation

**Status:** Built and tested offline; real-model rerun pending. **Date:** 28 October 2026. **Roadmap:** Mesh proof P4.

The first successful rented comparison completed its transport calls, but four responses ended after
seven tokens because prompt4089 + output7 filled context4096. Byte-size limits did not reserve output
headroom, and the evaluation counted a length finish as an ordinary success.

Add optional explicit full/compact prompt selection and a declared context window to the frozen
showcase plan. Preserve existing full-prompt defaults and prior artifacts. For native Ollama runs,
also check the configured runtime context. Before ledger opening or dispatch, estimate prompt demand
conservatively using UTF-8 content bytes plus fixed message/template allowances, then reserve the
entire requested output allowance. Reject oversize rather than silently dropping facts, safety text,
examples or user content. This is a deliberately conservative offline estimate, not model-tokenizer
measurement or proof a runtime will use every token as expected.

Allow the existing community compact prompt as an explicit experimental recipe. Record its selection,
context arithmetic and estimator version in manifests/previews/fingerprints. A declared window must
match native Ollama's configured context before execution. Hosted context capacity cannot be verified
from a provider setting here; no automatic claim about a hosted model's maximum context.

Keep streamed partial text and final metadata when finishReason is length/error, but fail that answer
and mark the blind-review entry incomplete. This prevents a technically successful truncated response
from qualifying a model. Prior trials retain their original transport-completion interpretation.

Acceptance: reject the old full/4096 recipe before dispatch; compact recipe passes its stated estimate
at a reviewed context; UTF-8/multiple messages/exact boundary/output reservation checked; invalid plan
values refused; mismatched runtime cannot dispatch; length finishes preserve evidence and fail review.
Every fixture, preview, read-only billing observation and failure has a trial record. No paid rerun,
new model/tokenizer dependency, fine-tuning, production prompt switch, or automatic rental allocation.

**Outcome:** 19 showcase checks, full repository tests, workspace typecheck and build pass. The
unchanged synthetic benchmark's full/4096 and full/8192 recipes refuse the conservative estimate;
compact/8192 passes with largest estimate4074 plus output300, leaving3818. These are estimated
admission units, not exact model token counts. A derived anonymous review pack retains the 16 original
answers and marks four incomplete without adding human scores. [Guide](../guides/showcase-context-headroom.md)
and [every trial/failure/billing observation](../evaluation/trials/2026-10-28-context-headroom.md).
