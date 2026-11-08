**Afribit Mesh: model candidates, personal memory, community learning and comparable systems**

Research date: 25 October 2026. Scope: research and proposed design only. No models were downloaded, trained, benchmarked or deployed. No application code or production settings were changed. Provider/project descriptions below are primary-source claims, not an independent security or performance audit.

This continues the [private community compute research](2026-10-25-private-community-compute.md), including its Mesh-first clarification. The agreed direction under discussion is community-governed local nodes, a small local assistant, shared Afribit compute, and community-defined member pricing.

**1. The central separation**

A community can improve its AI without repeatedly fine-tuning a model. Keep five different assets and processes distinct:

| Layer | Purpose | Who should benefit |
|---|---|---|
| Personal context and memory | A person's recent conversation, preferences and explicitly saved information | That person, unless they deliberately share an item |
| Restricted team/case knowledge | Information shared with a specific team or authorized case participants | Only authorized members of that scope |
| Approved community knowledge | Reviewed material for the community's assistant | The audience approved for that material |
| Optional network knowledge | Material explicitly licensed and approved for sharing across communities | Other participating communities within its license and scope |
| Model/adapters | Learned behavior, language style and task patterns | Only the deployment audiences permitted by their training data and license |

“Global community context” should therefore be named carefully: community-wide knowledge is not automatically network-wide Afribit knowledge. Neither is a pool of everybody's conversations.

The same frozen model can serve many users without learning one user's history into its weights. Each request receives its own permitted context. Correct context assembly, retrieval authorization and cache isolation are what keep those requests separate.

**2. What the repository already establishes, and what it does not**

[ADR 0015](../adr/0015-how-the-assistant-learns.md) already separates personal memory, approved community learning and model releases. It labels learner memory as planned and the review workflow as partly implemented. This is the right foundation; implementation status should remain explicit.

Existing building blocks include:

- `chat_sessions.user_id` links a conversation to an account, where an account is present.
- The chat route takes account identity from a verified token rather than trusting a submitted `userId`.
- Messages are stored and loaded by conversation ID.
- Knowledge retrieval filters for approved/published content; language retrieval also checks its RAG-use permission and pack scope.
- Language provenance has separate `allowed_for_rag`, `allowed_for_training` and `allowed_for_evaluation` flags.
- There is a no-storage mode in which the browser supplies recent history.

However, storing separate rows is not sufficient account authorization. The inspected implementation deliberately uses possession of a conversation ID as permission for some operations:

- [Chat read route](../../apps/api/src/routes/chat.ts): `GET /api/v1/chat/:sessionId` loads stored messages by session ID, without an account-ownership check in that route.
- [Chat service](../../apps/api/src/chat/chatService.ts): `ensureSession` accepts an existing session ID after checking that it exists; it does not compare its account owner with the current account. `loadHistory` then loads that session's messages.
- [Privacy routes](../../apps/api/src/routes/privacy.ts) explicitly document possession-of-ID permission for individual conversation deletion.

This describes the code's access model, not a demonstrated compromise. Random IDs reduce guessability, but learning an ID must not grant access to another account's private conversation under the proposed account-private design. Account ownership, tenant membership and guest capabilities need explicit enforcement. No exploit tests or fixes were undertaken in this research-only task.

Public educational knowledge retrieval is also not yet a complete authorization system for private hospital, school or personal documents. That is a new scope to design and verify.

**3. A proposed account-private context design**

For every request, the server establishes the authenticated user and community, then assembles:

```text
community rules and permitted reviewed knowledge
+ that user's permitted personal memory
+ that user's selected conversation
+ explicitly authorized team/case documents
+ the current question
```

It does not add another person's conversations simply because both people use the same community box or model.

Proposed safeguards:

1. Enforce community and owner/resource permissions on reads, writes, search, exports, summaries and deletion. Derive identity from authentication, not a user-selectable prompt or account ID.
2. Apply authorization as part of retrieval selection so unauthorized passages never enter the model context. Similarity search is not an access-control mechanism.
3. Scope personal summaries, embeddings, attachments, caches and background memory jobs as carefully as the original conversations.
4. Make personal memory opt-in, inspectable, correctable and deletable. A user should know when a preference has been saved and what will be reused.
5. Give guests a separate session capability or device-bound mechanism and a clear retention policy. An anonymous session is not automatically a durable account.
6. Handle shared phones and kiosks explicitly: logout, clear local history, avoid automatic account reuse, and define session expiry.
7. Remove revoked access from retrieval and caches, and document the retention and restore behavior of backups.
8. Make sensitive administrative activity follow the community's governed access mechanism, with auditable approval and narrow privileges.

