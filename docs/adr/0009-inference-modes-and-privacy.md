# ADR 0009 — Inference Modes: `cloud`, `node`, `hybrid`

**Status:** Accepted

**Context:** "Private" must mean something precise. Zero-data-retention from a hosted provider is a contractual promise that the provider will not keep a question; the question still leaves the community and passes through third parties. A community node can offer a stronger property — nothing leaves the network — but only if no other part of the request path quietly calls the cloud (for example, embedding the user's question for semantic search).

**Decision:** A deployment runs in exactly one mode, set with `INFERENCE_MODE`:

| Mode | Chat model | Question embeddings | If the model fails |
|---|---|---|---|
| `cloud` (default) | hosted (OpenRouter, zero-data-retention routing) | hosted | fall back to a cheaper hosted model, then to a knowledge card |
| `node` | the node's own model server | **local** (bge-m3 on the node; ADR 0013) | answer straight from the reviewed knowledge cards; **never** call the cloud |
| `hybrid` | the node first | on | fall back to the hosted model — **this sends the question outside the community** |

`hybrid` is an explicit opt-in that deployments must disclose to their users. `OPENROUTER_API_KEY` is not required in `node` mode. Gateway timeouts are per profile, because a modest node needs minutes where a hosted API needs seconds.

**Consequences:** In `node` mode questions are embedded by a local model ([ADR 0013](0013-local-embeddings.md)), so retrieval keeps its quality with no cloud call. Privacy claims in documents and grant materials must name the mode they describe.
