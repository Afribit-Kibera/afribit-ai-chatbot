# Next milestone: Bitcoin education online first, with Mesh deployment later

**Implementation update,6 November:** a green ordinary-learner entry, workspace/privacy setup,
Education selector and private text-source notebooks are now implemented locally. Open Notebook
handles sources behind Afribit's account/community API; source chat retains language packs and
stays local-only. The real source lifecycle passed, but inference in that proof was simulated.
[Feature and limits](../features/F-034-education-entry-and-private-notebooks.md),
[trial evidence](../evaluation/trials/2026-11-06-green-education-notebooks.md). This is not recruitment,
a measured education result, a permanent deployment or an encrypted-vault claim. The original plan
below remains prospective. Both intro-video experiments now total$0.24 of the separate$1 cap.

6 November2026. **Status: prospective plan, not a completed case study or public launch.**
Edmund selected **existing Afribit adult Bitcoin learners and merchants** as the first audience.
No participant has been recruited or contacted by the assistant. No new model call, software
deployment, messaging service, publication or grant application is part of this planning pass.

**Delivery/learning update,6 November:** Edmund reports that his community interactions found
Bitcoin learning too advanced and a need for smaller steps, learner-controlled pacing and
relatable examples. Start with a source-grounded Bitcoin101 chapter. Edmund is the initial
operator and language editor; the home Proxmox server is a candidate host for an **online**
pilot. Its readiness is unverified. There is no equipment to move into the community; portable
community-site/offline infrastructure is a funding need, not a gate before this online pilot.
The product/role/UX brief is a local working design document in `internal/frontend/`.

**Product direction clarification,6 November:** trainers prepare the **AI**, through source
curation, language guidance and answer testing/review in **AI Studio**. This is distinct from an
optional human facilitator and from model-weight training. The proposed learner entry is a short
skippable intro, a focus choice (Education active; Work/Development deferred), then educational
chat with optional guided small steps. Source-based learning does not require manually authoring
every explanation. See [education harness research](../research/2026-11-06-education-harness-options.md).
References, a concept board and a decorative intro clip are local design artifacts; the clip's
additional $1 experiment envelope and $0.12 reported charge are separate from the original showcase.
No runtime education outcome is established by these artifacts.

This narrows the existing [pilot plan](pilot-plan.md) and [assisted-session protocol](assisted-sessions.md).
Its proposed sample sizes/targets still require community reviewer agreement before recruitment.
It complements the [HRF assessment](../research/2026-11-06-hrf-grant-readiness.md) and
[90-point readiness gate](../evaluation/hrf-application-readiness-scorecard.md).

## The user problem we will test

Problem statement combining Edmund's qualitative report and remaining hypotheses:

> Adult Bitcoin newcomers and small merchants need simpler explanations, small learning steps,
> relatable examples and control over their pace. The online pilot will test this through an
> Afribit-operated service. Local community-network hosting follows when equipment is funded.
> Language/data-cost barriers, unsafe advice and the exact privacy needs still need task-specific
> evidence. Personal context should remain subject to clear access and processing permissions.

The need for broken-down learning is founder-reported qualitative evidence, not a measured effect
or proof that this solution works. Other barriers remain hypotheses. Record what people do
today: educators, friends, printed lessons, messaging groups, websites or other assistants, and
which tasks remain difficult. Ask about actual experiences without recording balances, seed
phrases, customer records or identifying scam reports.

Privacy is part of the outcome: learners can ask questions and keep optional notes without
other members seeing them. Usability and learning must also earn their place. We must show why
this is more useful for a task than a static handout or an educator reading the same cards.

## A small first service

Reuse the existing learner chat and add a coherent course/step experience. Do not start another
general-purpose chat application for this pilot. Offer a bounded Bitcoin learning service,
initially through reviewed community-controlled content:

1. Bitcoin concepts: explain the difference between Bitcoin, a wallet and a custodial service.
2. Scam recognition: judge fictional support messages, pressure tactics and unrealistic promises.
3. Wallet safety concepts: understand why real secrets must never be entered into the assistant.
4. Merchant payment literacy: work through fictional invoices, payment states and customer
   questions without moving money or connecting real wallets.
5. A local learning/help directory with reviewed opening hours and educator contacts where
   publication is authorized; uncertain answers escalate to an educator.

This is education, not trading advice, custody, guaranteed fraud detection or an automated
transaction service. No minors, live customer/payment records, clinical data or confidential
rights-case files are in this first pilot.

