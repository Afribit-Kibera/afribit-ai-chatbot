# Clickable learner and AI Studio design

6 November 2026. Trial `47ec8783-7dc5-489d-8bb4-66867c6c7baa`.

This continues the Afribit green design as a standalone HTML/CSS/JavaScript prototype in the
internal frontend inspiration folder. It does not replace the application, modify a database,
activate AI Studio permissions, train a model or publish a service. All community/review states
and chat answers are clearly illustrative. Added text and choices stay in tab memory only.

The prototype covers Education, a personal/community library, source reading, a source-aware chat,
optional three-step study, personal notes and the separate AI Studio sources/language/review flow.
Welcome/setup/focus screens reuse the existing green MP4 and animated SVG. Work and Development
remain deferred. The actual Afribit mark and existing locally installed fonts are reused, with
font licenses alongside the copied files. No package install, new image/video generation, model
download, API/provider request or paid compute. Cost for this design trial: **$0**.

## Verification

- JavaScript syntax passed Node's check.
- The first browser walkthrough passed12 groups: keyboard skip, intro/reduced motion, setup,
  illustrative Sheng streaming/source reading, Stop, notebook create/import/read, personal chat,
  guided practice/completion, deliberate notes, Studio draft/review and responsive layout.
- Eleven main screens fit390px without horizontal overflow; Education also fit320px.
- Five desktop/dialog states and three initially tested mobile states had no detected WCAG A/AA
  violations. One mobile Education state found two inactive navigation labels at4.49:1 contrast;
  those were darkened. Mobile text/targets were enlarged at the same time.
- Follow-up checks covered eight mobile/320px states with zero detected violations, plus changing
  the question's source collection and the distinct “try again” practice state.
- The first walkthrough recorded no uncaught browser errors and only loopback static-asset
  requests. There were zero API/model requests. Prepared answer streaming is not model evidence.
- Final focused checks confirmed constructive incorrect-answer feedback with no detected axe
  violations, no old personal sample conversation carried into Bitcoin study, and direct file
  opening/navigation without a server. The temporary preview and browser were stopped afterward.

Two follow-up attempts timed out while looking for the newly added source picker. The first reused
the old browser document; the second exposed a Unicode-sensitive source replacement that had not
matched the original text. Exact string assertions and Unicode escapes corrected the helper edit;
the refreshed follow-up passed. Both failed logs remain alongside the successful browser logs.
Keyboard checks also led to a corrected skip-link route and preserved focus on practice/filter
controls. Wrong practice choices use a separate visual state and constructive explanation.

The prototype does not claim complete accessibility conformance, translated curriculum, vetted
Sheng, validated factual teaching, operator-proof storage, passkeys or a completed adult pilot.
Studio comparisons are prepared examples and cannot be submitted as actual model test results.
Design workspace switching grants no authority in the intended application.

Screenshots, scripts and logs: `output/playwright/education-design-*`. Design decisions and
walkthrough: `internal/frontend/2026-11-06-learning-workspace-design.md`. Prototype, trial pointer,
hashes and verification result: `internal/frontend/inspiration/2026-11-06-green/`.
