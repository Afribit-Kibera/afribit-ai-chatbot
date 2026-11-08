# Developer gateway (draft concept)

Status: **draft, not built, 2 October 2026.** Written to be shared and argued with. Nothing here is a promise.

## The idea

Developers building tools for their own communities need three things the big AI platforms provide, and one they don't:

1. A model they can call.
2. Knowledge that is theirs, not scraped.
3. Visibility into token use and cost.
4. **Independence.** Their tool should not stop working, change behaviour or get repriced because one company in another country changed a policy.

The Afribit AI engine already separates the community's work (the pack: language, rules, reviewed knowledge) from the model that does the writing. That separation is the foundation for a developer offer.

## What exists today

- A **provider abstraction**: the engine talks to "a model" through one interface. Hosted models (via OpenRouter, with zero-data-retention providers) and local models (Ollama, or any OpenAI-compatible server) are interchangeable, per profile. This is a hard rule in the codebase.
- **Three inference modes:** `cloud`, `node` (local only, nothing leaves the network) and `hybrid` (local first, cloud as fallback).
- **Token counts** are recorded per message (prompt and completion tokens), and the provider reports them.
- **Packs:** a developer can ship their own community's pack and run the whole engine against it.

## What would be built

| Piece | What it does | Size |
|---|---|---|
| **Usage metering** | Per-key and per-pack token and cost totals; `pnpm usage:report` first, an endpoint later | Small |
| **API keys and an OpenAI-compatible endpoint** | A developer points an existing client library at the engine and gets pack-grounded answers | Medium |
| **Credits** | Prepaid balance per key. Bitcoin Lightning via a self-hosted BTCPay server, so Afribit never holds user funds. Learners are always free; developers pay | Medium |
| **Compute contributors** | A host of a local node can offer spare capacity. Developers buy time per token; the host is paid. A routing and trust problem, so it comes after the three rows above | Large, research |

## The hybrid idea, stated carefully

The proposal: a developer whose own machine can't serve a model could buy tokens from a community node nearby instead of from a distant company, and a community that has a GPU could earn by selling its idle time. That would keep money and control closer to home and reduce dependence on globally controlled models.

What we do **not** yet know:

- Whether the economics work. A 10–16 GB GPU serves a handful of simultaneous users; per-token income at a community's likely demand may be small. The pilot is how we find out.
- How to route a request to a node a developer has no reason to trust, without leaking their users' questions. The restaurant design (a scrubbed English ticket goes to the hosted model) is one answer for one case, and we have measured its limits: it is not a guarantee.
- Whether developers want this rather than simply running their own model, which is a fine outcome too.

## Independence from "global control" models

Honest framing: the engine today still uses a hosted model for the cloud service. What it removes is the *lock-in*, not the *dependency on good open models existing*. Community knowledge, language rules and evaluation are in the community's pack and database; if a hosted provider vanishes, the same pack runs on a local open-weight model (Gemma 3 12B, Qwen and others are tested). It is not true that a community can "shape" a model by this route: it shapes what the model is *given and allowed to say*. Fine-tuning a community's own model is a separate, later decision ([ADR 0003](../adr/0003-no-fine-tuning-initially.md)).

## Open questions (we want answers from developers)

1. Would you call an OpenAI-compatible endpoint, or do you want a different shape?
2. What would you pay, and in what, per thousand questions?
3. Is "grounded in a pack" the feature, or is it just the model you want?
4. If you run a node, would you sell spare capacity, and what trust would you need before routing strangers' questions through it?
