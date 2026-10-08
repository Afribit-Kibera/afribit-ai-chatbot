# Frontend contributor guide

Afribit AI has a prerendered public site and a React chat PWA. Both live in `apps/web`. This guide and the translation checklist are public because contributors need them; working design plans, generated concepts and QA evidence belong in the ignored `internal/frontend/` directory.

## Run and verify

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev:web
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @afribit/web exec playwright install chromium
pnpm --filter @afribit/web test:e2e
```

To inspect the production build and measure performance:

```sh
pnpm --filter @afribit/web preview --host 127.0.0.1 --port 4173
# In another terminal:
pnpm --filter @afribit/web lighthouse
pnpm --filter @afribit/web qa
```

Development proxies `/api` to `http://127.0.0.1:3001`. `VITE_API_URL` can select the project's API instead; the default is same origin. Preview does not start an API. Browser tests provide deterministic API responses and never call a paid model. A service worker is registered only in the production app, so use the built preview to test offline reloads.

Set `VITE_SITE_URL` before building for a public domain. It defaults to `https://ai.afribit.africa` and supplies canonical URLs, Open Graph URLs and the sitemap. Vercel still builds from the repository root into `apps/web/dist`. The community-node Docker build includes the source documents needed for prerendering; Caddy resolves each route's `index.html` before the root fallback.

## Routes and rendering

| Route | Purpose | Rendering |
| --- | --- | --- |
| `/`, `/sw/`, `/sh/` | Landing and approved sample conversation | Build-time HTML, then React hydration |
| `/privacy`, `/sw/privacy`, `/sh/privacy` | Supplied draft privacy notice | Build-time HTML |
| `/community`, `/sw/community`, `/sh/community` | Community-node overview | Build-time HTML |
| `/app` | Learning workspace and chat | Lazy React entry |
| `/app/settings` | Learning, appearance, install and notification preferences | Lazy screen |
| `/app/contribute` | Sign in, language contributions, review and voting | Lazy screen |

`App.tsx` separates the public entry from `LearningApp`. `scripts/prerender.mjs` renders the public routes through `entry-server.tsx`, writes SEO metadata and computes JavaScript budgets from the Vite manifest. FAQs use native disclosures and public content remains readable without JavaScript. The app deliberately keeps chat mounted while settings are open, preserving a draft or active stream.

## Design system

The public site uses an editorial ivory surface and an orange language panel. The workspace uses the dark brand palette, with system and explicit light modes available. Tokens and component styles live in `src/index.css`; Tailwind v4 exposes the same variables through `@theme inline`.

| Token/family | Value or role |
| --- | --- |
| `--bitcoin` | `#f7931a`, primary buttons and focus |
| `--bitcoin-dark` | `#d97908`, hover/active |
| `--bitcoin-light` | `#ffb45c`, dark-surface accent |
| `--panafrican-red` / `--panafrican-green` / `--panafrican-gold` | `#c1121f` / `#008751` / `#f2a900` |
| `--bg-base` through `--bg-muted` | `#070807` through `#202620` in dark mode |
| `--text-base` / `--text-soft` / `--text-muted` | Base, supporting and secondary readable text |
| `--text-faint` | Decorative only; insufficient contrast for normal text |
| Space Grotesk | Display headings |
| DM Sans | Body, controls and answers |
| JetBrains Mono | Small labels and metadata |
| Poppins ExtraBold | Afribit wordmark only |

The orange display text on ivory uses `#ab5500` to meet contrast requirements. Keep the original PNG brand mark; do not recreate it. Fonts are bundled locally, primarily Latin WOFF2. No font CDN, analytics, trackers, embeds or remote imagery are loaded.

Use the shared Radix `Dialog` for modal title/description, focus containment, Escape and focus return. All touch controls should be at least 44×44 CSS pixels. Keep visible keyboard focus, semantic labels, reflow at 320px and 200% text, and the persistent AI/scam reminder. Chat animation is limited to transforms and opacity and disabled under reduced motion. Do not announce every streamed token to screen readers; announce the completed answer.

