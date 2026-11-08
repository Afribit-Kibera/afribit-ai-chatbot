# Threat Model

Who might harm a learner or the program, how, and what we do about it. **Status: first version, to be reviewed by an independent security reviewer before the pilot.** It describes the community-node deployment; the cloud demo shares most of it.

## What we are protecting

**F-022 update (27 October, synthetic local inference):** pinned model/runtime artifacts are verified
before use; unsafe archive entries are refused. Temporary CPU inference binds loopback and uses a
generated key; missing/wrong keys returned 401 before the eight valid requests. The owned process exited.
This does not establish host confidentiality, OS-level absence of egress, crash-proof cleanup or answer
safety. AI inspection held the checkpoint/recipe for poor language and missing recovery-phrase advice.
No production route or learner release was enabled; see the [actual report](../evaluation/trials/2026-10-27-local-cpu.md).

**F-021/QVAC review (26 October):** public model metadata cannot activate routes, authorize data egress
or verify actual weight bytes. The reader has fixed public origins, time/body bounds, no credentials,
safe artifact paths and no redirects/downloads. QVAC's reviewed native RPC docs explicitly require a
trusted network: transport lacks authentication/encryption. No QVAC runtime or attested TEE has been
verified here; see the [assessment](../research/2026-10-26-qvac-and-afribit-fit.md) and
[metadata guide](../guides/model-discovery.md). Existing processing/account boundaries remain required.

**F-020 update (26 October, localhost trials):** documentation precedes new showcase work, including
refusals, and model-attempt start events survive an interrupted answer. A rental watchdog locks an
immutable Pod lease, checks exact identity/storage before termination, and separates observed absence
from an unreconciled bill. Independent volumes/unknown resources are never deleted. Host/disk/control-
plane failure can still prevent cleanup; upstream limits and independent supervision remain required.
No real resource was controlled. See the [trial register](../evaluation/trials/README.md) and
[rental guide](../guides/rental-watchdog.md).

**F-019 update (26 October, localhost proof only):** isolated synthetic evaluations bind pack, inputs,
routes and source/runtime settings to a persistent experiment ledger with an exclusive process lock.
CLI scope cannot replace installed API admission or weaken processing privacy. It reads no learner tables.
This is trusted local state, not tamper-proof accounting or a global cap across separate files/tools.
Provider account limits, rental shutdown, input provenance and actual billing remain dependencies;
see the [evaluation guide](../guides/showcase-evaluation.md). No host-confidential or quality claim is added.

**F-018 update (26 October, local tests only):** API model/embedding dispatch requires an enabled pack
policy. Effective models and exact endpoints, context/output bounds and requested regional routes are
checked before an atomic daily allowance/attempt reservation. Stale/revoked policy and storage failures
deny dispatch. All outcomes retain the full reservation, and reported overruns stop new work. Transport
deadlines/cancellation and partial-stream failure cannot initiate an extra fallback after output starts.
These controls do not verify physical residency, guarantee provider invoices or cap hourly rentals;
upstream account limits and an overall evaluation/rental controller remain required. Trusted host/CLI
code can bypass application admission with provider credentials. Migration 024 is not deployed.
See the [compute policy guide](../guides/community-compute-policy.md).

**F-017 update (26 October, local tests only):** a member's explicit local-only question and existing
local-memory restrictions are enforced before auxiliary calls. Async policy covers the gateway,
embedding providers and background gap labelling; nested scopes cannot weaken it. Policy/history are
captured together before question insertion to exclude later restricted turns from already-running
remote requests. Reviewed-only answers invoke no model or embedding service. Failures/429 do not
escalate local-only requests to cloud. Endpoint configuration and host remain trusted; allowlists,
community spend limits, document/team ACLs and real-device evidence are pending. Migration 023 is not
deployed. [Processing guide](../guides/processing-policy.md).

**F-011/F-016 update (26 October, local tests only):** explicit account/pack notes are off by default and
local-only by default. Final-answer context is isolated from search rewriting, embeddings, chef and gap
labelling. Gateway/provider guards cover remote primaries, fallbacks and redirects. Conversations that
used local-only notes retain that restriction through later turns. Account report/flag queues hide stored
chat text absent explicit attachment. Reviewers see only deliberately submitted snapshots; publication
needs two distinct current reviewers. Generated cards have pack scope even when domains overlap and are
excluded from generic review/indexing. Live withdrawal clears copies/cards and derived rows. Host/root
access, running requests and backups remain trust/erasure limits; restore replay and document/team ACLs
are pending. [Memory guide](../guides/personal-memory.md). Migration 022 is not deployed.