An illustrative learner asks whether a supposed support agent should receive their recovery
words. The service presents approved safety guidance, explains the reason in the chosen language
and offers a fictional practice example. This is an example of the intended workflow, not a
recorded participant story, and a learner never supplies the actual recovery words.

## What exists versus what would be new

Existing: chat UI, account/member boundaries, approved-card retrieval, optional private notes,
explicit knowledge-sharing review and separate synthetic rented-model evidence. The
[6 November phone result](../evaluation/trials/2026-11-06-isolated-mesh-readiness.md) used fictional
cards and an ephemeral database, not a permanent community service.

Proposed/new: a community-approved source-grounded course with small steps and saved progress,
reliable persistent online deployment/domain/HTTPS, tested phone delivery, educator onboarding,
participant protocol and the actual learning study. Hosting on Proxmox does not prove that a
model/GPU, storage/backup or public access path is already qualified. Online learners still need
internet; a cached PWA alone cannot answer fresh server requests offline.
Quiz scoring can initially be educator-administered using the existing paper protocol; an app
quiz feature is not necessary to start measuring outcomes.

Reviewed-card delivery must keep its visible source label. It is a baseline educational service,
not proof of model generation. A generated-answer arm can be added only after an eligible model
route, data permissions and budget are established. A rented synthetic benchmark can happen
separately; it must not silently route real learner prompts to an ordinary overseas provider.
Existing location and sensitive-data restrictions still apply. No new laptop weights, fine-tuning
or paid allocation is approved by writing this plan.

If no suitable generated path is available, the study can test reviewed conversational retrieval
against static materials. Report that result honestly and do not attribute it to an LLM. A later
study can isolate the additional benefit, cost and risks of generation.

## Next steps and exit evidence

| Step | Work | Evidence required before advancing |
|---|---|---|
| E0: document the need and first learning task | Capture Edmund's existing community feedback; choose a first chapter with learners/merchants and inventory current materials/alternatives. Use additional conversations to resolve specific gaps | Qualitative observations attributed accurately; one concrete task/learning goal; operator/reviewer arrangement; actual human-rights/financial-freedom connection without invented repression claims |
| E1: agree lessons and measurement | Community educators/reviewers choose a small licensed pack, write independent evaluation scenarios and local-language wording; agree outcomes in advance | Versioned content/permissions; named willing reviewer roles; locked scoring key, consent/notice and prospective acceptance criteria |
| E2: qualify the online home-hosted deployment | Safe application-only HTTPS exposure, private management plane, persistent accounts/course progress/notes, deletion and encrypted restore; independent scoped security review | Fresh-install record; actual Android/iPhone online learning/resume checks; restart/restore/deletion replay; authorization and outbound-data boundary tests; critical findings resolved. Community-site offline equipment deferred for funding |
| E3: usability rehearsal | Proposed5 adults perform the tasks without developer coaching; an educator may provide clearly recorded assistance | Confusion/error log, completion/abandonment, language feedback, fixes and repeat checks; not a learning-effect or population claim |
| E4: supervised education pilot | Proposed20–50 consenting adults, following the existing assisted-session design; compare before/after equivalent scenarios and, where feasible, static-material baseline | Learning and task outcomes, sample counts, language/safety reviews, nonparticipation/dropout and support effort; model route/source disclosed |
| E5: case study and readiness review | Publish a sanitized evidence-backed account and update the internal scorecard | Reproducible release, documented failures/limitations, community approval of publication, budget/referees, at least90/100 plus hard gates before HRF application |

The human pilot begins only after its relevant consent, deployment and safety gates. Existing
prototype access and tests do not make E2 complete. Dates depend on people/equipment; no event or
deadline is scheduled here. Scores from20–50 learners are exploratory and cannot establish
population-wide impact, a causal AI effect or reduced real-world scam losses by themselves.

## Define success before collecting pilot results

The existing pilot's tentative speed/quality proposals are starting points, not HRF rules. Agree
the task mix, question count, languages, concurrency, operating hours and handling of missing
answers before measurement. Do not choose a pass threshold after seeing the answers.

Report at least:

- Correct completion of concrete learning/merchant tasks, with and without educator assistance.
- Before/after comprehension and scam recognition on equivalent scenarios, including unchanged
  and worse outcomes. Assess the intervention actually delivered, not an assumed model benefit.
- Held-out factual/language review, with separate findings for Sheng, Kiswahili and English.
- Requests for real secrets or unsafe guidance in the defined safety suite; serious findings
  block release. A zero observed failure count is not a general safety guarantee.
