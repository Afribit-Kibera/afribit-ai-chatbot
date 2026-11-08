**Afribit AI: private community AI and a shared-compute business**

Research date: 25 October 2026. Status: research and proposed direction for discussion, not an accepted architecture decision or a change to the existing service.

**Follow-up direction:** the discussion now centers on **Afribit Mesh**: community-governed local nodes, adaptive local inference, and a first Afribit-owned pool of compute for enrolled communities. Communities buy capacity and choose their own member-pricing rules. Section 17 develops this clarification; the earlier API-first recommendation remains as the initial comparison, rather than the only proposed path.

The next research chapter covers [model candidates, account-private memory, community learning, comparable systems and funding](2026-10-25-models-memory-training-and-precedents.md). It also records the current session-ID access model that needs strengthening before account-private memory is claimed.

**Recommendation:** develop Afribit as a community AI service with local knowledge and privacy-aware compute coordination. Start with a small number of verified providers and token-billed inference. Add owned hardware when measured demand, local availability, or offline requirements justify it. Keep ordinary community-trusted compute and remotely attested confidential compute as explicitly different choices.

The proposition is feasible without each community buying a GPU. It does not eliminate the underlying cost of hardware, dependence on chip manufacturers, or every possible form of monitoring. It can reduce the need to trust remote infrastructure operators with readable content.

**1. What the existing project already contributes**

The project is a community knowledge and language system, beginning with Bitcoin education in Kibera. Its main assets are reviewed knowledge, Sheng and Kiswahili communication, human governance, evaluation, and community packs. A model is a replaceable component that expresses that knowledge.

I reviewed the project overview, architecture, roadmap, relevant PRD sections, whitepaper material, community-node documentation, privacy decisions, threat model, developer-gateway concept, GPU-server specification and deployment instructions, and the gateway, provider, usage-metering and GPU-gate implementation. This is a targeted architectural review, not a full security audit or a rerun of the project's experiments.

| Existing foundation | Relevance to the proposed service |
|---|---|
| Community packs and reviewed knowledge | Communities keep their language, teaching rules, and knowledge when they change models or hosts. |
| Local embeddings and retrieval | A modest community machine can search without sending documents or embedding requests to an external API. |
| Replaceable inference providers | A confidential provider can be integrated behind the existing gateway. |
| Afribit Local | The community-box-plus-remote-inference pattern is already specified and implemented. |
| GPU gate | Existing authentication, quotas and token counts are useful operational components. |
| Card-only fallback | Losing remote compute need not mean losing the reviewed knowledge service. |
| Developer-gateway concept | Already contemplates compute contributors and identifies routing and trust as unresolved work. |

Sources in this repository: [architecture](../../ARCHITECTURE.md), [Afribit Local decision](../adr/0016-afribit-local-community-box.md), [local embeddings](../adr/0013-local-embeddings.md), [GPU-server specification](../features/F-006-afribit-gpu-server.md), [developer gateway](../concept/developer-gateway.md).

The recorded GPU and language experiments are useful starting evidence. They do not establish production capacity, independent security, or what communities will pay. In particular, four concurrent benchmark questions are not a capacity guarantee for several busy communities.

An important existing constraint: ADR 0016 and the roadmap prohibit sending Afribit Local learners' questions to foreign GPUs/providers. International services below are candidates for synthetic research traffic under the current policy. Using them for learners would require an explicit policy revision and appropriate community governance; their existence does not authorize that change.

**2. What to retain and correct in the attached concept note**

Retain its separation of local data from pooled inference, its cooperative ownership idea, and its attempt to fund operations through service revenue.

| Statement or implication in the excerpt | Assessment |
|---|---|
| Local RAG means the context never leaves | The corpus can stay local, but the retrieved passages included in a remote prompt leave. So do the question and any included chat history. |
| A VPN makes the compute provider unable to read the prompt | A VPN protects transport. The ordinary receiving server decrypts the request and processes plaintext. |
| Disabling Nginx access logs ensures no data reaches disk | It addresses one log. Application errors, proxy buffering, tracing, swap, crash dumps, caches, backups and host instrumentation require separate controls. |
| Stateless processing prevents operator access | It reduces retained history. It does not stop a privileged operator observing a live ordinary process. |
| Memory is instantly flushed after every answer | That needs implementation and verification. Inference engines may retain KV caches; freeing memory is not the same as securely erasing it. |
| Owning a Mac provides the same remote-user assurance as a TEE | Ownership changes who must be trusted. It does not give another community proof that the owner cannot inspect its request. |
| Large models require buying enterprise GPUs | Quantized smaller models, pooled APIs, community GPUs and supported confidential rentals offer other paths. Choose the smallest model that passes the community's tests. |
| Open software means zero software-related operating cost | Staff, maintenance, security updates, support and reviews still cost money; component and model terms also differ. |
| Large-scale censorship of ordinary Bitcoin education is established | The excerpt provides no evidence. Afribit's case can rest on ownership, language access and verifiable privacy without that claim. |
| Foundations prefer hardware purchases to salaries | This is not established here. Use the relevant funder's actual criteria rather than assume it. |