**F-015 update (26 October, local tests only):** learner accounts have no contributor/reviewer powers.
Members-only communities check current database membership before protected APIs and internal chat setup,
including implicit cross-pack continuation. Scoped invitations are single-use and hashed; revocation applies
to subsequent requests even with a live JWT. Account and guest browser workspaces are separate, and account
chat text stays out of localStorage. The current administrator still controls enrollment/policy and the host
remains trusted. [Operator guide](../guides/community-membership.md). Migration 021 is not deployed.

**26 October implementation update (local tests only):** [F-014](../features/F-014-private-conversation-access.md)
adds account-owner checks and separately hashed, expiring guest capabilities to conversation operations,
including feedback, linked suggestions and deletion. Account preferences now require verified sign-in.
Apply migration 020 and deploy the matching client/API together. IDs alone cannot recover old ownerless
sessions. Guest browser storage remains accessible to people sharing that browser profile; public pack
selection does not establish private-community membership. Root/host operators remain trusted.

| Asset | Why it matters |
|---|---|
| **Learners' safety** | A wrong or manipulated answer can cost someone their savings |
| **Integrity of knowledge and language** | If bad content is approved, the AI teaches it confidently |
| **Learners' questions and identity** | Questions about money, scams or government can expose people |
| **Contributor and admin accounts** | They can change what the AI teaches |
| **Node availability** | A community that relies on it needs it to work |
| **The community's trust** | Hard to earn, easy to lose |

## Who we worry about

| Adversary | Goal |
|---|---|
| **Scammers** | Impersonate Afribit; trick learners into sharing seed phrases or PINs; poison the content to promote scams |
| **Malicious or careless contributors** | Insert harmful "phrases", game votes, create fake accounts |
| **Local pressure** | Someone with influence demanding logs, or access to the node |
| **Thieves** | Steal or tamper with the hardware |
| **Network attackers on shared Wi-Fi** | Impersonate the node, intercept traffic |
| **Model failure** | Hallucination, unsafe advice, jailbreaks and prompt injection through retrieved text |
| **Supply chain** | Tampered container images or model files |
| **A compromised steward or maintainer** | Abuse of privileged access |
| **Afribit as a host** (Afribit Local) | An operator, or someone who compromises Afribit's GPU server, reading or keeping questions in transit |
| **Community insiders with power** | A leader or administrator trying to see what particular members asked |

## Threats and responses

