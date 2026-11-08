# Community learning release trials — 6 November 2026

**Status: implementation and private Proxmox staging; public participant release pending.**
Umbrella journal `3e936d30-16eb-499b-a6d9-120cc6f93637`, in `output/trials/`.
No hosted-model spend, GPU rental or fine-tuning in these trials. The source changes are uncommitted;
they are not represented as a reviewed production release.

## What changed

Migration026 adds community Studio drafts/tests, immutable reviewed releases, account/pack-scoped
chapter progress and deliberate personal notes. Studio checks the current database role and active
community membership rather than trusting a role claimed by a JWT. Language publication needs a
complete comparison of the exact revision and an independent reviewer. Withdrawals close chapter
reads. Learner notes are not automatically AI memory or community knowledge.

The real React app now implements the approved cream/green Education, My library and My space
layout, personal notebook source reading, selected-notebook chat, small published steps and Studio.
The introduction, explicit processing choices, deferred Work/Development spaces, streaming/Stop,
paste/text import and disclosed optional browser speech remain part of the journey. Unsupported
PDF/OCR/web imports, passkeys, encrypted vaults and private speech are not presented as implemented.

## Local verification

| Trial | Result and boundary |
|---|---|
| Initial learning fixture | Failed before assertions: missing mandatory `beginner_answer`; corrected synthetic fixture, retained failed journal. |
| `48585aa5-aeac-49d8-b80f-3f959c59e39e` |9 groups passed,2 synthetic model calls,0 real calls. |
| Follow-up learning fixture | Failed because its helper advertised JSON on an empty DELETE. Corrected helper and both frontend learning/notebook request adapters. |
| `44ce1f7a-a051-46e7-87ce-bacaffae4a7b` |9 groups passed after correction. |
| `678bfe4b-fd07-46ad-a546-f09676df6c6d`, `a1a19526-b099-4daa-adf6-c5dc6dc9511e` |12 groups passed: role/membership, ownership, stale drafts, independent review, immutable chapters, progress, guidance revisions, incomplete-model refusal, source permission/withdrawal, revoked-member erasure and account-deletion cascades.4 synthetic calls per run,0 real calls. Expected failed-comparison child trials remain recorded as failures. |
| Notebook/stream suite |13 checks passed, including bounded compact source prompts with English/Sheng rules, upstream association checks, no import embeddings/model jobs, loopback/password enforcement, egress refusal and real HTTP stream cancellation. |
| Privacy suite |23 checks passed. |
| Member LAN suite `0dfce4f0-a4bc-47df-9893-15093e6453d4` |9 groups passed,0 model calls. This follow-up is automated, not a new phone/outage test. |
| Web unit suite |86 tests passed across12 files. |
| Typechecks/build |API and web typechecks pass. Web production/SSR build and prerender succeed within existing bundle budgets. |

The first two-screen browser run failed on an obsolete locator and inherited dark chat colors.
After fixes, another run found transient text contrast during opacity animation; the animation now
keeps text fully opaque. The corrected two-screen run passed. A full regression then passed33,
failed2 and skipped1; both failures were the contributor sign-in button's inherited text color.
White text fixed both affected desktop/mobile tests. The final full regression passed **35**, with
**1 configured skip**. Logs: `output/learning-all-browser-final.log` and related browser logs.

The CLI workspace walkthrough first failed waiting for an outdated Studio button name. Corrected
locators then passed7 workflow groups with50 synthetic API requests: source-backed chapter and
progress, note save/erase, notebook creation/import/read, local-only selected-notebook chat, Studio
save/submit/self-publish refusal, and390px Studio/320px Education layout. All7 axe screen audits had
zero violations. These are real React screens with **synthetic transport responses**, not real-model
quality or end-to-end encrypted-storage evidence. Screenshots/log/script: `output/playwright/learning-release-*`.

## Proxmox and actual-model trials

The first LXC101 start failed on absent `/dev/nvidia*` device nodes. The configuration was backed up
before removing only its six stale NVIDIA device entries. The guest then started. The host has a
physical GTX980, but usable CUDA device nodes are absent; no host driver/kernel change was made.
Existing Open WebUI auto-started; its old GPU-required Ollama failed. The old project was preserved.

A dedicated temporary CPU Ollama container read the existing stock Qwen3 8B cache without changing
weights or downloading a new model. Digest `500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41`.
One cold direct question completed in42.216s:38 output tokens,16.982s generation, about2.24 tokens/s.
The ungrounded answer misleadingly described the wallet as storing Bitcoin. **Teaching quality did
not pass.** The temporary container was stopped. This does not establish adequate multi-user capacity.

The independent `afribit-pilot` stack built on the guest; all26 migrations applied to its fresh
database after a pre-migration dump, and61 Kibera cards installed with `--no-embed`. Runtime secrets
and staging credentials remain on the guest in0600 files. No participant invitations were issued.

The first real-service smoke passed6 groups: anonymous denial, authenticated community cards,
learner Studio denial, private note isolation/deletion, independent synthetic chapter publication/
progress/withdrawal, and real Open Notebook import/read with foreign-account denial. Its actual
private source-model request timed out at the client's290s deadline. Cleanup erased the synthetic
notebook with204. Evidence: guest `/opt/afribit-pilot/evidence/stage-smoke-first.json`.