A community's quorum governs system administration. It should not become a blanket permission to publish members' data. Account privacy against other ordinary users is also different from confidentiality against an authorized machine administrator. Stronger protection against the latter may require member-held keys and client processing or an appropriately protected execution environment; encryption at rest alone does not hide plaintext from an authorized running application.

**4. How personal use can contribute without becoming surveillance**

Use explicit contribution and publication steps:

```text
Private use
   |
   | user deliberately proposes a reusable contribution
   v
Private draft / suggestion
   |
   | remove unnecessary personal details; check rights, audience and quality
   v
Reviewer decision
   |
   v
Approved community knowledge
   |
   | separate permissions and review
   +--> Optional network/public contribution
   +--> Optional training dataset
```

The contribution can be a new, reusable example rather than the original conversation. For example, “explain Lightning fees with this local analogy” can be shared without publishing the contributor's financial circumstances.

Approval is purpose-specific. Approval for community retrieval does not establish permission for public release, cross-community sharing or training. Human review, consent, source rights, sensitivity and appropriate institutional authority each have a role; a reviewer click cannot substitute for all of them.

Record source, author or responsible steward, intended audience, permitted uses, reviewer, version and expiry where appropriate. Keep source lineage so a withdrawn or corrected contribution can be traced to derived knowledge and datasets.

Private conversations, student records and patient charts should not automatically become community-wide knowledge, even when their original use was legitimate. When appropriate, contributors can create separately reviewed general educational material from experience, without copying identifiable records.

**5. What “training the community AI” can mean**

| Desired improvement | First mechanism to try | Weight training required? |
|---|---|---|
| Remember my preferred language or current course | Account-scoped memory | No |
| Learn the community's new timetable or approved policy | Reviewed knowledge/RAG update | No |
| Use an approved teaching format or workflow | Instructions, demonstrations and restricted tools | No |
| Consistently speak natural Sheng | Evaluate prompts/examples; then consider a language/style adapter | Sometimes |
| Classify local requests or extract a specialized schema | Evaluate a task model; optionally supervised tuning | Sometimes |
| Make a large model's task fit a smaller local device | Distillation or a task-specific model, after measurement | Usually a separate training project |

The previous fine-tuning work is potentially useful: retain datasets, permissions, evaluation cases, adapters and results. Before another training spend, identify whether each failure came from missing knowledge, retrieval, language style, reasoning limits or deployment configuration. These require different remedies.

If tuning is justified, a proposed release process is:

1. Define one target behavior and success criteria.
2. Establish a base-model-plus-RAG baseline.
3. Collect reviewed, consented, task-relevant examples with clear usage rights.
4. Separate training, validation and a held-out evaluation set; split related conversations/documents together to reduce leakage between sets.
5. Train a limited candidate adapter on an explicitly approved compute environment.
6. Compare with the unchanged baseline using factuality, blind language review, task accuracy, privacy probes, safety and actual serving cost.
7. Have the community approve a versioned release; keep rollback artifacts.

