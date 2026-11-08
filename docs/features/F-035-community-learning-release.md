# F-035: Community learning workspace and AI Studio release

**Authorized:** Edmund, 6 November 2026: build the approved green experience into the real
application and prepare an online community pilot on the home Proxmox server.
**Status:** built and privately staged; local automated verification passed. Public ingress,
compute performance, human teaching review and operational release checks remain pending.

## Intended behavior

The real learner journey is intro → language/style/access/processing setup → focus → Education.
Education supports a community Bitcoin collection and account-private source notebooks. Learners
can ask, inspect sources, follow published small learning steps, save deliberate notes and return
to their place. Work and Development remain deferred. Existing streaming, Stop, secret refusal,
history ownership and strict private-context routing remain functional.

AI Studio is an authorized community workspace, not a learner dashboard or model-weight trainer.
It prepares sources, language/teaching guidance and study paths; records actual model previews;
and requires independent review of the exact revision before publication. No private learner
notebook/chat browser, synthetic answer, fake progress or decorative publication action ships.

## Implementation sequence and exit checks

- [x] Persist versioned published study paths, scoped progress and deliberate personal notes.
- [x] Build community-scoped Studio drafts, real previews and independent publication.
- [x] Replace the initial entry/library shell with the approved responsive workspace.
- [x] Integrate live source reading, selected-source chat and real guided progress/My space.
- [x] Integrate Studio UI with actual role checks, draft revisions and error/unavailable states.
- [x] Verify API authorization, cross-community isolation, stale revisions, review and erasure.
- [x] Verify local browser journeys, keyboard/mobile/accessibility and configured offline shell states.
- [ ] Verify authenticated public-phone HTTPS/PWA and private-data caching on the deployed origin.
- [ ] Qualify Proxmox guest, source engine, model, HTTPS/domain, backups and invite-only access.
- [ ] Stage and smoke-test the release before opening invitations to community participants.

## Data and privacy boundaries

New personal notes are separate from model memory and shared knowledge. Progress is scoped by
account, community and immutable released path version. Published revisions remain readable to
an enrolled owner; a new curriculum does not silently rewrite an existing learning position.
Drafts and model preview inputs must not include another learner's private context. Reviewed
guidance is appended below safety/language constraints and cannot disable route policy.

Authentication/access control is distinct from phone-held encryption and host confidentiality.
Passkeys, encrypted-vault guarantees, private speech and unrestricted PDF/OCR/web fetching may
not be silently represented as working features. Their supported behavior needs separate verified
implementation; unavailable capabilities must be clearly explained. No real recovery words,
medical/financial decision automation or model-weight fine-tuning is part of this release.

## Verification strategy

Use fresh PGlite integration fixtures for migrations/ownership/review/versioning and controlled
inference fixtures for failure/cancellation/policy boundaries. Those do not establish model quality.
Use existing browser E2E/CLI tooling for real React screens and state transitions; test guest and
signed-in flows, refresh/account switching, mobile widths, dialogs, focus and source provenance.
Document every trial. Actual local inference and host smoke tests require separately recorded
provider identity/results. Paid calls/rentals remain within explicitly approved budget envelopes.

The user chose home Proxmox. Read-only discovery found the reachable `home` node and stopped
`private-ai` LXC101 (4 cores,12GiB RAM,120GB disk, unprivileged). The running Linux VM has other
services and will not be repurposed. The selected public hostname is `ai.afribit.africa` (Cloudflare).
The dedicated guest now hosts private staging; public DNS still points to Vercel. See the
[deployment handoff](../guides/proxmox-education-pilot.md) and
[trial report](../evaluation/trials/2026-11-06-community-learning-release.md). Hosting and actual
model/phone quality remain separate acceptance gates; a successful build does not establish them.

## Release and rollback

Stage under a dedicated app directory/project, generate private server secrets without printing
them, keep database/source/model management private, and expose only the authenticated HTTPS app.
Back up the intended database and source volumes before applying forward migrations. Preserve the
previous image/config. Revert the app image for code regressions; do not erase user data or run
destructive schema rollback. Disable new compute/invitations on ownership, source-routing or
privacy regressions. Record migration and smoke results before telling people the service is live.
