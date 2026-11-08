# Hosted compute, QVAC and a community's own AI

**27 October 2026.** This updates the showcase direction after Edmund clarified that stronger hosted
models and rented GPUs should take priority over additional laptop downloads. No fine-tuning is planned.
Actual provider attempts, failures and costs belong in the [hosted trial report](../evaluation/trials/2026-10-27-hosted-comparison.md).

## What we are proving

Afribit AI can be a useful product before Afribit trains or owns a foundation model. The initial product
combines an existing model, community-controlled knowledge, private account contexts, enforceable routing,
and an operated compute service. Call the result the Afribit system; identify the actual underlying model
and provider in technical evidence. Renting a GPU does not make its model Afribit-trained.

Separate four questions so one successful chat cannot be mistaken for a complete proof:

| Question | Suitable experiment | What it does not establish |
|---|---|---|
| Does a model answer well in Sheng, Kiswahili and English? | Hosted model comparison, same questions/settings, community reviewers | Affordable local hardware or provider confidentiality |
| Does approved community context improve answers? | Same model with/without context; then actual authorized retrieval | Weight training or account isolation merely from good answers |
| Can an affordable community node coordinate remote capacity? | Two accounts, local data, actual retrieval and remote routing, disconnect/reconnect | Offline access to a GPU outside the local network |
| What GPU is economical? | Same pinned model/quantization/context on two rented GPU types, one/four users | Better language competence from changing the GPU alone |

OpenRouter avoids downloading weights onto the laptop and is useful for model qualification. It gives us
provider-hosted inference; it does not give us a controlled experiment on a chosen GPU. RunPod lets us
control the serving stack and select hardware. Weights would be downloaded onto that rental, and startup,
download/loading, idle time and storage must count in its cost.

