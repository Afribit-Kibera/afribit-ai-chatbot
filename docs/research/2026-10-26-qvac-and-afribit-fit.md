# QVAC and Afribit: reusable compute components, separate community responsibilities

**Reviewed:** 26 October 2026. **Evidence:** publisher documentation/model cards and public source.
No QVAC runtime installed, weights downloaded, inference/training performed or TEE verified. Publisher
benchmarks are not Afribit measurements. Public metadata trials are recorded separately when run.

**27 October follow-up:** [hosted compute and the community harness](2026-10-27-hosted-compute-and-community-harness.md)
expands the SDK/hardware/language-pack distinction and moves the next step to hosted qualification and
rented GPU measurements. [Actual OpenRouter trials](../evaluation/trials/2026-10-27-hosted-comparison.md)
have now run; QVAC itself has still not been installed or benchmarked.

## Assessment

QVAC is worth evaluating as an optional local execution layer. It overlaps with Afribit's aim of using
ordinary devices and avoiding mandatory hosted inference. Afribit's proposed service still needs scoped
accounts, personal memory permissions, approved shared knowledge, community operations, trusted remote
capacity and Mesh deployment. Those are not established for Afribit merely by installing another SDK.
The sensible next step is qualification, not replacing the current engine or buying GPUs.

QVAC's [SDK introduction](https://docs.qvac.tether.io/sdk/) documents a common JS/TS/Python interface for
local generation, embeddings, RAG and LoRA, with desktop/mobile runtime options. Its public
[source repository](https://github.com/tetherto/qvac) also exposes an OpenAI-compatible HTTP server. The
repository's [license](https://github.com/tetherto/qvac/blob/main/LICENSE) is Apache-2.0. Runtime software,
model weights and training data remain separate artifacts with separate terms.

| Responsibility | Possible QVAC contribution | Afribit responsibility / proof still required |
|---|---|---|
| Local answering | Runtime/model server | Authorized retrieval, account isolation, retention and reviewed fallback |
| Smaller devices | Multiple hardware backends and model formats | Actual affordable-device RAM, speed, power and concurrent-user measurements |
| Community adaptation | Local LoRA machinery | Separate training consent, licensed examples, held-out comparison and deletion policy |
| Heavy requests | Remote/server runtime building block | Approved providers, permission/region/budget checks, health, authentication and host trust |
| Community sovereignty | Reusable open software | Backend quorum controls, community roles, audits and operational governance |
| Sustainable service | No mandatory per-token SDK charge | Real hosting, electricity, connectivity, support and community subscription economics |

The last column describes our engineering interpretation and roadmap, not claims that QVAC cannot
implement these things. No partnership or endorsement is assumed.

## Three different meanings of decentralized

1. **Distribute model files between peers.** QVAC's
   [blind-relay guide](https://docs.qvac.tether.io/sdk/p2p-capabilities/blind-relays/) describes model
   downloads through peers/relays and NAT traversal. Downloading weights and processing prompts are
   different activities; this does not establish confidential remote execution.
2. **Use another machine's devices.** The current
   [RPC guide](https://docs.qvac.tether.io/sdk/p2p-capabilities/rpc-servers/) supports discovering native
   devices and splitting model work across endpoints, but says this RPC transport has neither encryption
   nor authentication and belongs on trusted private networks. A discovery topic is not peer identity.
   This is a concrete security constraint, not something to infer from the local-AI homepage.
3. **Protect against the executing host.** None of the reviewed pages provided evidence of an Afribit-
   compatible attested CPU/GPU TEE or encrypted workload channel bound to attestation. Treat that as
   unproven. An encrypted tunnel can protect transport while the executing machine still processes data;
   P2P naming and layer splitting do not establish host confidentiality. A measured prototype/security
   review is needed before any such privacy claim.

Our preferred first integration is the
[documented HTTP server](https://docs.qvac.tether.io/cli/http-server/connection/), whose requested model
name is a configured server alias. Afribit's existing local OpenAI adapter is a plausible connection
point, but this has not been exercised with QVAC. Keep it loopback or behind a real authenticated gate;
a compatibility API key placeholder is not authorization. Test cancellation, model aliasing, streaming,
embedding support, context bounds and egress before accepting it. Leave the native RPC route out of a
public compute pool. Our existing local-only policy must remain in force regardless of runtime choice.

## Which Hugging Face artifacts matter

| Artifact | What the publisher says | Afribit decision now |
|---|---|---|
| [TranslatePsy-AfriSLM-0.8B](https://huggingface.co/qvac/TranslatePsy-AfriSLM-0.8B) | A conversational translation specialist covering English and 19 African languages, including Swahili | Translation hypothesis; no demonstrated Sheng tutoring quality |
| [0.8B Q4 GGUF](https://huggingface.co/qvac/TranslatePsy-AfriSLM-0.8B-Q4-GGUF) and [2B Q4 GGUF](https://huggingface.co/qvac/TranslatePsy-AfriSLM-2B-Q4-GGUF) | Quantized local-inference variants | Inspect exact revision/file/hash, then separately benchmark; a smaller weight file is not measured runtime RAM |
| [Genesis III combined 1.7B](https://huggingface.co/qvac/qvac-genesis-iii-qwen3-1.7b-combined) | Early next-token base checkpoint without instruction/chat post-training; assistant/production use excluded | Exclude from the chat showcase; useful research artifact, not an assistant substitute |
| [Fabric fine-tune adapters](https://huggingface.co/qvac/fabric-llm-finetune) | Biomedical Q&A adapters requiring matching base models, with poor off-topic behavior described | Exclude from Bitcoin chat; not hospital deployment or clinical approval |
| [Upstream Qwen3.5-0.8B](https://huggingface.co/Qwen/Qwen3.5-0.8B) | Upstream checkpoint behind the translation fine-tune | A baseline hypothesis, pending its own task/runtime/license review; preserve the Gemma shortlist too |

The AfriSLM card reports translation evaluations, not our Sheng/English educational dialogue benchmark.
The GGUF card also explicitly limits confidence in unsupported dialects/code-switching and calls for
human evaluation. Compare native conversational generation separately from translation; a translate-
to-English-and-back pipeline may lose tone, local meaning and safety nuance. Do not infer competence
from a Hugging Face `text-generation` tag or the presence of Swahili in a language list.

## Training and licenses

[Fabric](https://qvac.tether.io/products/fabric) describes local GPU LoRA on Vulkan/Metal hardware and
portable adapters. That makes a future small, consented language-adaptation experiment interesting;
it does not demonstrate performance on a community's actual phone or eliminate hardware limits.
RAG remains preferable for changing community facts; an adapter is a hypothesis for behavior/style after
we measure a gap. Never train a shared adapter automatically from members' private chats.

The [AfriSLM licensing section](https://huggingface.co/qvac/TranslatePsy-AfriSLM-0.8B#licensing-information)
declares Apache-2.0 for model weights, while its synthetic training mix is CC-BY-NC-4.0 and other data
components have different terms. The card also identifies the NLLB teacher. These are publisher
declarations, not a blanket commercial/data-reuse clearance from us. Record weight, base, adapter,
dataset and teacher provenance separately before a commercial training decision. Likewise, the
biomedical adapter card lists different underlying base-model terms. Free software does not make every
model, dataset, host, energy or internet connection cost-free.

## Concrete next step

F-021 adds a small reviewed candidate catalog and public metadata discovery: repository commit,
selected artifact bytes and publisher-reported SHA-256, task and license labels, missing information
and trial records. It downloads no weights and activates no provider. Source cards remain the evidence
for intended use; metadata tags are insufficient. Next run the existing synthetic workflow against a
qualified local server, then the held-out language comparison. Keep the $10 budget, paid-run supervision
and synthetic-only foreign-rental rule. A real QVAC test, device measurements and TEE proof remain open.
