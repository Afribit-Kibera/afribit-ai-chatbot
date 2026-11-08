# F-034: Education entry, onboarding and private source notebooks

**Authorized:** Edmund's6 November green/Open Notebook learner-flow request.
**Status:** first implementation and scoped local verification; not deployed to a permanent
community service. This implements a bounded part of the existing product brief and pilot plan.

## Problem and behavior

An ordinary learner needs a clear entry, understandable processing choices, a Bitcoin starting
point and a place to organize other permitted learning material. Course-administration controls
must not be the learner's first experience. AI trainers prepare the AI in the separate planned
AI Studio; this feature does not redesign the legacy staff tools.

The app opens with Afribit green motion: a native animated SVG at boot and a short optional
OpenRouter-generated intro. Continue is available without waiting for video; reduced-motion and
video-error fallbacks keep the interface usable. Setup selects the community's answer language,
explanation style, learning goal and processing preferences. Remote Bitcoin processing is off
by default; microphone access is not requested by onboarding. Consent preferences survive a
same-tab reload even when persistent browser storage is declined. Account/community boundaries
remount the learning workspace. Work and Development remain visibly deferred.

Education offers Bitcoin101 through the existing chat/card pipeline or personal source notebooks.
A member can create a notebook, paste/import permitted text/Markdown, read source text and ask
about it. Notebook chat uses Afribit's existing streaming/gateway path, community language guidance
and source-specific educational prompt. Citations remain model claims to inspect, not a verified
accuracy score. Up to six sources and bounded lexical excerpts form the initial retrieval baseline.

## Implementation

- `EducationEntry.tsx`, `SourceNotebooks.tsx`, `NotebookSources.tsx` and scoped green `education.css`.
- `VoiceInput.tsx`: explicit browser-dictation disclosure/permission action; no automatic send or
  app-side audio retention. Disabled for local-only processing, because browser speech can be remote.
- Clipboard action, text-file attachment, character/UTF-8 limits and readable size errors. Existing
  streaming/stop/retry remains; disconnect now signals the inference transport. A cancelled
  first-token attempt cannot start a fallback generation.
- `src/notebooks/`: restricted loopback Open Notebook client, owner-scoped store/service,
  bounded lexical excerpt selection and educational prompt. No general upstream proxy.
- Migration025 maps notebooks to account/community and binds conversations to notebooks. A resumed
  request cannot remove the stored local-only processing boundary by omitting its notebook ID.
- Private-source SQL, real upstream imports/deletions and both inference response modes are
  exercised using synthetic accounts, PGlite and a synthetic processor fixture. No real LLM in that proof.

## Privacy and erasure

The browser never receives Open Notebook's shared API password. Import explicitly disables
embeddings, transformations and asynchronous processing. The source engine has no provider keys
and sits on an internal network behind a loopback-only relay. An owner/pack check precedes source
access; source association is checked before prompt inclusion. Notebook prompts, history and
fallbacks stay local-only through the existing policy guard. Private documents never become
community sources or training data through ordinary use.

Sources are plaintext in a server-controlled store. Existing authentication is not passkey-only
encryption or an operator-proof vault. Notebook erasure remains owner-authorized after membership
revocation. Account deletion refuses while upstream notebook ownership would be orphaned.
Copies in chat answers and backups have separate erasure procedures; no cryptographic-erasure claim.

## Acceptance evidence and remaining work

See [source-engine guide](../guides/open-notebook-source-engine.md) and
[dated trial report](../evaluation/trials/2026-11-06-green-education-notebooks.md).
Passing checks establish functionality under the recorded synthetic/local boundaries.

Remaining: real-model source/teaching evaluation, language and new UI-copy review, complete-book
retrieval and citation verification, PDF/OCR/URL import hardening, structured step/progress storage,
accessible private speech, durable deletion/backup operations, passkey authentication and a separately
designed encrypted vault. Persistent home/Proxmox hosting, membership operations, HTTPS and a real
adult education pilot still need qualification. No current HRF readiness percentage assigned.