## Add or review a language

1. English UI copy is the source in `src/locales/en.json`. Use `useI18n().t(...)` in components; keys are type checked.
2. `sw.json` and `sh.json` contain the same keys and English placeholders. Their `meta.review` value carries the literal `// TODO(reviewers)` marker because JSON does not allow comments. Only community reviewers should translate these values.
3. Keep interface `locale` separate from answer `languageMode`. The latter uses the shared API values `simple_en`, `swahili`, `sheng`, `mixed_ke`. Never silently infer a replacement for an explicit selection.
4. Run `pnpm --filter @afribit/web translations` to check parity and regenerate [the reviewer checklist](translation-todo.md). The generator adds missing English placeholders only while the TODO marker is present; it preserves existing translations. Once reviewers approve every value, replace the TODO marker with the review status. The pending banner then disappears and document language follows the approved interface locale automatically, including prerendered public pages.
5. After an English wording change, update matching placeholders deliberately. `node scripts/translations.mjs --refresh-placeholders` replaces *every* placeholder value and must only be used while both dictionaries are still entirely untranslated.
6. The privacy dictionary entry is imported from `docs/governance/privacy-notice-draft.md` during build. Edit that source document, then have reviewers update the localized entry. Do not edit the generated English notice value directly.

For an additional locale, extend `Locale` and its validation in `lib/preferences.ts`, the dictionaries in `lib/i18n.tsx`, the public path mapping, locale controls and the prerender route/alternate lists. Add its checklist generation and parity test. Use a real language tag in document metadata after approved translations exist. Current placeholder pages intentionally retain `lang="en"` because their content is English.

## Add a screen

Create a component under `src/components`, put every interface string in the dictionaries, and reuse `BrandMark`, `PreferenceControls`, `Dialog` and the semantic token styles. Add a lazy import and route branch in `LearningApp` for app screens. Add a prerender route, title and sitemap entry for public screens. Update Vercel clean-route rewrites when adding a route. Shared API types belong in `@afribit/shared`; frontend adapters live in `lib`.

Provide empty/loading/error states for network-dependent content, preserve drafts on failure, and avoid success text before a successful response. Keep report sharing explicit. Add a Playwright journey and an axe check for a meaningful new interaction, rather than testing CSS implementation details.

## Streaming, history and the offline shell

`lib/api.ts` parses POST NDJSON with split UTF-8 and final-line handling. A response must finish with `done`; interrupted content is marked incomplete. Non-stream fallback is allowed only for an unavailable streaming endpoint (404, 405 or 501), never for partial answers, rate limits or arbitrary server errors. Stop cancels the reader; token renders are batched once per animation frame.

Preferences, drafts and the bounded local history tolerate unavailable browser storage. A known session refreshes through `GET /api/v1/chat/:sessionId`; a session ID can also be entered to resume. There is no API for listing all anonymous server sessions. Removing a conversation removes this device's record; server deletion still requires contacting Afribit. Refused original prompts are removed from local history and drafts, while the server can retain a redacted refusal record.

Build injects hashed JS/CSS/font paths and a version into `public/sw.js`. The worker caches only the app shell and local build resources, never API responses. Navigation is network first, with the cached shell available offline. Changes to the worker source also change its version. Push permission is requested only after the user selects the notification action in settings.

## Quality gates

CI runs the workspace checks, Vitest, Playwright journeys, axe and three mobile Lighthouse runs. Build fails when initial JavaScript exceeds 120KB gzip for landing or 200KB for chat. Lighthouse requires performance ≥90, accessibility/best practices/SEO ≥95, and median LCP below 2.5 seconds. `qa` also captures 320/390/1440px layouts and 200% text, checks console errors and external requests, and measures cold app startup with actual DevTools throttling (1.6Mbps, 150ms latency, 4× CPU).

Browser emulation is useful evidence but does not replace a sanity check on a physical low-end Android and a screen reader before a public launch. Community translations and final privacy review remain human work; passing code checks must not mark either complete.