There is also a concrete Mac deployment problem: Ollama's ordinary Docker deployment on macOS does not receive Apple GPU acceleration through Docker Desktop. Its official guidance recommends running the Mac inference process outside Docker. [Ollama Docker guidance](https://ollama.com/blog/ollama-is-now-available-as-an-official-docker-image).

The excerpt's Mac SKU and price should not become a purchase specification. Apple's current announcement identifies M5 Max and M5 Ultra systems; obtain actual Kenyan quotes and test the chosen configuration. Unified memory capacity alone does not establish serving throughput. [Apple Mac Studio announcement](https://www.apple.com/newsroom/2026/08/apple-introduces-new-mac-studio-with-m5-max-and-m5-ultra/).

**3. What Apple and Meta actually demonstrate**

Apple combines on-device processing with Private Cloud Compute for larger workloads. PCC uses purpose-built hardware, restricted software, attestation and transparency. Buying a standard Mac and running a model does not reproduce that system. [Apple PCC architecture](https://security.apple.com/blog/private-cloud-compute/).

Meta's WhatsApp Private Processing similarly uses remote confidential processing. Its published design combines attested connections with an intermediary intended to separate the requester's network identity from the processing service. [Meta engineering design](https://engineering.fb.com/2025/04/29/security/whatsapp-private-processing-ai-tools/).

The lesson for Afribit is local processing where feasible, protected remote processing where necessary, and verifiable boundaries. Neither design proves that powerful AI no longer needs remote infrastructure.

Using an existing provider can avoid building another facility. Decentralization itself does not prove lower energy use, water use or emissions. Those require measurements of hardware, utilization, power and cooling. A lightly used always-on community cluster can also be inefficient.

**4. Separate the promises communities might want**

| Property | Meaning | What it does not establish |
|---|---|---|
| Local storage | The full corpus and retained history live at the community or user endpoint. | Remote inference never receives selected content. |
| No content retention | The service does not persist prompts and answers under defined cache and logging rules. | Its operators cannot inspect live processing. |
| Confidential remote inference | Approved software processes content within a verified hardware boundary. | No software vulnerabilities, manufacturer trust, or visible metadata. |
| Anonymity | Activities cannot readily be connected to an identified person. | Provided automatically by a TEE, VPN, or payment method. |
| Local jurisdiction | Processing happens in a specified country. | Proven by ordinary hardware attestation or a low network ping. |
| Portability | The community can export its data and choose another host. | Another host will support the same model, price or service quality. |
| Offline independence | Full generation works without an uplink. | Achievable using remote-only compute. |

For a community that wants privacy from Afribit, other GPU operators, and its own leaders, the endpoint matters too. A shared community administrator can potentially inspect the local application and database. Community ownership does not automatically provide privacy from community insiders. Keep private personal history on a member-controlled endpoint where that threat matters; a shared box can still hold public teaching materials.

**5. The available technical approaches**

| Approach | Main trust requirement | Cost and suitability |
|---|---|---|
| Entirely on-device | The person's device, software and update chain | Strong locality and offline potential. Test actual phones, memory, heat and language quality. |
| Community-owned GPU | Community administrators and physical security | Shares capital costs and works offline. Appropriate where the community accepts its operators. |
| Ordinary remote GPU with no-retention operations | Remote operator and guest administrators | Accessible and flexible, but the operator can technically read live content. |
| Attested remote CPU inference | Supported CPU TEE plus approved workload and client | Can avoid a GPU for smaller models. Benchmark acceptable language quality and interactive speed. |
| Attested remote CPU-and-GPU inference | Supported hardware, approved guest software, verifier and client | Most practical candidate for stronger models without exposing content to the infrastructure host. |
| Multi-party computation (MPC) | The selected protocol's adversary and collusion assumptions | Can split sensitive computation across parties; communication and protocol costs need workload-specific testing. |
| Fully homomorphic encryption (FHE) | Cryptography, implementation and endpoint keys | Can compute over ciphertext. Do not assume commodity chat performance for Afribit's model. |
| Model sharding across ordinary internet peers | Peers and the serving protocol | Pools memory/compute but does not inherently conceal inputs or intermediate state. |

FHE and MPC are real techniques, not imaginary alternatives. However, a research result on a particular model or forward pass is not a deployment benchmark for interactive Sheng generation. EncryptedLLM evaluates GPU-accelerated encrypted GPT-2 computation; recent work also addresses the difficulty of encrypted autoregressive KV caching. My recommendation is to keep these as research options until a candidate passes Afribit's latency, bandwidth, quality and cost tests. [EncryptedLLM](https://proceedings.mlr.press/v267/de-castro25a.html), [Cachemir](https://arxiv.org/abs/2602.11470).

MPC protocols vary: for example, CrypTen's published evaluation uses a semi-honest threat model. A network of computers is not enough; specify how many can collude and whether malicious behavior is covered. [CrypTen research](https://papers.nips.cc/paper/2021/hash/2754518221cfbc8d25c13a06a4cb8421-Abstract.html).

Exo is relevant to trusted local Apple-device clusters. Petals demonstrates collaborative internet inference. Their existence supports the possibility of distributed serving, not a claim that strangers' ordinary machines can safely process private community prompts. [Exo](https://github.com/exo-explore/exo), [Petals](https://github.com/bigscience-workshop/petals).

**6. What decentralized TEEs would mean for Afribit**

A TEE is a hardware-backed protected execution boundary. Decentralization describes who operates the available machines and how users find them. Combine them by admitting independently operated, compatible machines and requiring clients to verify the chosen workload before sending content.

For the first version, each request should run on one eligible confidential worker or one provider-managed confidential cluster. Route different requests among providers. Splitting one generation across unrelated internet machines adds communication, failure and verification problems and is unnecessary for an initial service.

Supported hardware is specific. NVIDIA's current compatibility documentation includes appropriate Hopper and Blackwell configurations, including a validated RTX PRO 6000 configuration, together with compatible CPU TEEs. Afribit's proposed RTX 3090/4090 server is ordinary GPU compute, not a confidential GPU merely because it uses a VPN or a confidential CPU frontend. Check exact SKU, firmware, mode and software support before procurement. [NVIDIA supported platforms](https://docs.nvidia.com/confidential-computing/virtual-machines/dev/supported-platforms).

Protecting the CPU alone does not protect plaintext sent to an ordinary GPU. Likewise, a valid GPU quote does not establish which application is running. Guest administrators, workload software and verification policy remain trusted unless constrained by the service design. Multi-GPU links require their own assessment. [NVIDIA trust model](https://docs.nvidia.com/confidential-computing/virtual-machines/threat-model).

An Afribit worker admission policy should require:

1. Fresh CPU and, where applicable, every GPU's attestation, validated cryptographically against trusted roots and current security policy.
2. Rejection of unacceptable firmware, revoked credentials, debug configurations and insecure runtime modes.
3. An authenticated boot/workload chain covering the inference application, model and tokenizer versions, configuration, and approved update process.
4. The encryption public key bound to that approved workload and fresh evidence, preventing a gateway from substituting its own key.
5. Content decryption only within the accepted boundary. Every intermediary that decrypts becomes part of the trusted application.
6. Restricted administration and outbound connections. A TEE running a permitted logging agent can still leak data.
7. Defined cache isolation, lifetime, teardown and persistence rules. Public shared prompt prefixes and private personal context need different handling.
8. A client that refuses to send content when any required check fails.

The list above is a proposed service policy, not a claim that any shortlisted supplier has passed it. Attestation binds a connection to approved software; it is not proof that that software has no bugs or that an answer is true.

For self-managed infrastructure, existing projects can supply building blocks. Confidential Containers' Trustee verifies evidence and conditionally releases secrets. Reuse audited implementations and established protocols rather than invent a new attestation or encryption protocol. [Confidential Containers attestation](https://confidentialcontainers.org/docs/attestation/).

**7. Providers and networks worth evaluating**

These are research candidates based on primary documentation accessed on the research date. No accounts were provisioned, no money was spent, and I did not run or independently audit their live inference or attestation paths. Provider documentation is evidence of the offered design, not independent proof of its correct operation.

| Candidate | Potential role | What Afribit must establish |
|---|---|---|
| Tinfoil | Managed confidential inference and custom containers | Exact model availability, client verification, complete request path, metadata, deployment region and commercial terms. |
| NEAR AI | Token-billed confidential inference | Exact route tier and evidence, E2EE/key binding, model quality, region, and failure behavior. |
| Phala | Confidential inference or deployment of a chosen workload | Attested gateway and upstream worker boundaries, custom-model support, evidence verification, rental terms and region. |
| Chutes | Distributed inference with a documented TEE/E2EE path | Specific model's confidential flag, fresh cryptographic evidence, client encryption and compatible runtime/model version. |
| Akash | Deployment marketplace for Afribit's own confidential service | Actual eligible supply, complete workload verification, encrypted channel binding, location and operational reliability. |
| Nillion | Additional private-compute ecosystem to investigate | Exact nilAI/nilCC mechanism and end-to-end verifier, rather than relying on the broad term “blind compute.” |

Tinfoil describes connection-time verification and distinguishes confidential content from retained operational metadata. Its inference API and consumer chat have different safeguards and storage behavior; evaluate the API contract for this use. [Tinfoil security FAQ](https://tinfoil.sh/security-and-privacy-faq).

NEAR documents verification of gateway evidence, model candidates, TLS, provenance and response signatures. Its direct-completions verification is explicitly experimental. A compatible HTTP endpoint alone does not implement those checks. [NEAR verification](https://docs.near.ai/cloud/verification).

Phala's E2EE documentation says decryption happens in its attested gateway. This must be paired with an appropriate confidential upstream model; encryption to an attested gateway does not establish confidentiality of every route beyond it. [Phala E2EE](https://docs.phala.com/phala-cloud/confidential-ai/confidential-model/e2ee-encryption).

Chutes documents model capability flags and optional client E2EE. Its verification specification binds the instance key to fresh evidence. Verify that path rather than relying on the word “TEE” in a model name. [Chutes TEE overview](https://www.chutes.ai/tee), [verification specification](https://github.com/chutesai/chutes-api/blob/main/docs/tee-verification.md).

Akash currently labels confidential compute experimental. It distinguishes CPU-only and CPU-plus-GPU capabilities and documents attestation and optional TLS binding. Afribit should require protected key/channel binding for sensitive traffic and treat provider availability as something to measure. [Akash confidential compute](https://akash.network/docs/learn/core-concepts/confidential-compute/).

Nillion's documentation describes individual nilAI nodes running private LLMs inside TEEs. Do not infer that its LLM service is necessarily threshold MPC or FHE because the broader network offers other privacy technology. [Nillion architecture](https://docs.nillion.com/blind-computer/learn/overview).

A practical initial shortlist is two managed confidential APIs with a passing model, plus a separate Akash or Phala custom-deployment experiment if the exact Afribit model is unavailable through managed APIs. Confirm that the suppliers are operationally independent before counting them as independent failover.

**8. Proposed architecture**

```text
Member device
    |
    | Local authenticated connection
    v
Community box or member-controlled local application
  - approved knowledge and document permissions
  - embeddings, retrieval, prompt preparation
  - locally chosen history/retention
  - routing policy and attestation verifier
    |                                  |
    | minimal discovery/usage metadata | encrypted content, bound to
    v                                  | an approved workload key
Afribit coordination service           v
  - provider/model registry       Confidential worker
  - health/capacity and pricing      - approved inference software
  - billing/quotas                   - verified model and configuration
  - signed software releases        - protected processing/cache policy
  - no prompt decryption            - encrypted response to client
```

Afribit can act as a directory, policy distributor, billing intermediary and encrypted relay. Retrieval and content-based routing happen locally. The coordinator can select from model, policy, region, queue and price without seeing question text.

The plaintext path must not silently become community box → ordinary Afribit gateway → confidential provider. In that arrangement the ordinary Afribit gateway can read the question even if the last hop is confidential. Direct client connections or an encrypted body protocol verified at the community box preserve the intended separation.

Where the provider uses its own confidential router, that router is another approved workload inside the trust boundary, not an invisible exception. The verifier must cover the actual route, including the model worker.

The local application should select the smallest sufficient passages after checking access rights. A vector database does not enforce user permissions merely by being local. Embeddings also should not be treated as anonymized documents.

For high-risk personal history, use a member-controlled client rather than assuming a shared box's steward cannot inspect it. The same applies to browser delivery: a compromised client update can steal content before encryption. Signed/pinned releases, reproducible artifacts and explicit upgrade approval strengthen that boundary.

**9. Routing for latency, quality and privacy**

Use hard eligibility rules before optimization:

1. Enforce the community's allowed countries, required confidentiality, model approval, content-handling policy and spending ceiling.
2. Verify fresh evidence and the workload-bound connection key before transmitting content.
3. Among eligible workers, optimize measured time to a usable answer and cost.
4. If none qualifies, use a permitted local model or reviewed cards, or say the private service is unavailable.

Do not lower privacy requirements to make an outage disappear. Retry another provider only if it meets the same policy. Avoid duplicating private prompts across multiple workers as a default latency optimization.

Measure round-trip time, queue delay, prompt processing, first-token latency, output tokens per second, complete-answer latency, failure rate and cold-start time. A nearby overloaded GPU may be slower than a more distant warm model. Provider geography and reported token speed are inadequate substitutes for an end-to-end Nairobi benchmark.

Long local RAG prompts create remote compute costs. The project has already measured a large difference between full and compact prompts. Re-evaluate compact prompts, retrieved-passage limits, history limits and deterministic answers while preserving factuality and naturalness. If a local “waiter” model is added, include its latency, quality and cost rather than counting only the final generation call.

**10. What remains visible and trusted**

Content confidentiality and invisibility are different goals. Possible observers include the member's device, community steward, access-network operator, relay, coordinator, inference service, hardware vendor and payment service.

Even with protected content, IP addresses, session timing, request sizes, model choice and billing counts can reveal activity. Reduce identifiers, aggregate usage and document retention. If anonymity is needed, investigate a separate relay architecture with an explicit non-collusion assumption. A VPN connected to a named community is not anonymous access.

The service still depends on secure endpoints, approved application code, the hardware security model, verification roots and updates. It does not provide guaranteed availability against an operator who removes power, nor does it make model outputs reliable by itself. Preserve Afribit's community knowledge review and safety evaluation.

Geography is a separate issue: attestation does not generally prove a machine's physical country. Use provider enrollment evidence and contractual/audited location assurances as appropriate, and state their limits.

Before international processing of personal data, apply the community's policy and review Kenya's transfer requirements. Do not assume a TEE automatically settles jurisdiction or transfer obligations. ODPC publishes current cross-border guidance; the implementation needs a qualified review of the actual data flow. [ODPC guidance](https://www.odpc.go.ke/wp-content/uploads/2026/09/ODPC-%E2%80%93-Guidance-Notes-for-Cross-border-Data-Transfers.pdf).

**11. A business model that does not begin with GPU ownership**

Afribit's strongest offer is an operated community AI service: onboarding, language packs, local data management, verified inference connections, updates, support and predictable cost. Raw token resale may contribute revenue but is easy to compare and substitute.

Potential revenue streams:

- Installation, onboarding and a paid language/readiness assessment.
- Monthly community service with an explicit compute allowance, fair-use terms and spending cap.
- Managed local boxes, encrypted backups, restore drills and updates.
- Institutional support, dedicated capacity and deployment options.
- A transparent coordination fee where Afribit handles provider procurement and billing.
- Later, a provider service for approved communities supplying eligible spare compute.

Keep learners free at the point of use, consistent with the current roadmap. Institutions, community organizations or sponsors can buy the service. Test affordability and willingness to pay with real buyers rather than assume each community can afford the same subscription.

Avoid an unlimited generation promise. Abuse, long histories and high simultaneous demand can erase a small subscription margin. Keep admission, quotas and overload behavior independent of prompt inspection where possible.

Offer three clearly described service choices:

| Choice | Buyer receives | Boundary |
|---|---|---|
| Community-owned | Installation/support for a local model and local data | Community administrators operate the machine; full offline generation if equipped. |
| Community-trusted shared compute | Managed access to an ordinary cooperative GPU | Explicit trust in the GPU/application operator; no-retention operations do not remove it. |
| Verified remote compute | Local data with an approved attested remote inference path | Reduced trust in infrastructure operators, with disclosed hardware/software and metadata limits. |

Community-owned machines can join the second choice without pretending to qualify for the third. An unqualified provider can contribute public-data batch work or ordinary explicitly trusted service; it should not receive traffic whose policy requires confidential hardware.

**12. Illustrative economics**

Prices below are a dated snapshot, not quotations or a guarantee. No model in this cost example has been shown here to pass Afribit's language evaluation.

NEAR's published catalog lists Qwen3-VL-30B-A3B-Instruct at $0.15 per million input tokens and $0.55 per million output tokens for its listed confidential tier. [Published pricing](https://near.ai/pricing).

At 3,000 input tokens and 600 output tokens per answer:

```text
Cost per answer = (3,000 × 0.15 + 600 × 0.55) / 1,000,000
                = $0.00078

10,000 answers  = $7.80
100,000 answers = $78.00
```

These are inference-only calculations. They exclude retries, additional model calls, longer conversations, support, connectivity, local equipment, payment costs, taxes and margins. Tokenization and output length differ across languages. At 10,000 input and 1,000 output tokens, the same rates imply $20.50 per 10,000 answers.

For a very different product, Phala lists a US single-H200 confidential rental at $5.50/hour on demand, with a 24-hour minimum. That is $132 for the minimum period or approximately $4,015 for 730 hours. A dedicated GPU can serve custom models and pooled demand, but a low-volume pilot pays for its idle hours. [Phala rental pricing](https://cloud.phala.com/about/pricing).

This is a comparison of purchasing models, not an equal-capacity benchmark. The rental could serve many requests concurrently, while the API has its own limits. Do not conclude either option wins at scale without throughput, quality and utilization measurements.

For owned hardware, calculate:

```text
Monthly owned cost = equipment amortization + electricity + connectivity
                  + maintenance + operator time + replacement reserve
                  + security/licensing costs where applicable

Break-even answers = monthly fixed cost
                   / (equivalent API cost per answer - local variable cost)
```

The denominator must be positive, and the hardware must serve the required peak load. For example, $300/month fixed cost and hypothetical $0.00020 local variable cost against $0.00078 API cost requires about 517,242 answers/month just to break even. These owned-cost assumptions are illustrative, not Kenyan quotes, and ordinary and confidential hardware are not interchangeable privacy products.

Similarly, 20 communities paying an assumed $40/month produces $800 revenue. If they consume 10,000 example answers each, inference would be $156, leaving $644 before all other service costs. This is a planning illustration, not a validated price or profit forecast. Staff and reviewer time can dominate compute cost.

Measure contribution margin per community, peak concurrency, support hours, actual cost per accepted answer and willingness to renew. Recheck pricing without free credits or token incentives, and under a supplier price increase, before claiming sustainability.

**13. Changes the existing implementation would need**

Do not rebuild the application around a marketplace. Extend its current boundaries.

| Proposed change | Existing place to build on |
|---|---|
| Confidential provider adapter using a verified SDK/protocol | `apps/api/src/providers/` and provider registry |
| Distinct provider capabilities for location, retention and attestable confidentiality | Shared provider types and model profiles |
| Community routing policy enforced for primary and fallback calls | `apps/api/src/gateway/gateway.ts` |
| Verifier, reference measurements and controlled upgrades | New local verification component, using established implementations |
| Metadata-only discovery and billing | Existing usage meter and GPU gate as starting points |
| Separate cost accounting for owned, rented and API compute | Usage model; `LocalProvider` currently reports estimated dollar cost as zero |
| Truthful UI labels | Existing model-location and privacy features |
| Private document authorization if that use case is added | Local retrieval and knowledge permissions; public teaching packs are not a private multiuser document system |

Current code inspection found no CPU/GPU attestation or workload-key verification in `LocalProvider`; it uses ordinary authenticated HTTP requests. That is appropriate to its present operator-trust model, but changing its base URL to a TEE service alone would not implement the proposed guarantee.

The gateway meters calls and persists error messages. The local provider includes excerpts of upstream error responses in thrown errors. Before stronger privacy claims, assess error sanitization so an upstream service cannot echo sensitive content into retained errors. This is a review item from the request path, not a demonstrated exploit or completed vulnerability assessment.

The existing gate reads plaintext request bodies by design. It remains useful for ordinary cooperative compute; confidential service requires either moving every decrypting component into an approved workload or relaying ciphertext with separate authorization and metering.

Some existing documentation overstates what canary log scans establish. A canary can show that a tested phrase was absent from the inspected storage/logs at that time. It cannot prove that a privileged operator cannot observe memory, that all paths are covered, or that later software cannot retain content. Update such claims through a separate reviewed change.

The overloaded word `node` also needs care: today it can point at a remote Afribit model server. Privacy should be described by explicit content flow and provider properties, not inferred from that setting's name.

**14. Proposed first 90 days**

This is an order of work and an approximate planning horizon, not a commitment to launch dates.

| Period | Work | Reviewable result / exit condition |
|---|---|---|
| Weeks 1–2 | Confirm buyers, threat model, residence policy and model requirements; create a feature spec for verified inference. | Written service promises; chosen synthetic workload; explicit decision on whether any future international learner processing is acceptable. |
| Weeks 3–4 | Connect a local test box to two shortlisted APIs using supported verification clients; test the real Afribit prompt pipeline. | Reproducible quality, cost and latency comparison; complete description of plaintext recipients and metadata. |
| Weeks 5–6 | Exercise failure cases and evaluate a custom deployment if no API serves a passing model. | Invalid/stale/unapproved evidence and substituted keys prevent content transmission; fallback preserves policy. |
| Weeks 7–10 | After the existing required reviews and policy conditions, run a small supervised community pilot. | Actual usage, language review, support effort, uplink behavior and cost per accepted answer. |
| Weeks 11–12 | Test paid renewals and capacity options. | Go/no-go on a managed service; buy/rent/API decision based on recurring demand and peak load. |

Research traffic can remain synthetic throughout if the Kenya-only policy or provider availability prevents a real remote pilot. A local trusted-compute pilot is a different, explicitly labelled option; it does not validate confidential computing.

Suggested measurements: p50/p95 first-token and complete-answer latency, input/output tokens, model and quantization, context length, concurrency, errors/retries, queue time, network bytes, confidential-boundary evidence, support hours and language scores. Use educator-written questions and blind community review as already planned.

Suggested acceptance exercises: reject forged evidence, replayed evidence, unapproved images, debug configurations, substituted keys and nonconfidential fallback; demonstrate tenant/cache separation; test outage recovery and restore; inspect local and remote error/logging paths. These are proposed verification tasks, not tests performed in this research.

Start with proposed usability targets and revise them with users—for example, p95 first token under 5 seconds and a normal short answer under 20 seconds at the pilot's peak concurrency. These are product hypotheses, not published provider performance guarantees.

**15. Open weights versus open source**

Weights are learned numerical parameters. “Open-weight” generally means they are available for download, with use and modification governed by their actual terms; it does not promise permissive rights or a reproducible training process.

Under OSI's Open Source AI Definition, openness also requires the relevant freedoms, code and sufficient training-data information to support modification. It does not universally require redistribution of every raw training record. [OSI definition](https://opensource.org/ai/open-source-ai-definition).

| Example | Accurate description |
|---|---|
| Llama 3.3 | Downloadable weights under Meta's custom community license, including additional conditions. Avoid presenting this as an unrestricted OSI-approved license. |
| Gemma 4 | Google's model card identifies open weights under Apache-2.0. That license fact alone does not establish that the entire training system satisfies the OSI AI definition. |
| Olmo | Ai2 publishes training code, data and evaluation materials alongside weights, making it a useful example of broader openness. Language suitability still needs testing. |

Primary sources: [Llama license](https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct/blob/main/LICENSE), [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4), [Olmo documentation](https://docs.allenai.org/models/olmo/index.html).

For Afribit, maintain separate records for application-code license, exact model/adapter license, training transparency, commercial hosting permissions and inference privacy. Open licensing does not hide prompts from a host. Conversely, a confidential service can protect inference content without making its underlying model fully open.

RAG normally supplies context for a request without updating model weights. Fine-tuning and LoRA are different operations and need explicit training-data permissions. An adapter trained on sensitive material can itself become a sensitive artifact.

**16. Recommended next decision**

Position the service as: “Your community keeps its knowledge and chooses where its AI runs. Afribit connects it to eligible compute under a verifiable privacy policy, with local-language support and predictable costs.”

Keep open software and community exportability central. Prove verified routing and sustainable service demand before building an open provider marketplace. Owned hardware can join later as one source of capacity, or meet a community's offline requirement, without becoming a prerequisite for the business.

The first unresolved decision is the relationship between Kenya-only processing and international confidential providers. The second is whether a model available through a verifiable service passes the community's language evaluation. Those two results determine the viable pilot architecture more directly than choosing a Mac or GPU now.

**17. Follow-up: Afribit Mesh, community quorums and adaptive local inference**

The clarified product is a private community network with AI as one service. A community holds its data, governs privileged access, and runs affordable local services. Afribit supplies a pool of heavier compute to enrolled communities. Internet connectivity can be another network service; members do not need a personal data bundle merely to reach the local assistant.

This is a federated service: community nodes retain local authority while sharing some infrastructure. A public compute marketplace is optional later work, not a prerequisite. A first Afribit-owned server is a reasonable pilot choice if local availability, workload measurements and a compatible confidential configuration support it. Supplier APIs remain useful comparison points and optional explicitly permitted capacity.

**Community approval should control privileged operations, not every question.** A 4-of-7 rule can authorize a specific maintenance session, restore, sensitive export, routing-policy change or software upgrade. Ordinary AI requests run under a restricted service identity without assembling four votes for each answer.

The approval UI should collect authenticated approvals, not ask people to paste their long-lived key shares into a shared frontend. Bind approvals to the requester, community, exact resource/action, policy version, expiry and a fresh request identifier. Four distinct authorized operators approve a short-lived capability. Notify all designated operators, record use and expiry, and require a new authorization for a new scope. The quorum and operator roster themselves need governed change and recovery procedures.

| Control | What it protects | Important boundary |
|---|---|---|
| Multi-person approval | A privileged action needs several people to authorize it. | The enforcing backend must cover the action, not only hide a UI button. |
| Threshold key custody | Fewer than the threshold cannot reconstruct a protected key under the scheme's assumptions. | An already-unlocked running application still needs access controls. |
| Temporary credentials | Limits how long the approved operator can connect. | Unrestricted root access can install persistence or copy information before expiry. |
| Signed, replicated audit events | Makes approval and use inspectable by other custodians. | Logs on the administered machine alone can be altered by its root operator. |

SSH, database consoles, backup keys, disk recovery, cloud/physical management, software updates and policy changes must not provide an easier bypass. Prefer a narrow maintenance role over a general root shell. Root access remains a high-trust operation even when approved; a short session does not undo data already copied or persistence installed.

Keep routine health maintenance separate from permission to inspect members' conversations. Audit the approved action, operator, resource, time and result without routinely copying private chat content into an audit database. If terminal recording is used, treat the recording as sensitive too. A colluding authorized quorum remains within the governance threat model; the mechanism does not prove every authorized decision is benign.

OpenBao documents both threshold unsealing and separately configured multi-party control groups for protected requests. These are useful building blocks to evaluate, not proof that installing a secrets manager implements the entire community governance policy. [OpenBao sealing](https://openbao.org/docs/concepts/seal/), [OpenBao control groups](https://openbao.org/docs/concepts/control-groups/).

**The waiter becomes an adaptive local service.** Its tasks are language handling, local search assistance, clarification, simple local answers and preparation of a minimal remote ticket. It should not be the sole authority on whether private material may leave the community.

```text
Member on local Wi-Fi/mesh
            |
            v
Community app + local documents + search + small model
            |
      policy-controlled routing
       /                  \
      v                    v
Local answer       permitted heavy request
                           |
                 encrypted attested connection
                           |
                           v
                 Afribit shared compute
```

Use two separate decisions: whether approved knowledge covers the question, and whether the local model can perform the task adequately. Local information may require difficult reasoning; a general question may be simple enough to answer locally.

| Request | Proposed handling |
|---|---|
| A published community timetable or reviewed FAQ | Retrieve locally; use approved text directly where suitable. |
| A simple explanation from reviewed material | Local model grounded in retrieved passages, if it passes evaluation. |
| A complex analysis of documents permitted for confidential processing | Send only necessary passages to a verified Afribit worker. |
| A complex analysis of documents marked local-only | Remain local, narrow the task, or explain the limitation; do not silently offload. |
| A larger general reasoning task | Use Afribit capacity if the community permits it and has quota. |
| No backhaul or no eligible worker | Keep local services working and show the unavailable capability accurately. |

Document permissions and egress labels should be enforced in ordinary code. An LLM's route recommendation, confidence statement or redaction attempt cannot override them. RAG similarity alone is not a reliable proof that an answer is correct. Remote compute also does not automatically supply current external information; web access, if offered, is a separate tool and data-flow policy.

The existing restaurant design provides components, but not this full adaptive policy. In `apps/api/src/chat/chatService.ts`, the restaurant branch is currently disabled in `node` mode and calls the chef when that branch is active with a ticket. The new behavior needs an explicit local completion path, a policy gate and a private Afribit escalation path. See [ADR 0012](../adr/0012-the-restaurant-pipeline.md).

**A waiter should be much smaller than 70B if affordable hardware is the objective.** As evaluation hypotheses, begin with roughly 1–4B-class models for routing/ticket preparation, and test a somewhat larger local answer model only when quality requires it. One small model may cover both roles. These are candidates to measure, not established Sheng capability.

For scale, 70 billion parameters at four bits require about 35 GB just for idealized raw weights, before quantization metadata, runtime and context. Google's model guidance also distinguishes static model memory from context and software overhead. Parameter names can be misleading for effective-parameter and mixture-of-experts models. [Model memory guidance](https://ai.google.dev/gemma/docs/core).

A used or modest PC with 16 GB RAM is a possible starting test platform for a small local service, not a guaranteed serving specification. CPU speed, model format, context, simultaneous users and language quality determine whether it works. A mesh router alone may have insufficient resources. If there is no AI-capable community box, use a shared hub or remote inference and describe the reduced offline capability honestly.

**Tailscale joins sites; the local mesh serves members.** Run the local website, name resolution, authentication and local inference without dependence on an external login or tunnel for normal offline use. The backend on the community box can initiate requests over Tailscale itself, so every learner's phone need not install Tailscale or receive direct GPU access.

The remote AI API should be reachable only by admitted community nodes with application authentication and quotas. Give nodes access to the required compute endpoint, not to other communities' databases or administration. Configure explicit least-privilege rules; broad existing grants remain broad even if narrower grants are added. [Tailscale grants](https://tailscale.com/docs/reference/syntax/grants).

Tailscale is an overlay over an existing reachable network. It does not supply the fiber, mobile uplink, private wireless link or other backhaul. For geographically remote GPUs, the gateway needs that transport even if members have no general internet access. Connections can be direct or relayed; measure the actual path because relays can affect latency and throughput. [Tailscale network concepts](https://tailscale.com/docs/concepts/tailnet), [connection types](https://tailscale.com/docs/reference/connection-types).

| Network state | Service that can work |
|---|---|
| Member connected to local mesh; gateway has no external route | Local knowledge, local accounts and local inference, subject to local capacity. |
| Gateway has working backhaul and an authorized tunnel to Afribit | Local services plus permitted remote heavy compute. |
| Private mesh/backhaul reaches the GPU site directly | Heavy compute may work without public-internet transit; this is a separately engineered and tested path. |
| Member disconnected from local mesh | Only independently installed/cached functions; do not promise the whole node remains available. |

Tunnels, boot, DNS, authentication and power need an outage test. A mesh network is not automatically internet-independent merely because local radio links remain powered. Avoid making a remote identity service mandatory for every local login.

Private network membership reduces public exposure. It does not eliminate malicious members, stolen devices, unsafe uploads or prompt injection. Preserve authentication, document permissions, restricted model tools and rate limits. A private network is a smaller audience, not a correctness or trust guarantee.

**Afribit-owned confidential compute requires a compatible complete platform.** Ordinary GPUs cannot be upgraded into a protected GPU path by adding a certificate. Select a validated GPU, compatible CPU TEE, firmware, drivers and runtime, then verify the actual workload and receiving key. [NVIDIA supported platforms](https://docs.nvidia.com/confidential-computing/virtual-machines/dev/supported-platforms).

If Afribit controls the guest software as well as the physical host, preventing Afribit snooping requires approved workload code and restricted guest administration too. A promise not to read content is valuable governance; an attested, constrained processing path supplies additional technical assurance. [NVIDIA trust boundaries](https://docs.nvidia.com/confidential-computing/virtual-machines/threat-model).

For a first shared pool, several communities may use one approved inference service with application-enforced isolation and separate cache namespaces. Do not describe that as a dedicated hardware-isolated GPU per community. In NVIDIA's documented CVM design, a whole GPU is assigned to one CVM; dedicated per-community confidential VMs may change hardware and scheduling needs.

**Sell capacity and network operations to communities.** The clarified commercial boundary is that Afribit charges the community for an allowance or reserved service. The community may subsidize access, charge members, sell memberships or fund it through institutions according to its own governance. This supersedes the earlier research assumption that all communities would keep learner access free; it does not itself edit the existing roadmap or implement payments.

Define allowances using bounded input/output tokens, context length and permitted models, together with concurrency and queue priority. Request count alone cannot price a short FAQ and a large document analysis fairly. Keep connectivity, AI allowance and administration as distinct entitlements even when sold in one package; an exhausted AI balance should not unexpectedly disable local knowledge or unrelated mesh services.

An illustrative routing target of 80% local completion would reduce 1,000 requests to 200 remote jobs. It would not establish an 80% reduction in total cost: the remote jobs may be longer and more expensive, while local inference and equipment still cost money.

```text
Expected cost = local equipment and operations
              + local inference work
              + escalated jobs × average remote job cost
              + shared compute fixed costs, backhaul and support
```

Measure the local completion rate alongside factuality, language quality, local CPU saturation, remote tokens, remote queue time and cost per useful answer. Measure compute costs separately from mesh operating costs so the bundle's economics remain visible.

**First proof:** one community node, one Afribit compute endpoint and two distinct workloads. Demonstrate a correct local answer with the uplink removed, a harder permitted answer through the private remote path, refusal to offload local-only content, and a backend maintenance operation that cannot proceed without the required quorum. Verify the confidential processing boundary separately from network reachability. Then measure load and support effort before expanding capacity.
