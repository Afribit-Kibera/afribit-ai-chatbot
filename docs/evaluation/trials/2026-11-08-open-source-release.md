# Open-source release preparation — 8 November 2026

This records local release validation and the difference between the public legacy service and
the new Kibera education staging service. It is not participant acceptance or a production launch.

## Reachability

| Service | Result | Meaning |
|---|---|---|
| `https://ai.afribit.africa/app/` | HTTP200 | Existing Vercel frontend; its bundled API origin is `https://ai-api.afribit.africa`. |
| `https://ai-api.afribit.africa/health` | HTTP200, `ok: true` | Existing API process responds; does not establish teaching quality or the new learning features. |
| Existing API `/api/v1/pack` | HTTP200, `kibera-bitcoin` | Existing Kibera pack is available. |
| Existing API `/api/v1/community/access` and `/api/v1/learning/library` | HTTP404 | The public backend has not received the membership/notebook/learning release. |
| Private Proxmox `/app/` and anonymous learning library | HTTP200 and401 in the previous staged smoke | The new app is staged privately; requires the Tailnet and community sign-in. |

Same-origin `/api/v1/*` probes against the Vercel frontend also returned404. Inspection of its
scripts established that the frontend intentionally calls the separate API hostname; those
same-origin404s alone were not treated as a complete service failure.

Current public use must not be described as the new community-private learning pilot. No paid model
question, real learner data or production migration was used for these reachability checks.

## Validation and repository handling

Workspace typecheck, the complete `pnpm test` chain and workspace production build passed locally.
The web unit suite passed86 tests; the preceding clean-UI release passed35 browser tests with1
configured skip and7 axe screen audits with zero reported violations. This release does not rely
on a GitHub Actions result. Actions were disabled for this repository at the operator's request;
the22 existing runs were startup failures and there were no stored Actions artifacts.

A local private Git bundle preserves the pre-release refs. All34 existing commits identify the
same author, Edmund Spira. New commits use Afribit Africa's account identity; `.mailmap` maps that
historical identity to Afribit Africa in supporting Git views. Existing commit objects and third-party
attributions are preserved. A mailmap does not rewrite commit hashes or prove a legal IP assignment.

Known-token/private-key pattern scanning covered623 candidate source files and2491 reachable
historical blobs (49,254,086 bytes) with no findings. That is bounded scanning, not a guarantee
against every possible secret. Secrets, internal operator notes, generated trials and browser
sessions are excluded from commits. No model weights or member database is published.

Local evidence: `output/release-typecheck-20261108.log`, `output/release-tests-20261108.log`,
`output/release-build-20261108.log`, `output/release-public-links-20261108.json`,
`output/release-public-frontend-origins-20261108.json`, `output/release-existing-api-20261108.json`,
and private `internal/release/2026-11-08/secret-audit.json`.

## Repository publication and final checks

The repository is now public at
[Afribit-Kibera/afribit-ai-chatbot](https://github.com/Afribit-Kibera/afribit-ai-chatbot).
The default branch remains `master`; changes are offered for review, not silently merged:

- [PR1: Kibera community learning pilot](https://github.com/Afribit-Kibera/afribit-ai-chatbot/pull/1),
  `release/kibera-community-learning` into `master`.
- [PR2: AGPL licensing and public repository](https://github.com/Afribit-Kibera/afribit-ai-chatbot/pull/2),
  stacked on PR1. Its [source branch](https://github.com/Afribit-Kibera/afribit-ai-chatbot/tree/release/open-source)
  contains the updated README and AGPL application license. Until merged, the default branch's
  previous license and documentation remain as they were.

After licensing/link changes, web units86/86, registry checks35/35, workspace typecheck/build and
the complete browser regression35 passed/1 configured skip passed locally. The final build also
updates visible license copy and generated translation-review placeholders. These are not
community-approved translations. Final index scanning covered625 files with no known-token/
private-key findings and no private operator/output paths. Actions remained disabled after making
the repository public. No workflow artifact existed to expose.

Evidence: `output/open-source-web-tests-20261108.log`, `output/open-source-registry-20261108.log`,
`output/open-source-typecheck-20261108.log`, `output/open-source-browser-20261108.log`,
`output/open-source-final-build-20261108.log`, and private
`internal/release/2026-11-08/final-index-audit.json`.

## Fresh live-model attempt — did not start

A single synthetic Bitcoin/Sheng question was prepared for the existing local CPU model. Upload
failed with an SCP connection closure; subsequent LAN and Tailscale SSH probes each timed out.
No fresh model result exists, and no paid provider or rental was used. The planned question includes
an explicit cue about wallet/coin wording; even a successful answer would not constitute a blind
factual-quality test. The earlier179.2-second source smoke remains the last recorded model evidence.

The user was asked whether Proxmox is powered on/connected. Current private-origin availability
cannot be inferred from the earlier successful staging smoke. A separate read-only probe of the
`afribit-backend` alias found no Docker/staged app there; it was not repurposed or changed.

Local preparation files are `output/kibera-sheng-readiness-20261108.mjs` and `.sh`.
They contain no credentials. Operator credentials would remain on the guest. Retry only after
reachability returns; record answer content, processing/fallback identity, latency and cleanup.

## Remaining participant gates

Restore and verify home-server reachability. Resolve the
[Cloudflare account permission gap](../../guides/cloudflare-pilot-access.md), then qualify
public HTTPS, invitations/account switching and private-data caching from a real phone. Improve the
measured179.2-second CPU source answer; review actual short Bitcoin lessons and community language;
finish retention, encrypted backup/restore and the privacy notice. See the
[staged release trials](2026-11-06-community-learning-release.md).