RunPod's read-only GraphQL query returned these lowest advertised single-GPU compute prices during this
session: RTX 4090 24 GB **$0.34/hour**, L40S 48 GB **$0.79/hour**, A100 PCIe 80 GB **$1.19/hour**. Each reported
low stock; RTX A6000 48 GB returned no price. These are catalog observations, not reserved capacity,
region-specific deployment quotes or all-in bills. No pod was created. See the retained snapshot and
[official GPU-query documentation](https://docs.runpod.io/sdks/graphql/manage-pods).

Start with one qualified open-weight model and a short rental; compare two GPU types only if useful
time remains within the shared $10 envelope. The same quantized model should fit both targets before
claiming a hardware comparison. Different models or quantizations are separate experiments. Record
weight/runtime digests, region, context size, concurrent requests, first-token time, tokens/second,
peak GPU memory, startup duration, errors and the final bill. More VRAM also permits larger contexts
and more concurrent work; fitting weights alone is insufficient.

## How QVAC overlaps and what we could reuse

QVAC is a meaningful technical relative and potential dependency. Its goals overlap with local and
distributed AI, and its ecosystem also includes applications. Our assessment is not that it supplies
only a model engine or cannot support communities. The question is which Afribit requirements it has
actually demonstrated for our deployment.

The [SDK](https://docs.qvac.tether.io/sdk/) offers JS/TS and Python clients controlling a worker, with
interfaces for generation, embeddings, RAG and other tasks. Its public
[source license](https://github.com/tetherto/qvac/blob/main/LICENSE) is Apache-2.0. This makes that
software reusable subject to its terms; weights, datasets and other components need their own license
checks. An SDK is a toolkit embedded in an application, not a free external GPU service.

[Fabric](https://qvac.tether.io/products/fabric) describes quantized-model execution and local LoRA,
using Vulkan/Metal backends and tiled operations to work within device limits. Those techniques reduce
resource demands. The device still needs model files, memory, storage, power and enough processing
capacity. Publisher phone-training examples do not establish frontier-model performance on a cheap box.

The [HTTP server](https://docs.qvac.tether.io/cli/http-server/connection/) exposes an OpenAI-compatible
interface with configured model aliases. This is a plausible integration point for our existing local
provider, pending compatibility/security tests. We can preserve the Afribit application while evaluating
QVAC as another runtime; no rewrite or installation is needed to run the current hosted comparison.

| Possible reusable component | Afribit work that still needs proof |
|---|---|
| Generation/embedding runtime and model lifecycle | Per-account authorization and private memory |
| Retrieval primitives | Authorized document selection before prompt construction |
| Local adaptation machinery | Community consent, dataset provenance and native-speaker evaluation |
| Model distribution and remote-device building blocks | Authenticated compute providers, budgets, scheduling and operational support |
| Existing local AI applications as references | Community governance, subscriptions, Mesh deployment and recovery procedures |

The earlier [QVAC assessment](2026-10-26-qvac-and-afribit-fit.md) records its native RPC transport's
documented trusted-network restrictions. That remains a qualification constraint; the RPC page could
not be refreshed through the web reader today. P2P model distribution does not establish private
remote inference, and none of today's reviewed sources proves an attested Afribit CPU/GPU TEE.

The [AfriSLM model card](https://huggingface.co/qvac/TranslatePsy-AfriSLM-0.8B) is relevant to African-
language translation research. Translation capability is a separate task from conversational Sheng
tutoring. We should evaluate it on that basis rather than treating its name as evidence of dialect fit.

## The harness and community language

The harness is the software around the model: identity, context selection, tools, routing, permissions,
output handling and evaluation. It is central to this proposition. It cannot reliably repair every gap
in a base model's language understanding or reasoning.

An initial community configuration should have distinct, versioned pieces:

1. **Private account memory:** the member's preferences and explicitly retained personal information,
   retrieved only when that authenticated account is authorized. A shared model process does not require
   shared conversation history. Scope caches, search indexes and logs as well as database rows.
2. **Approved community knowledge:** changing facts, service information and teaching material selected
   through RAG. Membership alone is not permission to read every institutional document.
3. **Community language guidance:** locally reviewed vocabulary, code-switching examples, preferred tone
   and corrections. Different communities can choose different packs while sharing one base model.
4. **Optional future adapter:** a separately versioned LoRA trained on consented, reviewed examples if
   held-out tests show that prompting and retrieval leave a meaningful gap. This is not scheduled now.

For example, two fictional communities can have different desk opening times and their own approved
ways of explaining a concept. The same model should answer each using the right pack, while neither
account can retrieve the other's private note. An absent trainer name should remain unknown. This
tests useful local adaptation without assuming all Sheng speakers want one fixed style.

RAG changes the information supplied at answer time; it does not change model weights. Few-shot language
examples guide behavior within the available context. Training changes weights or an adapter and needs
separate data permission. Approval to publish a knowledge card is not automatically permission to train
on it; a private chat must never silently become a training example. Human reviewers from each community
should score held-out language examples, factual correctness and safety before a model is promoted.

The most informative later comparison has three conditions: a common basic instruction; that instruction
plus a community language pack; then the same configuration plus authorized retrieved knowledge. Today's
existing runner has only bare versus full product prompt with supplied passages, so it cannot isolate
language prompting from RAG or prove that retrieval selected the right records.

## Privacy and the inexpensive community node

A modest community computer can hold encrypted data, accounts, retrieval indexes and routing software.
It may run a small local model if measured resources permit. It can also provide search/reviewed-card
answers without local generation. That is a valid offline fallback; full conversational capability needs
its own measurement.

The waiter can propose a route, but backend policy must decide which accounts/documents/providers are
allowed. Model text is not an authorization boundary. Likewise, a 4-of-7 admin approval protects what
the backend and key-release mechanism actually enforce; hiding an admin screen alone cannot govern
someone with unrestricted access to the host or decryption keys.

Local storage and remote generation have different privacy boundaries. If retrieved passages enter a
remote prompt, the executing endpoint sees those passages unless a separately verified confidential-
computing mechanism protects them. Sending only relevant approved excerpts is useful minimization,
but it is not proof that all community information stayed local. Personal or restricted context should
stay on permitted local routes until its remote-processing policy is explicitly satisfied.

Mesh can keep local services reachable without public internet. A rented GPU outside that Mesh still
needs backhaul connectivity. Tailscale provides connectivity and transport protection; it does not add
bandwidth during an outage or prevent the executing GPU host from seeing plaintext. Initially use
synthetic/public-approved prompts on ordinary rentals. Our remote-privacy and TEE claims remain unproved.

**Decision:** qualify stronger hosted models now, preserve the local data boundary, and measure a narrow
RunPod deployment next. Evaluate QVAC as a reusable local runtime after that comparison. Build and test
community packs and authorized retrieval before spending on fine-tuning.
