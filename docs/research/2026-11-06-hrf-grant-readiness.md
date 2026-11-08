# HRF grant readiness: published criteria, evidence and remaining tests

Checked **6 November 2026**, Africa/Nairobi. Read-only review of HRF's public pages and this
workspace's recorded evidence. No grant submitted, third party contacted, model run, rental,
router configuration or new security assessment performed. This is an application-readiness
assessment, not HRF approval or an assessment of legal eligibility.

## Recommendation

The **AI for Individual Rights Fund** is the strongest apparent route for the community AI
infrastructure proposal. The Bitcoin Development Fund is a possible route for a separately scoped
Bitcoin education/financial-freedom project. Our recommendation is conditional: we still need a
specific, credible human-rights use case and a consenting pilot relationship. General low-cost AI,
schools, hospitals or local-language chat do not by themselves establish HRF mission alignment.

Our evidence supports a **working synthetic prototype seeking funding for a bounded pilot**.
It does not support a deployment advertised as fully private, host-blind, independently audited,
production-ready or proven cheaper at community scale. We should prepare an application around
the measured work and funded milestones rather than wait to implement every future capability.

## What HRF actually publishes

| Route | Published focus and process | Implication for Afribit |
|---|---|---|
| AI for Individual Rights Fund | Open, privacy-enhancing AI with a concrete human-rights application, particularly for civil society facing authoritarian rule. Closed-source tools and tools without a clear rights application are excluded. Rolling applications; typical review4–6 weeks; amounts assessed individually and generally no more than$200,000. Administrative/identifying paperwork follows selection. Private grant announcements can be requested. | Best apparent fit for community-controlled AI; funding is discretionary and the public ceiling is not an entitlement or a recommended request amount. |
| Bitcoin Development Fund | Bitcoin/freedom technology, education and community work serving people facing repression. Other cryptocurrencies and work outside HRF's mission are excluded. Year-round applications;4–6 weeks for more information; awards vary by proposal. | A Bitcoin label alone is insufficient; explain the financial-freedom outcome of the specific funded work. Do not submit a generic GPU business under this heading. |