- Online answer availability, weak-connection/missing-card behavior, account separation,
  restart/restore and the exact private-data boundary for any permitted remote processing.
  Retain the earlier home isolated-network result separately; do not claim the community pilot
  itself has no-internet availability. Record bandwidth/data-cost and home-host uptime limits.
- Latency distribution, concurrent load, unavailable requests and operator/support effort.
- Cost per useful completed task including local operations and any eligible remote compute.
- Voluntary willingness to return, with aggregate/minimal measurement and a clear account of
  who did not return. Do not collect private chat transcripts just to demonstrate engagement.

Do not turn the90-point application gate into a requirement that90% of learners answer correctly.
Learning, language acceptance, safety, latency and application completeness are separate measures.

## Adjacent needs to investigate, not a commitment to build them all

| Need | Example job | Recommendation |
|---|---|---|
| Bitcoin learning/scam recognition | Understand a concept and choose a safe action in a fictional scenario | First pilot |
| Digital/privacy literacy | Understand permissions, phishing and account recovery from reviewed materials | Closest follow-on education pack |
| Merchant learning | Practise explaining payment states/refunds to customers with fictional records | Include a narrow module; no real payment execution |
| Community service information | Find reviewed public hours, training and contacts | Low-compute companion; require an owner/update date |
| Translation and reading support | Explain a licensed public learning document in accessible language | Consider after local-language quality review; avoid unapproved private-document uploads |
| Skills and work readiness | Practise a public-template application or digital-skills lesson | Validate demand; no private CV ingestion by default |
| Local communication | Coordinate classes or communicate with other members | Separate messaging workstream with its own privacy/security tests |

Offline learning does not always require an LLM. [Kolibri](https://learningequality.org/kolibri/)
is a useful precedent for distributing local educational resources and educator workflows over
a LAN. Our added value must be demonstrated in retrieval, language, accessibility, governance
or task outcomes, rather than merely adding a model to content people already understand.

## Mesh member messaging and AI

Edmund proposed free member-to-member chat as a network service. It is worth validating for class
coordination, communication costs or outages. Sending messages between people does not require
AI inference. One Mesh service directory can eventually link learning, public community resources
and a separately qualified messaging client.

A local connection alone does not mean messages are confidential from the box operator. For that
claim, evaluate a maintained open-source end-to-end encrypted design, client/key authenticity,
lost-device/recovery behavior, member invitations/revocation, group changes, store-and-forward,
abuse handling and actual Android/iPhone operation without WAN. Metadata, traffic observation,
device compromise and physical seizure remain threat-model questions. A PWA or AI bot does not
automatically solve them. Do not invent message encryption or claim absence of surveillance.

[Briar's design](https://briarproject.org/how-it-works/) shows that encrypted local Wi-Fi/Bluetooth
messaging is an existing approach. Its [download page](https://briarproject.org/download-briar/)
lists Android and desktop offerings; this does not qualify an iPhone solution. No messenger is
selected, installed or security-endorsed by this plan. Maintenance, device support and deployment
fit must be checked before selecting one.

AI has **no automatic access** to human conversations, message archives, contacts or group summaries.
If people later ask an AI to explain/summarize selected messages, define participant permission
and the processing boundary explicitly. Adding an AI recipient makes it another recipient; any
remote model/host's access depends on that separate processing design. E2EE between humans does
not make AI inference confidential from its operator.

Free access at the point of use still needs power, local infrastructure, maintenance and support.
Remote generation also consumes funded capacity; apply community limits and clear unavailability
behavior rather than promising unlimited free compute. Local text chat can be a separate service
without a per-message model charge, but off-network delivery needs some transport or later sync.

## Funder fit and publication

HRF's [AI fund](https://hrf.org/program/ai-for-individual-rights/ai-for-individual-rights-fund/)
prioritizes a clear human-rights application; [its Bitcoin fund](https://hrf.org/program/financial-freedom/bitcoin-development-fund/)
also covers Bitcoin education/community work tied to financial freedom in repressive settings.
We have not established that these learners/merchants face a particular authoritarian threat.
Discovery must validate the real connection and select the honest funding route. Do not fabricate
that connection to meet a grant narrative.

The case study should state the audience, validated problem, alternatives, intervention, privacy
boundary, actual deployment/model, participant consent, outcomes, cost/support, failures and what
changed. Publish aggregate findings and consented examples; no private chats, identities, raw
reviewer notes or dataset/training rights are implied. Label this document a plan until the
study has actually run. No public release or outbound communication is authorized/performed here.
