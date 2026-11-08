# Education harness options for Afribit AI

**Adoption update,6 November:** Edmund selected Open Notebook. The first restricted source-engine
integration is built and verified locally: text/Markdown import/read/erasure, Afribit ownership and
community scoping, bounded lexical excerpts and local-only gateway chat. No embedded Open Notebook
UI or general upstream proxy; Afribit retains its learner experience and language packs. The real
upstream lifecycle uses synthetic inference, so model/learning quality remains unmeasured. See
[implementation](../features/F-034-education-entry-and-private-notebooks.md) and
[setup/evidence](../guides/open-notebook-source-engine.md). The research below records the selection
rationale rather than claiming every advertised upstream feature has been adopted.

Researched 6 November 2026 from primary project documentation. Product recommendation, not an
installation, compatibility verification, license clearance or security audit.

## Recommendation

Build the education experience around Afribit's community/account controls and model gateway.
Evaluate **Open Notebook** first for reusable source/notebook processing; learn from **LearnHouse**
for optional guided learning and **Kolibri** for future offline delivery. These projects address
different parts of the problem. Do not deploy three new platforms to prove one Bitcoin101 journey.

The proposed product is a source-grounded educational conversation with optional microlearning,
not a requirement that staff author a complete course before anyone can ask a question. An educational
“harness” means the surrounding source, teaching, permission and evaluation workflow. It does not
mean training model weights, and RAG by itself does not provide pedagogy or privacy.

## What exists

| Project | Published capabilities relevant here | License shown by project | Fit and limitation for Afribit |
|---|---|---|---|
| [Open Notebook](https://github.com/lfnovo/open-notebook) | Self-hosted notebooks, source-based chat/citations, local or hosted providers, REST API | [MIT](https://github.com/lfnovo/open-notebook/blob/main/LICENSE) | Closest source/notebook candidate. Verify member/community isolation and processing routes; self-hosting the UI does not keep cloud prompts local. Not proof of our educational outcomes. |
| [LearnHouse](https://github.com/learnhouse/learnhouse) | Course editing, assignments, context-aware AI, analytics and user groups; several enterprise features are listed separately | [AGPL-3.0](https://github.com/learnhouse/learnhouse/blob/dev/LICENSE) | Useful guided-learning reference. Broader teacher/LMS product than this pilot needs; assess the license and feature boundaries before adopting code. |
| [Kolibri](https://github.com/learningequality/kolibri) | Offline-first teaching and learning platform | [MIT](https://github.com/learningequality/kolibri/blob/develop/LICENSE) | Learn from content delivery in low-connectivity settings. This is not a private generative inference service or an automatic integration with our box. |

Open Notebook's current quick start explicitly warns that its default published UI/API have no
password; it provides binding/password mitigation. That is a concrete reason to evaluate it behind
appropriate access controls rather than expose a default instance as the community service.
Its advertised sovereignty/privacy claims do not replace reviewing provider, embedding and extraction
data flows. These observations come from its [README](https://github.com/lfnovo/open-notebook).

## Build/borrow boundary

**Consider borrowing:** document parsing/imports, notebook/source organization, retrieval/citation
interfaces and useful evaluation fixtures after code, license and compatibility review.

**Afribit must own and verify:** private account/community scoping, approved shared-source policy,
operator responsibilities, English/Kiswahili/community-specific Sheng guidance, optional short-step
teaching, versioned publishing, source-to-answer traceability, route permission and cost limits.
Reusing a library must not introduce a second unscoped store, automatic cloud embedding call or
provider key in the browser.

Before any adoption, run a bounded synthetic spike: import a permitted test text; query a known
fact; open the supporting passage; test an unanswerable question and injected source instruction;
attempt cross-member/cross-community access; trace every extraction/embedding/model request; export
and delete the source. Record version/commit, dependencies, hardware, latency and actual costs.
No such integration spike has run in this research pass.

## Sources and training are separate

Importing a resource makes it available for permitted retrieval. It does not bake that resource
into model weights. Language guidance and approved example pairs can change how an answer is
phrased without retraining. Later fine-tuning could target observed language/behavior gaps using
consented examples and held-out evaluations, but it should not substitute for a changing source library.

For a trusted default Bitcoin101 pack, a curator selects source versions; AI suggests an outline
and small steps; factual/language reviewers qualify defaults. For a personal imported source,
the member can ask about it immediately after permitted extraction/indexing, with clear source
references and uncertainty. It does not enter community knowledge or a training corpus by default.
Web search is a separate connected tool with provenance, permissions and explicit scope; a search
result is neither an authoritative fact nor a license to redistribute a whole resource.

## What to prove next

Compare the same reviewed Bitcoin101 concept in a fixed baseline explanation and the new
source-grounded conversational/guided experience. Use adult learners' own-word explanations and
simple scenarios, not satisfaction alone. Check whether extra examples improve understanding or
introduce errors. Have local reviewers judge Sheng versions by community rather than treating
one generic Sheng score as universal. Publish scoped findings, including failures and costs.

This is a plausible approach to language, complexity and access barriers. It still requires
reachable hosting, permitted sources, usable devices/data and reliable answer quality. It is not
evidence that books, libraries, instructors or public infrastructure are unnecessary.

## OpenRouter intro-video check

[OpenRouter's video documentation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)
describes an asynchronous submit/poll/download API. A public catalog fetched during this pass lists
`google/veo-3.1-lite`, four seconds, 720p, silent, at $0.03/second: estimated $0.12. Pricing is a
dated estimate; the job record and provider billing determine the eventual charge. The user approved
an additional $1 experiment envelope; the original $10 showcase ledger is unchanged.

The prompt contains public design context only. Video generation is not eligible for OpenRouter's
zero-data-retention routing, according to that documentation. No account privacy setting was changed
to make the request. A decorative intro is not a model-loading indicator, a privacy feature or
evidence that the educational harness works.
