# Afribit AI

**A community's own AI: Bitcoin education in Sheng, Kiswahili and English, built from an open engine and a community pack**

Whitepaper · Afribit Africa · Kibera, Nairobi, Kenya · Status as of 8 October 2026

> **How to read this paper.** Every capability carries one of four status labels:
>
> - **Live**: in service on Afribit's public service today.
> - **Built and tested**: the software exists and has been tested, but it is not in service for any community.
> - **Decided**: agreed in a written decision record, not yet built (or, for a policy, not yet used).
> - **Idea**: a later plan or an open research question.
>
> Every number gives its date, what it measured and its main caveat. Most language-quality results so far were
> scored by an AI judge on test cases we wrote ourselves; people have not yet scored them blind. Appendix B lists
> the repository files behind each claim.

---

## 1. Summary

**What it is.** Afribit AI is open-source software for a community's own AI assistant. Its first use is Bitcoin
education for Kibera and Nairobi: learners ask in Sheng, Kiswahili, English or a mix, at the level they choose. It
has two parts:

- **an engine** that anyone may run and change (Apache-2.0);
- **a community pack**: a folder holding a community's languages, voice, safety wording and the knowledge its own
  reviewers have approved (CC BY-SA 4.0 for the Kibera pack).

The assistant answers from that reviewed knowledge, not from whatever a language model remembers. When the
knowledge does not cover a question, it is designed to say so rather than guess.

**The core claim.** *The community owns the knowledge, the voice and the review; the model is replaceable.* Models
change every few months. The reviewed knowledge cards, the approved ways of saying things, the test questions and
the review process stay with the community and work with the next model.

**Why it matters.** Most general AI assistants answer Sheng speakers in textbook Kiswahili. They can be fluent and wrong
at once, which in Bitcoin can cost someone their savings. And they run on servers the community neither owns nor
controls.

**Where it stands on 8 October 2026.**

- **Live:** a public service at https://ai.afribit.africa. It is the *cloud* setup: questions go to hosted models
  with zero-data-retention routing requested, and chats are deleted from Afribit's server after 30 days. Also live:
  - retrieval from reviewed knowledge and secret detection;
  - a label telling members where the AI runs;
  - deletion of chats and accounts;
  - "say it your way" suggestions with reviewer approval;
  - accounts by invitation only.
- **Built and tested, not in service:**
  - a **community node**: a machine with its own GPU, on the community's network, from which no question leaves;
  - **Afribit Local**: a box at the community holds the data, and Afribit's GPU server in Kenya answers without
    keeping anything;
  - **the gap list**: reviewers see the topics people ask about that no card answers, without any question text
    being kept.

  Afribit Local was tested end to end with a rented GPU in Europe standing in, using test questions only. Afribit
  has no GPU in Kenya yet, Afribit Local is not running for any community, and it has no price.
- **Decided, not built:** an optional "Ask anything" mode, opt-in learner memory, and model changes only in
  releases the community tests and votes on.

**Measured, with caveats.**

- The right knowledge card is in the top 3 search results for **97.5%** of our own 40 test questions (was 25%).
- On our own 15 test cases (AI judge, one run), the same open models passed **1–2** without the engine and
  **13–15** with it.
- Gemma 4 26B-A4B, an Apache-licensed model, scored **14/15** at 4-bit and was accurate on **15/15** (same
  caveats).
- The Afribit Local path gave full answers in **2.4–4.0 s**, and served four people at once in **7.8 s**, with no
  question text in the GPU-side logs. This used test questions, timed from Nairobi against a rented GPU in Romania.

**Not proven.**

- No pilot with real learners, so no user numbers or learning outcomes.
- No human blind review of language quality.
- The community-written benchmark has not run.
- No second community has used the pack format.
- No operation without internet over the community's Wi-Fi.
- No legal review under Kenya's Data Protection Act yet.

---

## 2. The problem

### 2.1 The wrong language

Most AI assistants answer a Sheng question in formal textbook Kiswahili. Most Bitcoin material assumes the reader
already understands banks and computer networks. Beginners switch off.

We saw this ourselves. In September 2026 a large hosted model (Llama 3.3 70B) opened and closed its answers in
Sheng but wrote the body in formal Kiswahili, and a prompt fix alone did not clear it. There is little Kiswahili
text to train models on, and far less Sheng. The project's rule: *the community does not have to learn to speak
like AI; the AI learns to speak like the community.*

### 2.2 Fluent but wrong

An answer in your own words is persuasive, so a fluent wrong answer does more harm than an awkward one. In Bitcoin,
wrong can mean lost savings, and people who stay with Bitcoin become targets for scams. Our evaluations show the
danger:

- **2 October 2026.** Gemma 3 12B, an open model, passed our language rubric on 15 of 15 cases with our long
  prompt, but a separate accuracy judge found only 6 accurate. Among other errors, it implied that someone helping with a stuck
  payment could need the seed phrase.
- **8 October 2026.** Open models *without* our engine:
  - advised against writing a recovery phrase on paper;
  - explained M-Pesa instead of a Bitcoin wallet;
  - sent a user to a block explorer to look up a Lightning payment;
  - said on-chain fees come from miners rather than being paid by the sender.

A language score alone would have missed the first case. Every evaluation now has a separate accuracy check.

### 2.3 Someone else's AI

