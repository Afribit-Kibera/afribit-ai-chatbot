# ADR 0014 — Community packs: the engine is shared, the community is data

**Status:** Accepted (built and tested; the live Kibera service is unchanged). Amended 3 October 2026: one server can now serve several packs (see "Several packs in one process" below).

**Context:** Afribit AI was written for one community. Its language modes were a closed set in the database schema and the shared types; its identity, safety wording, Sheng rules, few-shot examples, ticket and chef prompts were string constants in nine code files; retrieval filtered on `domain = 'bitcoin'`. Our stated direction, that any community can run its own, was not true of the code: a second community would have had to fork it.

**Decision:** Everything that makes the engine *one community's* assistant moves into a **pack**, a folder with a manifest, text files and knowledge cards (`packs/<id>/`, schema `afribit-community-pack/0.1`). The engine keeps what is the same for everyone: the layout of the prompts, retrieval and rank fusion, the gateway, secret detection, the status gate on knowledge, review tooling.

- The server loads its packs at start (`COMMUNITY_PACK_DIR` for one, default the bundled Kibera pack; `COMMUNITY_PACKS_DIR` for several) and refuses to start if any is invalid. `pack:validate` lists every problem at once.
- Language modes are strings declared by the pack; the database no longer constrains them (migration 011). The API validates against the pack.
- Anything a pack omits falls back to generic, cautious wording, so a new community can start from a manifest, a mode and some cards.
- Retrieval searches the pack's `retrievalDomains`.
- `GET /api/v1/pack` publishes the non-sensitive description (name, modes, starter questions, disclaimers) so a client can configure itself.
- **Safety stays in the engine.** Secret detection can be switched off in a manifest only for domains with no secrets; the status gate (only approved or published cards answer) cannot be.

**How we know nothing regressed:** before the refactor we captured 40 prompts the live system produces (every mode, level and builder). A test (`test:pack`) rebuilds them from the Kibera pack and requires exact equality. A second pack, a fictional library guide in English, is tested for leakage: none of the words bitcoin, kibera, sheng, nairobi, lightning or m-pesa may appear in any prompt it produces.

**Consequences:**

- Another community can run its own assistant without forking. The remaining cost is human: reviewers, and a model that handles their language.
- Serving several packs from one process needs the pack id on every request and per-pack retrieval. Built on 3 October 2026, below.
- The reference web app does not yet read the pack endpoint. *(Note, 8 October 2026: the redesigned web app now configures its modes, starter questions and branding from it, in the development branch.)*
- The Kibera corpus of reviewed vocabulary is still seeded from the database, not carried in the pack.
- Prompts written for a mode are the community's, so the engine can no longer promise a prompt is good. Evaluation stays the community's responsibility, supported by the methods in `docs/evaluation/`.
- "Protocol" would overstate it. It is a pack format and an engine, until a second community has used it.

## Several packs in one process

**Decision:** one API process can serve several packs. A single-pack server is configured and behaves as before.

- **Registry.** `COMMUNITY_PACKS_DIR` names a folder whose subfolders are packs (each with a `pack.json`); `COMMUNITY_PACKS=a,b` limits it to those ids; `DEFAULT_PACK` is the pack a request gets when it names none (default: `kibera-bitcoin` if served, else the first by id). `COMMUNITY_PACK_DIR` keeps meaning exactly one pack, and `COMMUNITY_PACKS_DIR` wins if both are set. Start-up fails, listing every problem, if any served pack is invalid, two share an id, two share a retrieval domain, or two share a card or topic id (the cards tables are keyed by id alone, so a shared id would silently overwrite).
- **Request scoping without a pack parameter everywhere.** A Fastify `onRequest` hook resolves the pack from the `x-pack` header or the `pack` query parameter (unknown id: 404 JSON listing the valid ids; header and query naming different packs: 400) and binds it with Node's `AsyncLocalStorage`. `getPack()` returns the bound pack, else the default, so retrieval, prompt builders, mode checks and the review service needed no signature change. The binding survives `await`s and the hijacked streaming reply in `routes/chat.ts`; the chat routes also rebind explicitly around the model call.
- **Sessions.** A conversation stays with the pack it started in (`chat_sessions.pack_id`). Sending a later message to it without naming a pack uses its pack; naming a different one is a 409. A NULL `pack_id` (anything before migration 014) means the default pack.
- **Per-pack data (migration 014).** `pack_id` on `chat_sessions`, `model_runs` and `language_entries`; `user_pack_preferences` for a learner's language and level in non-default packs (the existing `user_preferences` rows are the default pack's). Knowledge cards need no new column: each pack searches only its own `retrievalDomains`, and the registry guarantees those never overlap.
- **Endpoints.** `GET /api/v1/packs` lists the served packs (id, name, community, domain, default flag; never prompts). `GET /api/v1/pack` describes the request's pack and varies on `x-pack`. The review page is `/review?pack=<id>` and every call it makes names that pack.
- **Metering.** The gateway tags each model call with the pack in scope and the meter writes it to `model_runs.pack_id`; `usage:report` splits and filters by pack.

## Live wording overrides (Voice Lab)

**Decision:** wording can be tuned on a running server without a code change or redeploy. `COMMUNITY_PACK_OVERRIDES_DIR` (unset: feature off, nothing changes) names a folder holding `<packId>/<same relative path as in the pack>` files; `loadPack(dir, { overridesDir })` reads such a file instead of the pack's own for the wording files it already knows by name (mode guides, prompts, few-shots, clean-up rules, synonyms, starter questions) and for nothing else, so the manifest, knowledge and evaluation set cannot be overridden. The image's pack stays the reviewed baseline from git; deleting an override restores it; `pack:overrides-export` brings live edits back into the pack folder.

- **Validated whole.** A change is applied only if the pack still loads with it (checked against a temporary copy of the overrides); a refused change leaves the served pack untouched. A server that starts with a broken override file ignores the overrides and serves the baseline, rather than refusing to start.
- **Atomic swap.** `reloadRegistry` re-reads packs and returns a new registry; the running server swaps it in with one assignment. A request already bound to a pack object (the `AsyncLocalStorage` binding above) finishes with it.
- **Who.** Reviewers and administrators; the five safety-critical prompts (`safety.full`, `safety.compact`, `serve-safety`, `ticket`, `chef`) are administrator only. Every save is written beside a history copy and recorded in `audit_logs`.
- **Trying wording.** `POST /api/v1/voice/preview` runs the real retrieval, prompt builder, gateway, clean-up rules and output checks against a pack with unsaved drafts overlaid in memory; it stores no chat. It is rate-limited per user because each call is a paid model call.

Consequence: a tuned wording is no longer only what is in git. Operators back up the overrides folder, and export edits that should become the baseline.

**What this does not do:**

- Reviewers and admins are accounts on the server, not on a pack: a reviewer can review every pack the server serves. Per-pack reviewer roles are not built.
- Secret detection, the output-safety check and the post-processing of answers are engine code shared by every pack. They were written for the Kibera pack's domain and language; a pack in another domain gets them too.
- Language modes are per pack, so one conversation cannot switch packs. Starting another conversation is the way.
- Model, embedding model and inference mode are server-wide, not per pack.