LoRA adapts a model using a relatively small set of additional trainable parameters while the base weights remain frozen. QLoRA-style methods use a quantized base to reduce training memory requirements. These reduce resource requirements; they do not eliminate dataset work or guarantee an improvement. [Hugging Face PEFT](https://huggingface.co/docs/peft/main/en/conceptual_guides/lora).

Do not train a shared adapter on everyone's private memory to personalize the service. Model parameters do not enforce per-account access to memorized facts. Training-data extraction has been demonstrated in published research. [USENIX research](https://www.usenix.org/conference/usenixsecurity21/presentation/carlini-extracting).

A privately trained adapter is a sensitive artifact. Protect its weights, checkpoints, optimizer state, training logs and evaluation samples. Protect the training path separately from the inference path; a confidential inference endpoint does not establish confidential training. Deleting a source row also does not immediately remove its influence from previously trained weights.

RAG remains preferable for frequently changing facts and material requiring per-record access or reliable removal. Training can improve behavior while the community's documents remain outside the weights.

**6. Research shortlist, not a new training campaign**

The immediate task is a documented shortlist and evaluation design. No new model has been measured here. Existing repository scores are prior project evidence, not results obtained in this research.

| Candidate | Proposed role | License/status observed | Research question |
|---|---|---|---|
| Gemma 4 E2B / E4B instruction-tuned | Local waiter or small local answerer | Apache-2.0 | Which exact quantization can handle natural community language and ticket preparation on the local machine? |
| Gemma 4 12B | More capable local or shared answerer | Apache-2.0 | Does the intermediate size improve quality enough to justify its local cost? |
| Gemma 4 26B-A4B | Shared Afribit heavier inference | Apache-2.0; relevant prior repository experiments | Does it sustain required quality and throughput on a validated confidential platform? |
| Qwen3.5-4B | Independent small-model comparison | Apache-2.0 | Can it follow the route/ticket schema and handle Kiswahili and code-switching? |
| Sunflower-Qwen3.5-9B | African-language comparison, especially translation | Apache-2.0; documentation labels it preview | Does adaptation help Kiswahili and local phrasing without weakening factuality? |
| Sunflower-Gemma4-E2B | Small African-language text/speech research | Apache-2.0; preview | Is its language benefit usable for the waiter? |
| BAAI bge-m3 | Local embeddings | MIT; already used by Afribit | Retain the existing retrieval baseline unless another model improves the community benchmark. |
| Tiny Aya Earth / Global | Multilingual research comparison | CC-BY-NC with additional terms | Useful language reference, but unsuitable as an assumed permissive commercial default. |
| InkubaLM-0.4B | Very small African-language research reference | Published card marks CC-BY-NC-4.0 | Investigate task potential; do not assume chat capability or commercial rights. |
| MedGemma | Separate hospital research track | Health AI Developer Foundations terms | Does a defined medical task actually require a specialist model, and can the institution validate it? |

Primary model sources: [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4), [Qwen3.5-4B](https://huggingface.co/Qwen/Qwen3.5-4B), [Sunflower 9B](https://salt.sunbird.ai/models/sunflower-qwen3.5-9b/), [Sunflower Gemma E2B](https://salt.sunbird.ai/models/sunflower-gemma4-e2b/), [bge-m3](https://huggingface.co/BAAI/bge-m3), [Tiny Aya](https://huggingface.co/CohereLabs/tiny-aya-earth), [InkubaLM](https://huggingface.co/lelapa/InkubaLM-0.4B), [MedGemma repository and license distinction](https://github.com/google-health/medgemma).

Sunflower's documentation reports Swahili coverage but explicitly describes uneven coverage, translation emphasis and preview weights. That is a reason to evaluate it, not a reason to assume it already speaks good Sheng. Likewise, an older Qwen failure in Afribit's tests does not establish the performance of every later Qwen release.

Gemma's effective/active parameter labels are not the same as total weight memory. The runtime, model format, context and concurrency matter. Test the exact deployed artifact, including quantization and chat template. A model does not become confidential by license or architecture: that property belongs to its verified execution path.

For a first comparison, prioritize the existing baseline, small Gemma 4, Gemma 4 12B, Qwen3.5-4B, and one Sunflower variant. Keep medical and noncommercial candidates in separate tracks. Judge: language naturalness, factuality, retrieval grounding, refusal when evidence is absent, permission-respecting routing, structured output validity, latency, peak memory and total local-plus-remote cost.

**7. Comparable systems and lessons**

Existing work makes Afribit's proposal more credible. It also shows which pieces should be reused or compared rather than recreated. These examples demonstrate parts of the design; this research does not establish that any one product supplies Afribit's complete intended service.

| Example | Relevant evidence | Lesson / limitation |
|---|---|---|
| Tiles | Its canary product describes local models, peer-to-peer remote inference and encrypted chat sync. | Study device-held identity and shared compute; do not equate its product claims with an audited Afribit deployment. |
| Family Intelligence and DAIR | Mozilla's announced anchor projects include private group memory and pooled organizational compute. | Follow their specifications and operational findings as they emerge; some releases and deployments are still planned. |
| Open WebUI | Documents user-account-scoped memories and resource/group access controls. | Personalization need not require per-user model training. Review administrative defaults and the complete data path. |
| AnythingLLM | Documents Docker multi-user mode with workspace membership. | A workspace is an authorization boundary only when its configuration enforces it; administrators retain broad access. |
| Onyx | Documents organization search, connectors and source permissions. | Permissions should follow source documents; some permission features require its Enterprise Edition. |
| Learning Equality's Kolibri | Provides offline learning through a local server and ordinary client devices. | Study installation, local identity, teacher roles, curated content and updates in disconnected settings. This is not evidence of confidential LLM inference. |
| Sunbird AI / SALT | Publishes African-language models, data, tools and evaluations. | Local-language development is an ecosystem and stewardship process. Compare their resources before paying to repeat adaptation. |
| Zenzeleni | Operates a cooperative-owned community network model. | Mesh sustainability includes local ownership, partnerships, maintenance and skills, beyond the AI component. |
| InstructLab | Demonstrated structured contributions of knowledge and skills for model adaptation. | Learn from its taxonomy and review method; the main repository was archived in April 2026 and points to successor components. |
| HRF | Describes a local-inference Freedom Cluster and a Local Intelligence hardware programme. | Relevant precedent for pooled/local inference and capacity building; published plans are not measured proof of a comparable service. |

Sources: [Tiles product](https://www.tiles.run/), [Mozilla anchor projects](https://www.mozillafoundation.org/en/what-we-do/grantmaking/incubator/human-scale-ai/cohort/), [Open WebUI memory](https://docs.openwebui.com/features/chat-conversations/memory/), [AnythingLLM permissions](https://docs.anythingllm.com/features/security-and-access), [Onyx connectors](https://docs.onyx.app/overview/core_features/connectors), [Kolibri](https://learningequality.org/kolibri/about-kolibri/), [Sunbird release](https://sunbird.ai/introducing-sunflower-v2-an-open-source-ai-suite-for-african-languages/), [Zenzeleni](https://zenzeleni.net/), [InstructLab status](https://github.com/instructlab/instructlab), [HRF programme](https://hrf.org/program/ai-for-individual-rights/).

The useful distinction is not whether Afribit invented memory, RAG or private networking. It is whether its particular users can obtain a safe, maintainable, locally governed service at an acceptable cost, with useful local language. That remains an outcome to demonstrate.

Tiles also documents a free local tier and paid managed capabilities. It is a useful commercial reference for separating an accessible core from operational services. Its exact pricing is not needed to establish Afribit's price. [Tiles service tiers](https://www.tiles.run/book/licenses).

**8. “Community” is a governed organization, not only a neighborhood**

A workable product definition is: a group with an accountable governing body, a defined membership/access policy, a set of shared resources, and authority to set permitted uses. It can occupy one site or several sites. Physical proximity, organizational membership and data authorization are different attributes.

| Setting | Useful starting workflows | Additional boundaries |
|---|---|---|
| Neighborhood or association | Reviewed education, translations, procedures, local services | Personal accounts and explicitly shared group knowledge |
| School | Teacher material search, lesson drafts, approved tutoring content, administration | Student/teacher roles; private learner records; curriculum approval |
| Hospital | Internal policy search, staff training, administrative drafting and selected documentation support | Roles, patient/case access, clinical review, audit and institutional validation |
| Cooperative or small enterprise | Manuals, internal knowledge search, draft communications, controlled workflow assistance | Department/project scopes and authorized business-system actions |

A hospital cannot treat every patient's chart as knowledge readable by every staff member. Personal preferences are account-scoped; clinical records are additionally patient/case-scoped and may legitimately be accessed by several authorized clinicians. A school similarly needs more than one institution-wide chat history.

Model choice should follow the task. A hospital's equipment manual search may use a general model; a medical-image research application may require a specialist. MedGemma's developers describe it as a starting point for downstream applications, with outputs requiring independent verification and clinical correlation. Downloading it is not institutional clinical validation. [MedGemma intended use](https://deepmind.google/models/gemma/medgemma/).

Automation also requires explicit tool permissions, not just relevant documents. Begin with read-only search and drafts; add real-world actions with their own authorization and accountable human approval appropriate to the institution. A model's reply is not an authorization decision.

Self-hostable models can reduce reliance on proprietary APIs while retaining dependence on model releases, runtime software and hardware. Exportable knowledge, evaluation sets and replaceable providers keep that dependency manageable. Serving all these sectors should be a sequence of validated packs and workflows, not a claim that one pilot proves readiness everywhere.

**9. Communities can seek funding for adoption and capability**

An Afribit installation can supply a concrete foundation for a funding application. It does not automatically establish eligibility or guarantee an award. A fundable programme connects the infrastructure to a defined beneficiary group, skills plan, practical outcomes, governance and a credible operating budget.

Keep three budgets clear:

- **Core infrastructure/product work:** reusable software, security work, model evaluation and shared compute.
- **Community adoption:** trainers, local stewards, language reviewers, accessible materials, deployment and measured use.
- **Continuing service:** power, connectivity, support, repairs and compute, supported by revenue, an institution or another explicit long-term funding source.

Paid roles can include local trainers, domain reviewers, language contributors, dataset stewards and node operators. The funding case should explain their work and outputs, rather than promise that every participant becomes an ML engineer or that ordinary conversations become a saleable dataset.

A proposed skills programme could cover AI literacy and privacy; approved knowledge curation; language review and dataset rights; practical workflow building; node operations and restore drills; and advanced model evaluation/adaptation for a smaller technical cohort. Budget reviewer and trainer time directly rather than treating it as free volunteer work.

Use ordinary learning/workflow measures without requiring access to participants' private chats. Examples include skills demonstrations, approved dataset contributions, blind language evaluations, successful restore drills, task completion and paid renewal. Track benefit and operating cost alongside attendance.

Where Afribit is a paid supplier, describe scope, pricing, community ownership and any relationship to the applicant transparently. Check the funder's procurement and conflict rules. Provide an export/exit path so receiving a grant does not lock a community into Afribit.

**10. Specific funding routes checked on the research date**

| Programme | Possible fit | Current qualification |
|---|---|---|
| Mozilla Human-Scale AI Incubator | Technical work on small, local and community-controlled AI | Open call; requires working technology and early evidence of use/contribution. Generic chatbot repackaging is excluded. |
| HRF AI for Individual Rights Fund | Open, private AI tools and education with a clear human-rights use under authoritarian pressure | Rolling applications according to its fund page. A general school or hospital efficiency project alone does not establish this fit. |
| Internet Society Foundation Community-Centered Connectivity | Mesh deployment, adoption, local capacity and connectivity-related training | 2026 application window closed on 7 May. Watch future calls; do not describe this as currently open. |
| NLnet active calls | Potentially open technical infrastructure components | Current form lists Restack/CodeSupply and a 3 November deadline. Its restrictive GenAI policy may conflict with the project's development workflow; assess this before treating it as a candidate. |

Mozilla lists seven projects, with $300,000 initial support and potential follow-on funding bringing support to up to $500,000 over three years. Its deadline converts to **21 November 2026, 10:59 a.m. Africa/Nairobi** from 20 November, 11:59 p.m. PST. Technical novelty, real use and the frontier-model dependency exclusion need attention; alignment with its language is not sufficient eligibility. [Call](https://www.mozillafoundation.org/en/what-we-do/grantmaking/incubator/human-scale-ai/call-for-proposals/), [FAQ](https://www.mozillafoundation.org/ca/what-we-do/grantmaking/incubator/human-scale-ai/call-for-proposals/faqs/).

HRF specifically includes educators and privacy technologists and describes year-round applications. Match the actual beneficiaries and human-rights purpose; avoid fitting an unrelated deployment to the fund's mission. [Fund criteria](https://hrf.org/program/ai-for-individual-rights/ai-for-individual-rights-fund/).

The Internet Society programme explicitly includes community capacity and training-related expenses. Eligibility and experience requirements vary by track; the published page has different shorthand and detailed eligibility wording, so check the future call's exact entity requirements rather than assume every informal group qualifies. Beyond the Net is separately chapter-focused. [Connectivity programme](https://www.isocfoundation.org/grant-programme/community-centered-connectivity/), [Beyond the Net](https://www.isocfoundation.org/grant-programme/beyond-the-net-grant-program/).

NLnet's current deadline is **3 November 2026, 2:00 p.m. Africa/Nairobi** (12:00 CET). Its older NGI0 Commons Fund closed its final call in June 2026. Its 20 October GenAI policy is more restrictive than the application form's disclosure wording: it generally prohibits GenAI-assisted proposal writing and GenAI-produced artifacts in funded work, with an accessibility exception for applications. It also requires disclosure of significant AI-generated code in an existing project. Treat eligibility and workflow compatibility as unresolved; this AI-written research is not an application to submit. No application has been prepared or submitted here. [Current application](https://nlnet.nl/propose/), [GenAI policy](https://nlnet.nl/foundation/policies/generativeAI/), [closed Commons Fund](https://nlnet.nl/commonsfund/index.html).

These are leads to assess, not a confirmed funding pipeline. Grant-funded adoption and service revenue can coexist if the funder's conditions allow it. The sustainability test remains whether the community can maintain useful service after the initial grant.

**11. Research decisions to settle before implementation or more tuning**

1. Define the four context audiences: personal, restricted group/case, community and optional network.
2. Write the contribution, publication and training permissions separately.
3. Record the current session-ID access model and the required account-authorization change before private memory is introduced.
4. Select a short, commercially suitable model comparison set; retain noncommercial and specialist models in distinct tracks.
5. Reuse the existing language evaluation and build a blind community test set before scheduling another training run.
6. Pick one first institutional workflow beyond Bitcoin education rather than launching across sectors simultaneously.
7. Build a community adoption budget and curriculum with measurable outcomes; match it to a suitable call without treating setup as automatic eligibility.

The next valuable artifact would be a model comparison protocol and a context/permission specification. Those can be completed without downloading a new model or spending on training.