Useful AI usually means an account, a data bundle and a distant company's servers. Those with the most to gain
from clear Bitcoin education are often least able to pay per question, and have least reason to trust a distant
company with what they ask. Underneath is ownership: a community's language, knowledge and questions end up in
systems it cannot inspect, and it does not decide what the AI teaches, learns, or where questions go.

### 2.4 Why Bitcoin first

Afribit Africa teaches Bitcoin in Kibera with its own educators. Its learners meet scams now and need plain,
correct answers now. Bitcoin answers can also be checked as right or wrong, so quality can be measured. The engine
is not tied to Bitcoin, but any other subject (health, civic information, farming) would need its own reviewers,
and none exists today.

---

## 3. What Afribit AI is

### 3.1 Three parts

| Part | What it is | Who owns it |
|---|---|---|
| **The engine** | Open-source software: chat app, retrieval, model gateway, safety checks, review and evaluation tools, deployment kit | Everyone (Apache-2.0) |
| **A community pack** | A folder: who the assistant is, how the community speaks, what must never be said, and the reviewed knowledge it answers from | The community (the Kibera pack is CC BY-SA 4.0) |
| **A node** | A machine running the engine with one or more packs and a language model | Whoever hosts it |

Swap the pack and the same engine serves another community. Swap the model and the community keeps everything it
built.

### 3.2 The Kibera pack

- **Four language modes:** simple English, Kiswahili, Sheng, and Mixed (the default, mirroring how the learner
  mixes them). Sheng is meant to be composed directly, not translated from formal Kiswahili with slang added.
  Learners also choose a level: simple, normal or deep.
- **Knowledge:** 61 Bitcoin knowledge cards, 25 communication-skills chapters and 271 Sheng and Kiswahili phrases.
  Most of it comes from two teaching manuals in Kenyan Sheng, approved by community reviewers as version 1.0 in
  September 2026.
- **Each card** holds one idea, written twice (the full answer, and the simplest words), with safety notes, a
  review status and a version.
- **Provenance:** every phrase records its source, whether it is synthetic, whether a person reviewed it, and three
  separate permissions: retrieval, evaluation and training. All default to "no". No row is cleared for training.

### 3.3 The core claim, and what supports it

*The community owns the knowledge, the voice and the review; the model is replaceable.*

- **The model is configuration.** Every model call goes through one gateway. Which model answers, and where, are
  settings, not code. Comparing Gemma 3 with Gemma 4 (section 9) changed only the model setting.
- **On our tests, the engine does most of the work.** On 8 October 2026 we ran the same open models on our 15 cases
  (AI judge, one run):
  - without the engine they passed the language rubric on 1–2 cases and were accurate on 3–6;
  - with the engine's compact prompt they passed 13–15 and were accurate on 13–15.

  The bare setup was not told it was a Bitcoin assistant. A fairer test, on community-written questions scored by
  people (E-002), has not yet run.
- **Licences, stated carefully.** The software is open source. Today's default node model, Gemma 3 12B, is under
  Google's Gemma Terms of Use, which is not an OSI-approved licence. The public service uses hosted models under
  their providers' terms. We are moving the default to an Apache-licensed model (Gemma 4), subject to our tests:
  the AI-judged tests have passed, and the switch waits for the community reviewers' blind comparison. So this is
  *open-source software, moving to an Apache-licensed model*, not yet "open source end to end".

### 3.4 Can another community use it?

**Built and tested:**

- A pack is a folder the engine validates at start-up. An invalid pack stops the server, which lists every problem.
- One server can serve several packs, which cannot see each other's knowledge. This was tested with the Kibera
  pack and a fictional English library-guide pack, and a test checks that no Kibera or Bitcoin words leak into the
  other pack's prompts.
- A pack can declare any number of language modes, for any subject.

**Not proven:**

- No second real community has used the format, so "any community can use it" is a design, not a result, and "a
  pack format and an engine" is more accurate than "a protocol".
- Only Sheng, Kiswahili and English have been tested. A new language needs its own reviewers and a model that
  handles it. A language readiness check is planned.
- Writing a pack means editing files, and reviewer accounts belong to a server, not to a pack.

### 3.5 Learn mode, and "Ask anything"

**Learn** mode (**live**, the default) answers from approved knowledge.

**"Ask anything"** (**decided, not built**) would answer general questions. It would:

- be off unless a community's steward and reviewers switch it on;
- label every answer, for example "General answer — not checked by Kibera's reviewers";
- keep the same privacy and safety checks;
- never add its answers to the knowledge base or use them for training.

The planned pilot will not use it.

---

## 4. How an answer is made

The same steps run on the public service and on a node. Only where the model runs differs (section 6).

1. **The member chooses a language and level.** No account is needed to chat.
2. **Secret check, before anything reaches a model.** A message that contains an actual seed phrase, private key,
   PIN or password is refused, not stored and not sent to any model. Questions *about* seed phrases and scams are
   answered (section 7).
3. **Retrieval from reviewed knowledge.** Only approved or published cards can ever be found. Two searches run:
   - a meaning-based search using *embeddings* from **bge-m3**, a multilingual model (MIT licence) that runs on an
     ordinary processor;
   - a word-based full-text search.

   Their results are combined by **rank fusion**, which uses each result's position rather than its raw score. The
   top three cards go to the model. On a node, bge-m3 runs on the node with no cloud call; the public service uses
   a hosted copy of the same model.
4. **The prompt** combines:
   - the pack's rules for the chosen mode and level;
   - the cards;
   - a short recent history;
   - in the Sheng and Mixed modes, community-approved phrases.