| Threat | Response today | Planned |
|---|---|---|
| Model asks for, or repeats, a secret or promises returns | Safety floor in the prompt; **output safety check** blocks such responses | Wider adversarial test set |
| Learner pastes a seed phrase, key, PIN or password | **Content-based detection** refuses it, does not store it, never forwards it ([ADR 0008](../adr/0008-content-based-secret-detection.md)) | More key formats; clearer in-language warnings |
| Poisoned or wrong knowledge | **Status gate**: only approved/published content is retrievable; no self-approval | Reviewer quorum; signed knowledge packs; content diffs for review |
| Poisoned language data | Contributions arrive as drafts with all use permissions off; self-review blocked | Reputation, sampling, duplicate/Sybil checks |
| Fake contributor accounts (vote gaming, queue flooding) | **Accounts by invitation only (F-012, built 8 Oct 2026):** a single-use code from an administrator, stored only as a hash, expiring, revocable; never an administrator by invitation; one generic refusal so the form reveals neither live codes nor registered emails; sign-up limited to 10 tries per 15 minutes per address; every invitation created, used or revoked is audited | Email invitations once an email service exists; review accounts made before 8 Oct 2026 |
| Prompt injection through content | Only reviewed content is retrievable, so an attacker must first get text approved; the output safety check still applies | Automated injection tests on every content change |
| Questions leave the community | `node` mode makes **no** cloud calls (chat or embeddings); cloud is opt-in `hybrid` | Network egress deny-list on the node as defence in depth |
| Logs demanded or stolen | Minimal stored data; secret-bearing messages redacted; prompt logging off; **no-storage mode and a retention period (F-002, built 8 Oct 2026)**; people can delete their own conversations and accounts | Disk encryption required in the node checklist; 14-day backup rotation |
| Physical theft/tamper | — | Hardening checklist: full-disk encryption, locked location, BIOS/boot password, off-site database backup |
| Rogue Wi-Fi / MITM | HTTPS only (Caddy redirects plain HTTP) | Documented CA-trust procedure; HSTS; certificate guidance |
| Abuse of free access (spam, load) | Per-IP rate limits | Per-device limits; request queue; abuse dashboard for stewards |
| Tampered images or models | — (the kit currently uses `latest` image tags) | Pin image versions and digests; signed releases; model file hashes |
| Compromised admin | No public path to admin (not by sign-up, not by invitation); admins promoted by an operator CLI or by another admin, checked against the database's current role; JWT auth | Audit log of content changes; two-person approval for publishing |
| Poisoning through Teach mode ("say it your way") | **Built (F-003):** nothing is used until a reviewer approves; self-approval refused; safety topics need two different reviewers; secrets refused; 5/hour per address and 3/day per conversation; every decision audited | Every suggestion goes to reviewers; nothing reaches other members without approval; a second reviewer for safety topics; rate limits and contributor reputation |
| Questions read or kept on Afribit's GPU server (Afribit Local) | **Built, not yet in service (F-006, 8 Oct 2026):** WireGuard tunnel, the gate reachable only through it; a key per community, stored as a hash and bound to that box's tunnel address; only chat and model-list requests pass; one log line per request with no text, key or address; usage written as counts only; host hardening (no swap, no core dumps, `/tmp` in memory, capped logs, Ollama debug off) checked by `check-host.sh`, with a canary question | Independent security review before the first community; the server in Kenya with full-disk encryption; operator access logged; later, confidential computing |
| Re-identifying someone from the gap list | **Built (F-004):** topics, not questions: labels are general by instruction and checked for digits, phone numbers, emails, links and secrets; only the day is kept, and the score is rounded, so a gap can't be matched to a chat; topics show only at 5 or more | Review the labels after the pilot's first month |
| A GPU host silently running the model on its CPU | The gate's `/healthz` fails unless every loaded model is fully on the GPU (seen on a rented GPU on 8 Oct 2026) | Alerting on `/healthz` |
| Box unreachable from the GPU server, or the server down | Card-first answers when no model is reachable (built) | A second GPU; a status page; no cloud fallback unless the community chose `hybrid` |
| A leader reading members' conversations | New account flow (local tests): explicit attachment required to show account chat text, even for thumbs-down/flags; private memory APIs have no admin override | Host remains trusted; independent review, document ACLs and backup erasure replay before the pilot |
| "Ask anything" answers mistaken for reviewed ones | — (planned feature) | Off by default; explicit mode switch; a label on every answer; same safety checks; its own test set before any community switches it on |
| A model change that silently weakens safety | Model profiles are configuration; changes are reviewed | Every model or adapter change runs the safety suite and is logged with its digest ([ADR 0018](../adr/0018-open-licensed-default-model.md), [ADR 0015](../adr/0015-how-the-assistant-learns.md)) |

## What we do not protect against

Be honest about the limits:

- A determined, well-resourced adversary with **physical access** to a running node.
- A **compromised steward** acting with full privileges (we reduce, but cannot remove, this risk).
- A learner who shares a secret **despite warnings**, in a form the detector does not recognise.
- A **bad answer the model produces** that passes the output check. We reduce this with retrieval from approved content and testing, and we measure it, but cannot eliminate it. Learners are told never to treat answers as financial advice.

## Node hardening checklist (draft)

- [ ] Full-disk encryption; strong host login, SSH keys only
- [ ] Only ports 80/443 exposed; database and model server reachable only inside the container network
- [ ] `INFERENCE_MODE=node`; no cloud API key present on the machine
- [ ] No-storage or short-retention setting enabled; backups encrypted and tested
- [ ] Automatic security updates; image and model versions recorded
- [ ] UPS / safe shutdown; a written recovery procedure; a spare
- [ ] A named steward and a way for learners to report problems

## Review

**28 October 2026, integrated rental preparation:** the rehearsal's logical remote identities remain
remote to privacy policy even though its HTTP/model fixtures bind loopback. Known local-only, foreign
owner/community, draft and other-pack canaries are checked before synthetic egress. Native context
checks operate in an explicit operator scope on the final assembled prompt; default deployments are
unchanged. Per-answer location now checks the native adapter's configured endpoint, avoiding a local
label on a remote rental. These controls do not hide permitted request content from the ordinary
rental host, nor substitute for private-document ACLs,4-of-7 privileged administration or attestation.
The live hook requires fresh supervisor/worker declarations, immutable lease fingerprint/deadline,
bounded attempts and cancellation; both local controller processes can still be lost together.
[Actual preparation evidence and limits](../evaluation/trials/2026-10-28-community-rental-preparation.md).

This model is reviewed at each program phase and after any incident, and findings and fixes from reviews are published. To report a vulnerability, see [SECURITY.md](../../SECURITY.md).
