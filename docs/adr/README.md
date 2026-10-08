# Architecture Decision Records

One short file per significant decision, so the reasoning stays traceable as the code evolves. New decisions get a new numbered file; an accepted decision is changed by a new ADR that supersedes it, not by silently editing history (small implementation notes are fine).

| # | Decision |
|---|---|
| [0001](0001-use-openrouter-first.md) | Use OpenRouter first |
| [0002](0002-provider-abstraction-mandatory.md) | Provider abstraction is mandatory |
| [0003](0003-no-fine-tuning-initially.md) | Do not fine-tune initially |
| [0004](0004-rag-is-primary-knowledge-pattern.md) | RAG is the primary knowledge pattern |
| [0005](0005-microtasks-human-feedback-layer.md) | Microtasks is the human feedback layer |
| [0006](0006-community-language-user-selectable.md) | Community language is user-selectable |
| [0007](0007-community-node-and-tiered-clients.md) | Community node, tiered clients |
| [0008](0008-content-based-secret-detection.md) | Detect secrets by content, not keyword |
| [0009](0009-inference-modes-and-privacy.md) | Inference modes: cloud, node, hybrid |
| [0010](0010-compact-prompt-and-the-waiter.md) | A compact prompt, and a waiter that speaks the customer's language |
| [0011](0011-rank-fusion-for-retrieval.md) | Fuse search results by rank, not by score |
| [0012](0012-the-restaurant-pipeline.md) | The restaurant: waiter, chef, and a pantry the community owns |
| [0013](0013-local-embeddings.md) | Embeddings that run on the node (bge-m3) |
| [0014](0014-community-packs.md) | Community packs: the engine is shared, the community is data |
| [0015](0015-how-the-assistant-learns.md) | How the assistant learns: memory now, models in releases (amends 0003) |
| [0016](0016-afribit-local-community-box.md) | Afribit Local: a community box with Afribit's GPUs |
| [0017](0017-ask-anything-mode.md) | An "Ask anything" mode: separate, labelled, off by default |
| [0018](0018-open-licensed-default-model.md) | Default to an open-licensed model: Gemma 4, if it matches Gemma 3 |
