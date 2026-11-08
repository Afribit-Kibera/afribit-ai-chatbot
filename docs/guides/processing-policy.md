# Local-only processing and approved-card answers

**26 October 2026:** built and tested locally for the Mesh proof; not deployed. Apply migration **023**
after 020–022 with the matching API and web release. No rental or new dependency is required.

## Member choices

Open **Answer options** in chat. The default uses the community's configured services. **Keep this
conversation on the community box** restricts search rewriting, embeddings, generation and background
gap labels to permitted on-machine endpoints. The final model uses the node profile without cloud
fallback, even on cloud/hybrid deployments. Subsequent requests cannot downgrade that conversation.

**Approved cards only (no AI call)** uses local text search and shows the matching approved card directly.
It makes no embedding or language-model call and needs no GPU for this request. If nothing matches, it
says so. It does not translate the card, combine answers or prove that a keyword match fully answers
the question. This mode also keeps the conversation local-only: later history must not send that question
outside. Start a new conversation to return to remote services.

The conversation summary shows the restriction. Answer labels distinguish direct cards, approved text
used after model failure and no available answer; those fields survive history refresh. The header chip
describes the service default, while a conversation can impose stricter policy. New controls/no-card
wording use English pending community review. Direct cards retain their approved wording. A browser
still needs connectivity to the box; this does not prove Mesh operation without an uplink.

## Policy and outages

The existing on-machine rule accepts loopback and configured single-label container/service names.
A private tunnel address or a provider named `local` is insufficient. Local inference/embedding HTTP
redirects are rejected. Endpoint/DNS configuration, local software, the OS and hardware remain trusted;
this is not attestation or protection from an operator proxying or reading requests.

Local-only requests skip hosted embeddings and the chef. Local rewriting and gap labels inherit the
restriction. Failed local embeddings degrade to lexical search. Unavailable/quota-exhausted local
generation falls back to a matching approved card, or the existing unavailable message when none exists.
A partially streamed answer is marked interrupted rather than replaced. Local-only requests disable
push notifications. Configured hybrid requests retain their declared cloud fallback.

Policy is set before inserting a question. Prior history is captured in the same SQL statement, before
auxiliary calls. An earlier remote request cannot subsequently load a newly local-only turn. Already
running calls may finish under their earlier permission and cannot be recalled. Async context isolates
simultaneous requests, follows background work and cannot be weakened by nested helpers.

Per-note memory permissions still apply. F-011 continues selecting local-only notes in node mode; they
appear only in the final answering stage. A local-only conversation in cloud mode does not automatically
enable previously unavailable local-only notes. Document/team permissions are separate work.

## API and verification

All three generation endpoints accept `processingPolicy` (`configured` or `local-only`) and `answerMode`
(`generate` or `reviewed-only`). Defaults preserve configured behavior; invalid values fail before
generation. Responses/stream `meta` communicate effective policy, and responses/stream `done` communicate
`answerSource`: `model`, `reviewed-card`, `reviewed-fallback` or `unavailable`. Authorized history reads
return policy and new source metadata; older sources remain unknown. Ownership/membership checks apply.

`pnpm test` exercises real SQL and real gateways/providers against two localhost HTTP fixtures representing
local/external services. Assertions inspect synthetic canaries; `output/proof/p3-processing-trace.json`
stores only case names/call counts, without prompts or credentials. This tests application boundaries,
not GPU performance or the internet. Browser controls, source labels and resume use the CLI fixture and
journey `output/playwright/f017-synthetic-fixture.js` and `f017-browser-check.js`; the mobile capture is
`f017-reviewed-mobile.png`.

F-018 now adds [route allowlists, application allowances and context bounds](community-compute-policy.md).
P3/P4 still need upstream billing/region verification, overall rental caps and workload/latency measurements
before paid comparisons. Document/team ACLs, backup erasure replay, real
Mesh trials and TEE verification remain separate gates. Foreign rental showcases remain synthetic/public
material only; this feature does not authorize real learner records there.
