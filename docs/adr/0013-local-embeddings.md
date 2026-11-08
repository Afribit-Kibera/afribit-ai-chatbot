# ADR 0013 — Embeddings that run on the node (bge-m3)

**Status:** Accepted (built and tested; the hosted default is unchanged until measured in production).

**Context:** Finding the right knowledge card needs embeddings of the customer's question and of each card. We used one hosted model (OpenAI `text-embedding-3-small`, 1536 dimensions), stored in a fixed-size column. That left a community node in a bind: in `node` mode nothing may call a hosted API, so semantic search was switched off and retrieval fell back to full-text search, which found the right card in the top 3 for only 42% of benchmark questions (15% for the waiter's English question).

**Evidence (40 questions in Sheng, Kiswahili, English; models run through llama.cpp on a laptop CPU, semantic search only):**

| Embedding model | Size | Licence | Raw questions: top 1 / top 3 / top 5 | With the waiter's English question | Speed per question (CPU) |
|---|---|---|---|---|---|
| **bge-m3** | 635 MB | MIT | **34 / 40 / 40** of 40 | 37 / 40 / 40 | ~40 ms |
| EmbeddingGemma 300M | 334 MB | Gemma terms | 26 / 37 / 37 | 36 / 40 / 40 | ~30 ms |
| Qwen3-Embedding 0.6B | 639 MB | Apache-2.0 | 19 / 31 / 32 | 38 / 39 / 40 | ~160 ms |
| Nomic embed v1.5 (English-leaning) | 146 MB | Apache-2.0 | 16 / 25 / 27 | 38 / 40 / 40 | ~23 ms |
| *OpenAI text-embedding-3-small (hosted, what we used)* | — | — | *20 / 35 / 36* | *37 / 40 / 40* | — |

bge-m3, a multilingual model, **beats the hosted model on raw Sheng and Kiswahili questions, runs on an ordinary CPU, and needs no cloud**. An English-only model becomes just as good once the waiter has rewritten the question in English — one more reason the waiter earns its place.

**Decision:**

- Embeddings come from a provider chosen by `EMBEDDING_PROVIDER`: `local` (the node's own model server — Ollama or an OpenAI-compatible server) or `openrouter` (hosted). In `node` mode the default is `local`; elsewhere it is `openrouter`. A hosted provider in node mode is off unless explicitly allowed, as before.
- The default local model is **bge-m3**, run on the CPU (`LOCAL_EMBEDDING_NUM_GPU=0`), leaving the GPU's memory to the chat model. bge-m3 is also available hosted (`baai/bge-m3`), so a cloud deployment can use the same model.
- Vectors are stored **per model and per dimension** (migration 010, `knowledge_embeddings_v2`), with the model id recorded (`local:bge-m3`, `baai/bge-m3`, `openai/text-embedding-3-small`). A question is only ever compared with vectors made by the same model. Switching models is a setting plus `embedBackfill`, not a destructive migration; existing vectors were carried across so a deployment keeps working at the moment the migration runs. There is no vector index (a few hundred cards scan instantly); one can be added per model if the corpus grows large.

**Consequences:** On the repo's own benchmark, in `node` mode with no cloud key at all, the right card is in the top 3 for **97.5%** of questions and the top 5 for **100%** (production, with the hosted model, was 82.5% and 87.5%). A node no longer has to choose between privacy and search quality. Hosted and local copies of the same model are separate ids because their vectors are close but not identical. The community-approved ranking of cards is now only as good as the embedding model, so the retrieval benchmark must be rerun whenever the model changes.