5. **The model writes the answer** from the cards, in the member's language and level.
6. **Output check.** An answer that asks for or repeats a secret, or promises returns, is withheld. A *grounding
   check* also records names and figures that appear nowhere in what the model was given.
7. **Storage** follows the retention setting (section 6), and each answer is marked as answered locally or by an
   outside service.

**When the knowledge does not cover the question,** the model is told to say so and not to answer from memory. In
a probe on 2 October 2026 with five off-topic questions, it declined four and answered one (a football result)
from memory. Five questions are an anecdote, not a rate.

**When no model is reachable,** the engine shows the best-matching reviewed card, with no model involved. A node or
an Afribit Local box never falls back to the cloud unless the community has chosen and disclosed the "hybrid"
setup. A known gap: these card-only answers are in the card's English wording, even for a Sheng question.

**Built, tested and switched off.** Three variants wait until community reviewers have compared them blind:

- a **compact prompt**, about a fifth of the size, which scored better on our tests;
- a **"waiter"** that rewrites the question as a clean English search;
- a **"restaurant" pipeline**, in which a hosted model sees only a scrubbed English version of the question.

The public service runs the full-length prompt without them.

---

## 5. How it learns

The assistant improves only through gates the community controls (ADR 0015, accepted 8 October 2026 by the
maintainers, to be ratified by the community's reviewers before the pilot). **Nothing is learned from individual
conversations, and no model weights change from a live chat.**

| Speed | What changes | Gate | Status |
|---|---|---|---|
| **For everyone, the same day** | Knowledge cards and phrases are used in answers as soon as they are approved | A reviewer's approval; no one approves their own work | **Live** |
| | **"Say it your way"**: a member rewrites an answer as they would say it | Reviewers approve, edit or reject; safety topics need two different reviewers | **Live** since 8 Oct 2026 |
| | **Gap list**: questions no card answered, counted under short general topics with no question text kept, shown only at 5 or more | Reviewers write a card or mark the topic out of scope | **Built and tested** (8 Oct 2026), not yet in service |
| **For one person, at once** | Opt-in learner memory: language, level, topics covered | The member opts in and can delete it | **Decided** |
| **The model, in releases** | An adapter trained on approved, consented examples | It must beat the current version on a human-labelled test set, have zero safety regressions, and win a vote of the community's reviewers | **Decided policy, not yet used**. No model has been trained |

### 5.1 "Say it your way" (live since 8 October 2026)

Under any answer, a member can write how they would say it and, optionally, what was off (too formal, wrong words,
wrong facts). They tick what their words may be used for:

- improving answers after a reviewer checks it (ticked by default);
- testing the assistant (not ticked);
- training future versions (never ticked by default).

No account is needed. Suggestions are rate-limited (5 per hour per address, 3 per conversation per day), and one
containing a secret is refused.

Reviewers work through a queue. They can approve the wording (tidying it first), send the card for a fact check, or
reject the suggestion. No one approves their own suggestion. Safety topics (seed phrases, PINs, scams, sending
money) need a second, different reviewer. Every decision is audited.

An approved phrase becomes community language data. Each use is allowed only if the member consented *and* a
reviewer approved, so a suggestion without training consent can never become training data. Approved phrases
currently reach answers only in the Sheng and Mixed modes.

### 5.2 Why the model does not learn from chats

- **Poisoning.** A 2025 study cited in ADR 0015 found that about 250 planted documents could plant a hidden
  "backdoor" in models from 600 million to 13 billion parameters. A scammer would try to teach a Bitcoin assistant
  that "the agent needs your seed phrase".
- **Memorisation.** Fine-tuned models can memorise names, numbers and addresses.
- **Consent.** Our policy forbids training on conversations without opt-in.
- **Data rights.** Synthetic training data may only come from open-weight models with permissive licences, because
  most proprietary models' terms forbid using their outputs this way. Earlier synthetic batches made with
  proprietary models stay evaluation-only.

Future adapters trained on community-only data would stay on that community's node, because model weights can leak
their training data.

---

## 6. Where the data goes, and privacy

### 6.1 The three setups

The same software runs everywhere; a setting chooses where the model runs. *Zero-data-retention* (ZDR) is a hosted
provider's contractual promise not to keep a request. The request still leaves the community and passes through
third parties.

| | **Community node** (own GPU) | **Public service** (cloud) | **Afribit Local** (box + Afribit GPU) |
|---|---|---|---|
| Community's data lives | On the node | On Afribit's server | On a small box at the community |
| Model runs | On the node's GPU | Hosted models, reached through a routing service (OpenRouter) with ZDR requested | On Afribit's GPU server in Kenya, over an encrypted WireGuard tunnel |
| What leaves the network | **Nothing** | Each question, its retrieved cards and recent history, to a hosted model provider | Each question, its cards and recent history, to Afribit's GPU server, which answers and stores nothing |
| Without internet | Full answers (over community Wi-Fi: untested) | No service | Card-only answers until the connection returns |
| Chat retention | None (node kit default; agreed for the pilot node) | 30 days | 30 days by default |
| Status | **Built and tested** on rented hardware; no community runs one yet | **Live** | **Built and tested** with a stand-in GPU in Europe and test questions only. **Not running for any community; no GPU in Kenya yet; no price** |

"Nothing leaves the community" is true only of a node with its own GPU, in node mode.

Two variants exist:

- **Hybrid** (**built**): the node's model first, and a hosted model only if it fails. It must be chosen
  deliberately and disclosed to members.
- **The restaurant pipeline** (**built, off**): a hosted model sees only a scrubbed question. The scrubber is a
  safety net, not a guarantee (section 9.5).

Rented GPUs outside Kenya are used for development and tests only, never for a learner's question.

### 6.2 The label that tells members the truth (live since 8 October 2026)

The app shows one sentence on its first screen and a two-word label in the chat header, which opens the full
sentence and the privacy page. On the public service the header says "Outside service", and the sentence reads:
*"Answered by an outside AI service that promises not to keep your question. Chats are deleted from the server
after 30 days."* An Afribit Local box would say: *"Your community's data stays on its own box. Questions are
answered by Afribit's AI server in Kenya and are not stored there."*

The label is generated from the server's real settings, so it cannot overstate:

- It says "stays here" only when the model runs on the same machine or in a container beside it.
- Any other address, even a private one, is reported as "another server" unless the operator states the location.
- In hybrid mode, an answer that actually came from outside carries its own marker.

A test checks every combination. Sheng and Kiswahili versions of the wording await the community reviewers; until
then the English text is shown.

### 6.3 Retention and deletion (live since 8 October 2026)

- **Retention** is a setting:
  - *none*: no message text on the server; the conversation lives in the member's browser, which sends the last
    few turns with each question;
  - *a number of days*: an hourly job empties older text;
  - *keep*: kept until deleted.

  Only metadata stays for counting: time, language, token counts, card IDs and a safety flag.
- **Deletion,** at any time, from the app: one conversation; all conversations this phone started; or, for people
  with an account (invited contributors and reviewers), the account. Deleted data can remain in encrypted backups
  for up to 14 days.
- **Reports:** when no chats are stored, a member may attach the question and answer to a report. That text is
  cleared 30 days after the report is resolved.
- **Other protections:**
  - Chat needs no account, and prompt logging is off by default.
  - Accounts are identified only from a verified sign-in.
  - A message containing a detected secret is replaced before storage.

### 6.4 Who sees what

Leaders and administrators see counts, not people. Question and answer text appears only in the reviewers' queue
of reported or safety-flagged answers, is visible only to reviewers and administrators, and is never exported.
The daily export blanks every count below 5. Links may carry a channel label naming a place or poster, never a
person.

### 6.5 Legal position

We do **not** claim compliance with Kenya's Data Protection Act, 2019. A legal review is pending. It covers:

- registration for the programme and for each node;
- Afribit's role as a *data processor* on Afribit Local, with a data processing agreement before any community
  starts;
- cross-border guidance for the cloud and hybrid setups.

The privacy notice is a draft, to be translated into Kiswahili and Sheng by community reviewers, not by a model.

---

## 7. Safety

| Risk | What the system does | Status |
|---|---|---|
| A learner types a secret | **Detection by content**: 12 or more words from the standard Bitcoin recovery-word list (6 or more after a "seed phrase" lead-in), private-key formats, or a PIN, code or password with a value. The message is refused, not stored and never sent to a model | **Live**; 34 automated checks |
| The model asks for or repeats a secret, or promises returns | The **output safety check** withholds the answer; the prompt's safety rules are the first line | **Live** |
| Scams | Scam education is part of the reviewed knowledge, with safety notes on cards. Test cases include scam traps, and each release's smoke test sends scam and secret questions | **Live** |
| Invented facts | The **grounding check** flags names and figures not in the cards. On 45 answers (2 Oct 2026) it flagged 9, several of them false positives, so it records and does not block | **Built**, log-only |
| Taken as advice | The chat screen reads "AI can be wrong. Not financial advice. Never share your seed phrase."; the first-run screen and website say the same | **Live** |
| Abuse of free access | Per-address rate limits | **Live**; per-device limits planned |

**A fix worth recording.** An earlier version refused any message that *mentioned* "seed phrase", "PIN" or
"password". So it would not answer "What is a seed phrase?" or "Should I give my seed phrase to someone claiming to
be support?", the two questions that most protect a beginner. Detection now looks at content, not keywords (ADR
0008). It deliberately favours not blocking education over catching every possible secret, with the model's rules
as a second line.

