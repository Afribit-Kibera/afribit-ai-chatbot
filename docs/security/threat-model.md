# Threat Model

Who might harm a learner or the program, how, and what we do about it. **Status: first version, to be reviewed by an independent security reviewer before the pilot.** It describes the community-node deployment; the cloud demo shares most of it.

## What we are protecting

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
| A GPU host silently running the model on its CPU | The gate's `/healthz` fails unless every loaded model is fully on the GPU (seen on a rented GPU on 8 Oct 2026) | Alerting on `/healthz` |
| Box unreachable from the GPU server, or the server down | Card-first answers when no model is reachable (built) | A second GPU; a status page; no cloud fallback unless the community chose `hybrid` |
| A leader reading members' conversations | Pilot console shows aggregates; individual text only for reported, not-helpful or flagged answers | The same rule in the community console; learner memory visible only to its owner |
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

This model is reviewed at each program phase and after any incident, and findings and fixes from reviews are published. To report a vulnerability, see [SECURITY.md](../../SECURITY.md).