Sources: [AI fund criteria and process](https://hrf.org/program/ai-for-individual-rights/ai-for-individual-rights-fund/),
[Bitcoin fund criteria and process](https://hrf.org/program/financial-freedom/bitcoin-development-fund/).

The AI programme also describes hardware support for local inference through its Local Intelligence
initiative and shared inference through Freedom Cluster. This establishes relevant programme
interest, **not** an offer to fund our hardware, access to its cluster, or separately verified
hardware-application rules. [AI programme](https://hrf.org/program/ai-for-individual-rights/).

HRF previously supported Maple, Routstr and OpenCode. This is useful precedent for private AI,
routing and open tooling. It does not establish technical equivalence, security guarantees or
automatic eligibility for Afribit. [HRF's24 November2025 announcement](https://hrf.org/latest/hrf-announces-support-for-projects-advancing-ai-for-individual-rights/).

## Application information to prepare

HRF's [AI grant application page](https://hrf.org/program/ai-for-individual-rights/ai-grants/)
displays requests for the following information. This list summarizes the displayed questions;
individual required flags, dropdown choices and validation inside the separate
[embedded Airtable form](https://airtable.com/embed/appe4uDgoA0SvNXAk/pagUon6emhLkjS6Wl/form)
were not verified. We have not entered applicant data or accepted its disclaimer.

| Group | Prepare | Workspace assessment |
|---|---|---|
| Applicant | Contact identity, preferred pseudonym if relevant, role, location, personal/entity capacity and social links | Applicant must confirm the intended capacity and details. The page asks about both personal and entity applications; nonprofit incorporation is not stated there as a universal prerequisite. Selection can still require further paperwork. |
| Project | Name, focus, concise and expanded descriptions, public project/code links | Project materials exist; scope and public release need consolidation. |
| Relevance | Why this work advances HRF's mission and deserves support | Largest unresolved narrative/evidence gap: identify the actual beneficiary, workflow and threat rather than assume mission fit. |
| Outcomes | Measures of success and verifiable deliverables | Trial records exist; a prospective pilot measurement plan is still needed. |
| Finance | Annual project costs, requested grant, planned spending and funding history | No complete application budget/history verified here. The$10 experiment envelope is not an annual budget. |
| References | Two people with contact details, or recommendation letters through HRF's stated route | Not selected/verified in this review. Obtain their permission before naming/contacting them. |
| Due diligence | Disclosures and acknowledgement of the form's applicant-vetting policy | Read the actual disclaimer before submitting. It describes public-information review for integrity and mission alignment; no background review of Edmund was performed here. |

The form and programme pages do **not** publish a technical examination, minimum model score,
TEE requirement, four-of-seven requirement, required GPU ownership, or requirement to fine-tune.
Passing our tests does not guarantee a grant. Missing production features can be proposed as
funded deliverables when their current status and risk are stated honestly.

## What we have done versus what remains

| Area | Evidence already available | Pending work and permitted claim |
|---|---|---|
| Open implementation | [Apache-2.0 code licence](../../LICENSE), [CC BY-SA content licence](../../LICENSE-CONTENT), implementation and operator guides | Main community/showcase changes are currently uncommitted/untracked in this workspace. Verify the actual public release and independent clone/build; do not assume a Git remote proves reviewers can inspect this version. Check model, dataset and bundled-asset terms separately. |
| Account/community separation — P1 | Automated owner/known-foreign-ID checks; phone A1/B1 and A1/A2 display checks | Production deployment, revocation/session handling and independent review remain. Phone UI separation alone does not prove protection from root/operator access. [F-014](../features/F-014-private-conversation-access.md), [F-015](../features/F-015-community-membership-and-learner-accounts.md) |
| Personal and approved context — P2 | Explicit personal memory and consented publication; two distinct reviewers, owner/version/scope checks | Encrypted backup/restore with deletion replay remains a gate. Two-reviewer knowledge publication is not four-of-seven infrastructure administration. [F-016](../features/F-016-memory-knowledge-promotion.md), [memory limits](../guides/personal-memory.md) |
| Processing policy — P3 | Synthetic checks exercise scoped context, local-only/reviewed-only behavior, permitted remote memory and compute admission | Verify a real deployment's complete outbound path, logs, failure/failover and private-marker handling. Application tests and absent fetch attempts are not independent network or host-confidentiality proof. [F-017](../features/F-017-processing-policy-and-reviewed-answers.md), [F-023](../features/F-023-community-harness-proof.md) |
| Rented inference — P4 | Four real sequential integrated synthetic answers on a rented RTX4090, worker authentication, verified model artifacts, telemetry and cleanup | Not a concurrency/capacity benchmark. Final economics, comparable workload and missing per-request timings remain. Ordinary rental has no demonstrated host-blind confidentiality. [Live rental](../evaluation/trials/2026-10-28-community-live-rental.md) |
| Community language — P4/P7 | Three returned forms;12 ratings of4 outputs/3 unique texts; naturalness3.67/5 and5/12 ratings accepted as written | Collection completed, quality baseline held for refinement. This is not41.7% accuracy or general Sheng mastery. Community-authored held-out evaluation and prospective acceptance criteria remain; draft language recipe is not activated. Fine-tuning is optional. [Review findings](../evaluation/trials/2026-10-28-three-reviewer-findings.md), [F-032](../features/F-032-community-language-iteration.md) |
| Isolated member network — P5 |6 November: phone page/sign-in/local card, existing-note edit surviving refresh, A2 own data only, clear no-card response. Shutdown0 model/egress attempts and$0 paid compute | Host retained Wi-Fi; no generated answer offline, full host WAN loss/recovery, trusted HTTPS, local DNS or PWA installation proved. Database was ephemeral. [Final physical report](../evaluation/trials/2026-11-06-isolated-mesh-readiness.md) |
| Governed administration — P6 | Proposed four-of-seven design and threat boundaries | Backend action-bound approvals, replay/expiry/revocation tests, audit verification, recovery and independent assessment not demonstrated. Do not claim threshold-protected administration exists. [Roadmap P6](../roadmap/2026-10-26-afribit-mesh-proof.md#p6--demonstrate-4-of-7-community-administration) |
| Confidential remote compute — P8 | Architecture/research and ordinary authenticated rental | No verified attested CPU/GPU workload or channel binding, invalid-evidence rejection, independently assessed design or TEE acceptance. Either keep sensitive tasks local or explicitly fund this later stage. [P8](../roadmap/2026-10-26-afribit-mesh-proof.md#p8--prove-confidential-remote-inference-independently) |
| Pilot and sustainability — P9 | Trial documentation, budget controls, review tooling and programme/governance drafts | No completed representative pilot, recurring whole-service economics, willingness-to-pay evidence, trained-operator acceptance or finished restore exercise. Draft notices/governance still need community/security/legal review. [Governance](../governance/governance.md), [stewardship](../governance/data-stewardship.md) |

The new isolated-phone proof complements the historical real GPU run; they were not one combined
physical end-to-end run. We must not combine them into a claim that private local data was processed
confidentially on a remote GPU during an internet outage.

## Proposed application gates and funded acceptance tests

These are **our recommended evidence gates**, not extra requirements published by HRF.

Before submitting a credible prototype-development proposal:

1. Agree a real pilot problem with a willing civil-society/rights organization or community. Document
   the actual surveillance/censorship/connectivity risk and why this architecture helps. A letter
   or recorded agreement is useful supporting evidence, not a stated universal HRF requirement.
   Protect identities and do not invent dissident status for general community members.
2. Choose one bounded offer and an honest privacy level. Example: locally controlled knowledge and
   account memory for a rights organization, with synthetic or explicitly permitted nonsensitive
   remote requests. Sensitive material stays local until a stronger privacy class is demonstrated.
3. Prepare a sanitized, inspectable release and fresh-install reproduction instructions. Keep test
   passwords, API keys, raw private feedback and operational artifacts out of the public package.
4. Build the annual budget and requested tranche from actual work/quotes: engineering, community
   reviewers, operator training, security assessment, hosting/compute limits, connectivity, power,
   storage/backup, support and hardware where justified. Explain maintenance after the grant and
   distinguish grant-funded public work from paid managed service. Reconcile prior funding honestly.
5. Obtain two willing references and define deliverables, owners and reporting dates. Include both
   successes and held results. HRF decides fit and administrative eligibility; this checklist is not
   an assurance of acceptance.

| Proposed funded gate | Test that would support the claim |
|---|---|
| Durable local service | Fresh deployment on representative equipment; create and edit notes; restart; retrieve own data; encrypted restore; replay deletions before reopening access. Repeat cross-account and cross-community negative checks. |
| Safe member delivery | Trusted HTTPS and local DNS without WAN; actual iPhone/Android PWA installation, first-load asset capture and relaunch; separate shell availability from API/model availability; no private API content in shared caches. |
| Local/remote boundary | Synthetic canaries in permitted/forbidden notes; inspect exact outbound payloads and an independent network capture. Local-only requests must never downgrade to an ordinary remote endpoint; authorization and consent failures are hard failures. |
| Useful language/workflow | Community-defined held-out tasks, reviewers with relevant language/workflow expertise, criteria fixed before comparison, record factual correctness/task completion/language quality and dangerous failure cases. Do not reuse the development set as a held-out benchmark or invent a retroactive cutoff. |
| Cost/capacity | Representative task mix and concurrent users; latency distribution, timeouts, overload behavior, local/remote split and cost per useful completed task. Include idle/rental time, support, power and connectivity, not only token or brief GPU cost. |
| Recovery | With the member LAN intact, disconnect and restore the box's actual provider path; test clear unavailability, privacy-policy preservation and continuation without duplicated turns. Keep live generation and fixture checks distinct. |
| Optional4-of-7 scope | Three distinct approvals fail, four authorize only the specified operation; reject duplicates/replay/expiry/revocation, audit execution, constrain recovery. Independent review required before claiming protection from privileged operators. |
| Optional confidential scope | Verify supported hardware, measured workload and encrypted channel binding; reject stale/forged/missing/mismatched evidence before sending content. This is required for our host-confidential claim, not for every HRF application. |

Hardware ownership, training a model and full four-of-seven/TEE implementation are **not** reasons to
delay a truthfully scoped development application indefinitely. They must not appear as completed
capabilities if they are proposed funding milestones. Real patient/student or similarly sensitive
data is outside the synthetic evidence and needs its own deployment/oversight decision.

## Safe positioning draft

Afribit is developing an open-source community AI node that keeps approved knowledge and members'
personal context under local control. A synthetic prototype has demonstrated authenticated local
access on an isolated member network and, separately, coordinated rented-model inference. We seek
support for a defined rights-focused pilot, reproducible deployment, community language evaluation,
operator training and independent security assessment. Confidential remote inference and threshold
administration remain proposed development work.

This is working language to refine with a real partner, not an application submitted or an assertion
that an HRF relationship exists. Existing budget reservations stay unchanged. HRF's descriptions of
other tools are funding precedents, not security certifications that Afribit inherits.

## Verification limits

Public HRF AI programme/fund/application, Bitcoin fund and first AI grantee announcement were opened
on6 November. The embedded Airtable rendered no readable fields through the web reader; the form
inventory above comes from HRF's own application page. Public GitHub visibility/current release was
not independently established; the local remote points to `novyrix/afribit-ai-chatbot`, while some
README/package links name another project path. Resolve the canonical public URL before applying.
No local credentials or personal references were read or sent for this research. No technical
tests were rerun: the assessment cites dated trial results rather than treating a research pass
as new implementation, pilot, legal or security evidence.