**What we do not protect against**, as our threat model states:

- an attacker with physical access to a running node;
- a compromised steward;
- a secret shared despite warnings, in a form the detector does not recognise;
- a wrong answer that passes the output check.

**Commitments** (the roadmap's "what we will not do"): no token; no holding of users' funds; never asking for or
storing secrets; no training on conversations without opt-in; no per-question charges for learners; never sending
an Afribit Local community's questions to foreign AI companies; never letting leaders read members' conversations.

---

## 8. Governance and accounts

The governance document is **proposed**, to be ratified with the community's language and safety reviewers before
the pilot.

### 8.1 Roles

| Role | Does | Cannot |
|---|---|---|
| **Members** | Ask, report answers, suggest wording. No account needed | Change what others hear without a reviewer |
| **Contributors (trainers)** | Submit phrases and corrections; review and vote on others' work | Review their own work; approve anything |
| **Reviewers** (language; Bitcoin and safety) | Approve wording, or facts and the safety floor, each within their own type | Approve the other type alone; approve their own work |
| **Administrators** | Manage accounts and invitations; export aggregate figures | Be created by invitation |
| **Node stewards** | Run a node: power, uptime, updates, access | Change knowledge or language |
| **Maintainers** | Code, releases, infrastructure, security fixes | Approve language or knowledge on their own |
| **Afribit Local operators** | Run Afribit's GPU server | Read a community's data, except with its written, time-limited, logged approval |

Nobody is both author and approver of the same change. Three community reviewers have been named; they have not
yet done a blind review. Before the pilot, a lasting reviewer model is to be agreed, in which reviewers are paid for
their time and never per approval.

### 8.2 Review rules

**In force:**

- Only approved or published knowledge can be retrieved. Cards pass fact and language checks in order, and editing
  a live card takes it off air for re-review.
- No one, human or model, approves their own work.
- "Say it your way" suggestions on safety topics need two reviewers.
- For cards, a two-person rule is available as a setting.

**Proposed, not yet enforced:** a quorum of two reviewers for all content. The tools record reviews and votes, but
a promotion step that enforces the quorum is on the roadmap.

Any reviewer can withdraw content at once. Any reviewer or maintainer can stop a release on safety grounds.

### 8.3 Accounts by invitation only (live since 8 October 2026)

Accounts are only for people who teach and check the assistant:

- An administrator issues a single-use code for a contributor or a reviewer, which expires (7 days by default) and
  can be revoked. Nobody becomes an administrator by invitation.
- Codes are stored only as hashes. Every refusal gets the same answer, so the form reveals nothing.
- Sign-up is limited to 10 tries per 15 minutes per address.

On 8 October 2026 the public service had one administrator and one contributor account.

### 8.4 Audit and decisions

The audit log records:

- invitations created, used and revoked, and role changes;
- each resolution of a reported answer, and each suggestion decision;
- each saved change to the assistant's wording (safety-critical prompts are administrator-only);
- deletions, as counts only.

Technical decisions are numbered architecture decision records (ADRs). An accepted one changes only through a new
record. Grants and donations that fund nodes are to be published at least quarterly.

---

## 9. Evidence: what has been measured

Every test and evaluation is logged with its date, code, settings, result and caveats in
`docs/book/test-and-evaluation-log.md`, summarised in `docs/book/evidence.md`. Three caveats apply throughout:

1. Language and accuracy scores come from **an AI judge**, not people.
2. The **15 test cases are our own**, and were also used to tune the prompts.
3. Results **vary between runs**. One or two cases out of 15 is noise.

### 9.1 Finding the right knowledge, 2 October 2026

The benchmark is 40 questions we wrote, in Sheng, Kiswahili and English. The model receives the top 3 cards.

| Setup | Right card first | In top 3 | In top 5 |
|---|---|---|---|
| Before the fixes | 17.5% | 25% | 37.5% |
| After rank fusion (and loading 24 missing cards) | 50% | 82.5% | 87.5% |
| **bge-m3 embeddings (live; same on a node with no cloud call)** | **82.5%** | **97.5%** | **100%** |
| Full-text search alone (a node before local embeddings) | 22.5% | 42.5% | 57.5% |
| With the waiter's English rewrite (built, off) | 92.5% | 100% | 100% |

*Caveat:* one benchmark that we wrote; some tuning towards it is possible.

### 9.2 Language and accuracy, hosted models, 8 October 2026

The 15 cases are 5 Sheng, 3 Kiswahili, plus English, mixed, scam and safety traps. Each cell shows *passed the
language rubric / judged accurate*, out of 15. Hosted precision, one run each.

| Model | Compact prompt | Full prompt | Bare model (no engine) |
|---|---|---|---|
| Gemma 3 12B (today's node default) | 13 / 13 | 10 / 9 | 2 / 6 |
| **Gemma 4 26B-A4B** (Apache-2.0) | **15 / 15** | 14 / 11 | 2 / 6 |
| Gemma 4 31B (Apache-2.0) | 15 / 14 | 15 / 13 | 1 / 3 |

*Caveats:*

- The bare setup was not told it was a Bitcoin assistant.
- Gemma 3 12B with the full prompt passed 15 on 2 October and 10 here.
- The compact prompt is not in service. The live service uses hosted models with the full prompt; its default
  hosted model (Llama 3.3 70B) last scored 11/15 on the rubric and 9/15 accurate, on 2 October.

### 9.3 Gemma 4 at 4-bit on rented GPUs, 8 October 2026

Models were compressed to 4-bit, as a node runs them, on GPUs rented on RunPod outside Kenya and timed from
Nairobi, using test questions only, for about US$0.50. Times are for a whole answer with the compact prompt; "four at once" means
four different questions.

| Model (size) | GPU (24 GB) | One answer | Four at once | Rubric | Accurate |
|---|---|---|---|---|---|
| **Gemma 4 26B-A4B** (18 GB) | RTX 3090 | **3.5 s** | **8.4 s** | 14/15 | 15/15 |
| Gemma 4 26B-A4B | NVIDIA L4 | 8.1 s | 24.2 s | 14/15 | 15/15 |
| Gemma 4 E4B (6.6 GB) | RTX 3090 | 2.2 s | 11.3 s | 14/15 (15/15 with full prompt) | 13–14 |
| Gemma 3 12B (about 8 GB) | RTX 3090 | 4.2 s | 9.9 s | 11–12/15 | 11–14 |
| Gemma 4 31B (20 GB) | RTX 3090 | 34.9 s | — | Stopped: ruled out | — |

*Caveats:* AI judge, one run, and short synthetic bursts, not real use. E4B is not measured on an 8–12 GB card. The
default model does not switch until people have compared them blind.

### 9.4 Earlier tests, 1–3 October 2026

- **Model families.** In a hosted search over the 15 cases, Gemma 3 12B and Gemma 4 26B-A4B passed 15/15 and the
  hosted 70B passed 11. Qwen3 models scored 0/3 on Kiswahili at every size from 8B to 32B.
- **Phones.** Four 1–3 billion-parameter models passed 0–3 of 15 at 4-bit on a laptop processor.
- **The community's spare 2014 desktop** (4 GB GPU) passed 4/4 cases with Gemma 3 12B. But at 1.5 tokens per
  second, the first word took 32–85 s, which is not viable for live chat.
- **Rented mid-range GPUs,** Gemma 3 12B at 4-bit:
  - RTX A4000 (16 GB, about US$0.17/hour): 10–19 s per answer, four people at once in 14.4 s;
  - RTX 3080 (10 GB): about 6 s per answer.
- **Prompt length.** On the hosted model (five Sheng questions), the median answer took 12.1 s with the full prompt
  and 6.3 s with the compact one.

### 9.5 Other probes, 2 October 2026

- **Off-topic:** 4 of 5 questions declined; one answered from the model's memory.
- **Grounding check:** 9 of 45 answers flagged, several of them false positives.
- **Restaurant privacy probe:** six messages carried names, phone numbers, an ID number, a wallet address and a
  Lightning invoice. The waiter's ticket leaked a detail in 2 of the 6 (a first name and the invoice), so a
  deterministic scrubber was added as a backstop. The honest claim is "the hosted model sees far less", never
  "nothing".

### 9.6 The Afribit Local path, 8 October 2026

A box built with the real node kit, on a laptop in Nairobi, used Gemma 4 26B-A4B on a rented GPU in Romania, with
test questions only. Run 2 added the real *gate*: the small program in front of the GPU that checks each
community's key and limits.

| Check | Run 1: no gate (GPU probably an L4) | Run 2: through the gate |
|---|---|---|
| Box smoke test | 35/35 | 35/35 |
| One question: first words; full answer | 2.2–5.4 s; 6.8–14.8 s | 1.1–1.8 s; **2.4–4.0 s** |
| Four at once, all done | 29.8 s | **7.8 s** |
| Search stayed on the box | 32 search calls on the box, none to the GPU | The gate refuses search requests |
| Stored text, with "no storage" set | 84 messages, **none with text** | — |
| Question text, keys or addresses in the gate's records | — | **0** in 23 log lines (19 real answers) |
| GPU switched off | Card answers in 0.3–1.1 s; search still worked | Health check failed as designed; card answer in 0.6 s |

**Also tested:**

- the gate's own automated checks, **14/14**;
- a tunnel rehearsal on throwaway Linux containers, **18/18**:
  - each box reached the GPU server only through its own tunnel;
  - a key failed from another community's box;
  - an outsider reached nothing;
  - removing one community left the other working.

*Caveats:*

- A GPU in Europe, about 0.6 s of network round trip, the long prompt, a laptop rather than the pilot machine, one
  round of questions.
- The real server's hardening scripts were only syntax-checked.
- One rented host silently ran the model on its processor (50–125 s answers, no error). The health check now
  catches that.

### 9.7 The gap list, 8 October 2026

A box with Gemma 4 26B-A4B on a rented GPU, using test questions only. A question counts as a gap when no
reviewed card is close in meaning:

- **19 of 19** questions no card covers became gaps, and **0 of 8** covered questions did.
- They were grouped into general topics: "Bitcoin taxation in Kenya" (6), "Bitcoin ATMs in Kenya" (5),
  "Bitcoin mining" (5).
- Three questions full of personal details (names, a phone number, amounts, a street) produced only general
  labels such as "Paying rent with Bitcoin".
- No question text was kept.

*Caveats:* 27 calibration questions we wrote, with a thin margin between covered and uncovered (0.65 vs 0.67
similarity); one run. The test also showed that the system's older "confidence" value cannot detect missing
knowledge, because it reaches its maximum whenever common words match. The gap list therefore uses the meaning
score.

### 9.8 Software checks

- **The standing suite:** 585 automated checks as of 8 October 2026. It covers:
  - secret detection (34) and privacy and deletion (23);
  - suggestions (12), invitations (13) and the gap list (11);
  - real-PostgreSQL checks (25) and the GPU gate (14);
  - the web app (61).

  The release script runs it, and refuses to ship on a failure.
- **No GitHub Actions.** The continuous-integration service is not running for the repository at present, so we do
  not claim continuous integration.
- **Smoke tests.** The 8 October API releases passed outside smoke tests of 37/37, then 38/38.
- **Limits:** the suite never calls a real model or judges answer quality.

---

## 10. Running it: hardware and cost

**Phones do not run the model** (section 9.4). A shared machine runs a stronger model for everyone, so the phone
needs only an installable web app, aimed at low-end Android phones and patchy connections.

### 10.1 A community node

| Need | Measured guidance |
|---|---|
| Today's default, Gemma 3 12B (about 8 GB) | A GPU with **10 GB or more, ideally 16 GB**. Memory speed matters as much as size |
| Gemma 4 26B-A4B (18 GB) | **24 GB**; it does not fit 16 GB |
| Smaller cards | Gemma 4 E4B (6.6 GB) may suit 8–12 GB cards; **not yet measured there** |
| Not enough | A 2014 desktop with a 4 GB GPU |
| Also | Linux with Docker; disk for the model and database; a UPS or solar; a named steward |

The app needs HTTPS to install. Without internet, the node uses its own certificate authority, which each phone
trusts once. Chat works offline, but push notifications do not. Serving a node over the community's Wi-Fi is
**untested**.

### 10.2 Afribit Local

Afribit Local is for communities that cannot buy or look after a GPU (ADR 0016).

**The box** runs the unchanged node kit: app, database, local search and backups. A modest PC is enough, because it
never runs the language model. So far a laptop has been tested as the box.

**Afribit's GPU server** is specified as:

- one 24 GB GPU (RTX 3090/4090 class), 64 GB RAM, a 200 GB SSD and a UPS;
- full-disk encryption;
- located in Kenya: Afribit's premises first, colocation in Nairobi later.

It keeps nothing. Prompt logging is off, and the host is set up so that it *cannot* keep data: no swap, no core
dumps, temporary files in memory, capped logs. A checklist, with a "canary" test question, verifies this before any
community connects.

**Status:** the software is **built and tested**, but **not running for any community**, and **Afribit does not
yet have a GPU in Kenya**. Whether to buy or rent one in Kenya is still open.

Afribit Local weakens the no-internet promise: when the connection is down, the box serves card-only answers. A
community can later add its own GPU without moving any data; only the model's address changes.

### 10.3 Cost

| Item | What we know |
|---|---|
| Learners | Never pay per question, in any setup |
| Rented GPUs (tests only) | About US$0.17/hour (RTX A4000, RTX 3080), US$0.22 (RTX 3090), US$0.49 (L4). The 8 October tests cost under US$1 |
| Buying hardware | No price is quoted until there are Kenyan quotes |
| Power | Manufacturer ratings: RTX 3090 about 350 W, L4 72 W (the candidate where power is scarce) |
| Afribit Local | A monthly fee per community is intended. **No price is set**; it waits for the pilot to measure the cost of serving a community |
| Self-hosted node | Free software; the community and its supporters fund hardware, power and a steward |
| Review | The scarcest resource; to be measured in the pilot and paid |

---

## 11. Status and roadmap

### 11.1 Status beyond the summary

| Capability | Status |
|---|---|
| Redesigned web app; a console for reviewers (reports, suggestions, invitations) | **Live** |
| Several packs on one server | **Built and tested** |
| Compact prompt, waiter, restaurant pipeline | **Built and tested**; off until blind review |
| Blind review tool for community reviewers | **Built**; first round pending |
| Gemma 4 as the default model | **Decided**, conditional; AI-judged tests passed; waits for reviewers |
| Offline cards on the phone; sats rewards for contributors; voice | **Idea** |

### 11.2 Roadmap stages

The roadmap uses stages, not dates, and each stage has an exit test.

1. **Foundations (now).**
   - Blind review by three community reviewers.
   - The community benchmark.
   - A lasting reviewer model.
   - Operations: alerting, off-site backups, pinned versions.

   *Exit:* a supervised pilot can run for weeks unattended, and the default model is chosen with published results.
2. **Kibera on its own infrastructure.**
   - Kibera's data on a box at the hub; the model on Afribit's GPU in Kenya, then the hub's own GPU when funded.
   - The gap list (built) and a community console.
   - A supervised pilot of 20–50 learners in Learn mode, with before-and-after checks run by educators.

   *Exit:* a correct, safe answer to a Sheng question at the hub, the data never leaving its box, and the cost
   reported.
3. **A second community, and "Ask anything".** A language readiness check, a shared Bitcoin core with community
   overlays. *Exit:* a second community live with its own reviewers, its results public.
4. **Afribit Local as a service.**
   - Provisioning and billing (payable in sats).
   - A data processing agreement, legal review and an independent security review.

   *Exit:* three communities, each with a restore drill passed, and the cost published.
5. **Pluggable:** per-community keys, a widget, channel connectors.
6. **A model that speaks like the community (research):** a written training-consent policy, then a first adapter
   that ships only if it beats prompt-only in blind review with zero safety regressions.

---

## 12. Limitations and open questions

**Not yet proven:**

- **Outcomes.** No pilot has run: no users, no satisfaction figures, no measure of learning or scam recognition.
- **Language quality as people hear it.** The AI judge may favour fluent code-mixing; in one pipeline it let
  through Sheng that over-grafted English verbs. The blind review by three named reviewers has not happened.
- **The engine against a bare model, on the community's own questions.** E-002 will test this with 50 questions
  written by Afribit's educators, scored blind. If a bare model already does well, the claim shifts to ownership
  and control rather than better answers.
- **Replication** in a second community or another language.
- **Offline and mesh operation** with real hardware and users.
- **Afribit Local from Kenya,** under real load, with the host checks run on a real server and an independent
  security review.
- **Legal compliance** under Kenya's Data Protection Act.

**Known engineering limits:**

- Card-only fallback answers are in English.
- Approved phrases reach only the Sheng and Mixed modes.
- The grounding check is too noisy to enforce.
- Container images and model versions are not pinned by digest.
- There are no per-device rate limits, and no continuous integration.

**Open questions:**

- Does Gemma 4 match Gemma 3 as people judge it?
- What does serving one community from Afribit's GPU cost, and how many communities can share it?
- What monthly price covers that without excluding the communities that need it most?
- How is long-term community review funded?
- Where is the right line between showing approved text and generating new text?

---

## 13. How to take part

- **Communities** wanting their own assistant: the work is mostly people, starting with at least two reviewers who
  know the language and the subject. The software, the pack guide and the node kit are open. Afribit Local is not
  yet available, but we want to hear from communities without a GPU.
- **Sheng and Kiswahili speakers and Bitcoin educators:** tell us what sounds wrong or unnatural and what you would
  say instead. Check answers for accuracy and safety, and in time join paid review.
- **Developers:** the app, the API, the node kit and the roadmap's research items need hands. Every feature has a
  written spec first, and every result is logged.
- **Hosts:** a node needs a community hub, a spare machine, power protection and a steward.
- **Funders and partners:** the main needs are:
  - reviewer time;
  - the community benchmark;
  - the supervised pilot;
  - Afribit's GPU in Kenya;
  - an independent security and legal review.

**Contact:** eddie@afribit.africa

---

## Appendix A. Glossary

| Term | Meaning here |
|---|---|
| **4-bit** | A compressed form of a model that needs far less memory, at some risk to quality |
| **Adapter** | A small add-on that adjusts a model without retraining all of it. None has been trained here |
| **ADR** | Architecture decision record: a short numbered document stating a decision and its reasons |
| **AI judge** | A language model used to score answers against a rubric. Useful and cheap, not ground truth |
| **Afribit Local** | A box at the community holds the data; Afribit's GPU server in Kenya runs the model and keeps nothing |
| **Box** | The modest computer at the community in Afribit Local; runs the app, database and search, not the model |
| **Card** | One reviewed idea, as a full answer and in the simplest words, with safety notes and a review status |
| **Cloud setup** | The public service: data on Afribit's server, answers from hosted models |
| **Community pack** | A folder with a community's languages, voice, safety wording and reviewed knowledge |
| **Embedding** | Numbers representing a text's meaning, so similar meanings match even when the words differ |
| **Engine** | The open-source software every community shares |
| **Gate** | The program in front of Afribit's GPU that checks each community's key and limits, and logs counts, never text |
| **GPU** | Graphics processor; the hardware that runs language models at usable speed |
| **Grounding check** | Flags names and figures in an answer that were not in what the model was given |
| **Hybrid** | A node setup that uses a hosted model only when its own fails. Must be disclosed |
| **Model** | The replaceable AI component that writes the answer |
| **Node** | A machine run by a community that serves the assistant on its local network |
| **Rank fusion** | Combining search result lists by each result's position, not its raw score |
| **Retention** | How long the server keeps chat text: none, a number of days, or until deleted |
| **Retrieval** | Finding the reviewed cards that match a question before the model writes anything |
| **Sheng** | The urban register of Nairobi, including Kibera, mixing Kiswahili and English |
| **Steward** | The named person responsible for a node |
| **WireGuard** | Open-source software for encrypted tunnels; each box dials out to Afribit's server through one |
| **Zero-data-retention (ZDR)** | A hosted provider's contractual promise not to keep or train on a request. The request still leaves the community |

## Appendix B. Sources

All paths are in the Afribit AI repository.

| Claim area | Sources |
|---|---|
| What it is; engine and pack | `README.md`, `ARCHITECTURE.md`, `docs/concept/README.md`, `docs/adr/0014-community-packs.md`, `docs/guides/community-pack-guide.md`, `packs/kibera-bitcoin/pack.json` |
| The problem; approach | `docs/program/overview.md`, `README.md`, `docs/book/test-and-evaluation-log.md` (2026-09-17, 2026-10-02, 2026-10-08-b) |
| How an answer is made | `ARCHITECTURE.md`, `docs/adr/0004-rag-is-primary-knowledge-pattern.md`, `docs/adr/0008-content-based-secret-detection.md`, `docs/adr/0010-compact-prompt-and-the-waiter.md`, `docs/adr/0011-rank-fusion-for-retrieval.md`, `docs/adr/0012-the-restaurant-pipeline.md`, `docs/adr/0013-local-embeddings.md` |
| How it learns | `docs/adr/0015-how-the-assistant-learns.md`, `docs/features/F-003-say-it-your-way.md` |
| Setups and privacy | `docs/adr/0009-inference-modes-and-privacy.md`, `docs/adr/0016-afribit-local-community-box.md`, `docs/features/F-001-model-location-label.md`, `docs/features/F-002-privacy-settings.md`, `docs/features/F-006-afribit-gpu-server.md`, `docs/governance/data-stewardship.md`, `docs/governance/privacy-notice-draft.md` |
| Safety | `docs/security/threat-model.md`, `docs/adr/0008-content-based-secret-detection.md`, `ROADMAP.md` ("What we will not do") |
| Governance and accounts | `docs/governance/governance.md`, `docs/features/F-012-invitation-only-accounts.md`, `docs/guides/reviewer-guide.md`, `docs/guides/pilot-console-guide.md` |
| Modes and model licence | `docs/adr/0017-ask-anything-mode.md`, `docs/adr/0018-open-licensed-default-model.md`, `docs/book/dependency-register.md` |
| Evidence | `docs/book/test-and-evaluation-log.md`, `docs/book/evidence.md`, `docs/evaluation/methodology.md`, `docs/features/E-001-gemma4-and-gpu.md`, `docs/features/E-002-community-benchmark.md` |
| Hardware and cost | `docs/program/community-node.md`, `deploy/community-node/README.md`, `deploy/gpu-server/README.md`, `docs/features/E-001-gemma4-and-gpu.md` |
| Status and roadmap | `ROADMAP.md`, `docs/features/README.md`, `docs/program/pilot-plan.md` |
| Licences | `LICENSE`, `LICENSE-CONTENT`, `NOTICE` |