Diagnosis: source teaching ignored `PROMPT_MODE=compact`, sending the full safety/communication
prompt. Ollama reported1024 prompt tokens processed in180s, about5.69 prompt tokens/s,49% progress.
The adapter now honors the configured compact safety, shape and language rules and omits full
few-shot turns in compact mode. A typecheck caught the initially wrong compact-language field name;
it was corrected to `rulesCompact`, then typecheck and13 notebook checks passed. The compact retry
completed all8 groups with one actual local-model request and no hosted spend. Its source question
returned in179.2 seconds, with `local-only`, no fallback, and an answer identifying the fictional
Sunleaf solar cell as turning light into electricity. Evidence: guest
`/opt/afribit-pilot/evidence/stage-smoke-compact.json`. This is a narrow source-grounded functional
pass, not a human-reviewed teaching/language pass. The measured CPU latency remains a release gap.

The first web startup was inaccessible: publishing a port from an internal-only Docker network did
not create a host listener. Only Caddy was given a separate ingress network; API/database/model/source
networks remain internal. The app then returned200 and an anonymous learning library request401.
The web listener now binds only `100.125.232.77:4189` on Tailscale, and the existing home tunnel VM
successfully fetched the app. No household router/uplink changes or public DNS change were made.

## Cleaner interface and Cloudflare qualification — follow-up 8 November

Education now has one question box and two learning paths, with library browsing in My library.
Personal notebooks open a dedicated detail screen; chat avoids duplicate headers and unnecessary
always-visible options. My space holds setup/focus controls. Staff Studio remains role-gated.

Earlier cleanup regressions included hiding the emergency seed-phrase help shortcut (restored) and
a Chromium `ERR_NO_BUFFER_SPACE` navigation failure. The affected focused checks subsequently
passed3/3. The final production build and full browser regression on8 November passed35 with1
configured skip. Logs: `output/learning-clean-build-20261108.log`,
`output/learning-clean-browser-20261108.log`; earlier failed logs remain under `output/learning-clean-*`.
After updating the draft privacy notice, the production build was repeated; its separate focused
onboarding check is recorded in `output/learning-notice-browser-20261108.log`.
The final notice also replaces stale English placeholders in the unapproved Kiswahili/Sheng UI
dictionaries; no localized copy was invented. The final rebuild and focused two-viewport onboarding
rerun are `output/learning-clean-build-release-20261108.log` and
`output/learning-notice-browser-release-20261108.log`.

The updated CLI walkthrough passed7 workflow groups and51 synthetic API requests, with zero
violations in7 axe screen audits.320px Education and390px Studio fit; source import/read, personal
note erase, saved progress, private notebook routing and Studio review were exercised.
`output/playwright/learning-clean-check-20261108.log` and `learning-clean-*.png` retain evidence.
These use fixture responses and do not add real-model or human-review evidence.

Cloudflare qualification created an exact-zone DNS token and verified temporary TXT create/read/
update/delete; all31 original records were preserved. Temporary discovery/audit credentials were
revoked. Account Tunnel, Zero Trust organization and Access-app read scopes were each denied by
membership permissions. The operator chose to **document and defer** this gap. Their configuration
is unknown, not absent. The exact `ai` CNAME remains Vercel; no public route was changed.
[Access report and evidence](../../guides/cloudflare-pilot-access.md).

Retained qualification failures: fractional expiry formatting, an overbroad zone resource rejected
before exact-zone discovery, a TXT journal-helper argument error with successful finally-cleanup,
and a corrected Windows ACL SID spelling. Read-only settings showed SSL full, HTTPS redirect off,
minimum TLS1.0, TLS1.3 on and DNSSEC disabled; no zone-wide setting changed. The privacy draft was
corrected to describe invited accounts, operator/edge access and unqualified backup/retention limits.
No paid compute or new model downloads in this follow-up.

The clean web image was rebuilt privately on Proxmox; only `web` was recreated and its prior image
retained for rollback. App HTTP200, anonymous library401 and the new learning asset were verified.
The first asset probe failed because BusyBox grep does not support `--include`; the probe was
corrected and rerun successfully without treating that tool failure as an application failure.
The rollback reference was preserved through the final notice update. Evidence:
guest `clean-web-smoke-20261108.json`; the source-only archive manifest is
`output/pilot-clean-web-archive-20261108.json`. No database migration, provider call or public DNS
change was made for the clean-interface deployment.

A final8 November read-only Cloudflare recheck confirmed the DNS token active and the unchanged
Vercel CNAME, with no mutation (`output/cloudflare-readonly-20261108.json`). Final onboarding
checks passed2/2 after the notice update. The umbrella journal closes this implementation/staging
attempt as **needs-attention** because participant-release gates remain open, not as a released pilot.

## Remaining release gates

Improve the measured real-model latency and inspect answer accuracy; compare approved English,
Kiswahili and community Sheng teaching with real reviewers. Prepare actual Bitcoin101 small chapters
and independently review them; withdrawn synthetic smoke chapters are not curriculum. Qualify long
source retrieval/citations, source and account erasure copies, encrypted backups/restore and restart
ordering. Connect the selected Cloudflare hostname, verify HTTPS/streaming/PWA/account switching
on a real phone, and finish the pilot privacy notice before adult participant invitations.

[Deployment and Cloudflare handoff](../../guides/proxmox-education-pilot.md).
Cloudflare TLS termination and host plaintext access remain trust boundaries. No TEE, passkey vault,
end-to-end encrypted source storage, new offline-model proof or HRF readiness percentage is claimed.
