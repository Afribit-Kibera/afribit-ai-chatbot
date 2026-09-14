# Afribit AI — Brand Identity

Defined 2026-09-14, before any UI implementation. This is the spec the UI
build works from later — it intentionally does not touch `apps/web`'s
running styles yet.

## Principle

Afribit AI is a sub-brand of Afribit, not a new brand. It should read as
"the same Afribit, now as an AI product" — reusing the parent brand's
color and type system (`D:\dev\afribit\src\app\globals.css`) rather than
forking a new visual language. It is explicitly **not** the same visual
language as `insats-site` or the merchant-logger chat (Inter, warm
cream/ink, deliberately "quiet, no gradients") — those are different
products with different design goals (see `design-qa.md` on that project).
Afribit AI is tech-forward, animated, and dark by default.

## Logo

Source of truth: `D:\dev\afribit\public\Logo` (staged into this repo at
`apps/web/public/brand/`). The mark is Africa's continent silhouette in
Pan-African red/black/green, overlaid with a Lightning-Network-style mesh
(nodes + connecting lines + bolt icons) and a large Bitcoin "B" in Bitcoin
orange/gold. Use the PNG variants (`afribit-mark-icon.png`,
`afribit-mark-full.png`) — the SVG exports in this asset set have an opaque
white background baked in (likely from a vectorizing/tracing step) and
render as a visible white box on the dark UI; the PNGs have real alpha
transparency (verified: corner pixel alpha 0). Ask for a clean transparent
SVG re-export if a vector version is needed later (print, very large sizes).

**Selected identity direction** (`logo/Afribit AI logo concept.png` in this
repo, confirmed 2026-09-14): icon mark + "Afribit" in a heavy geometric sans
+ "AI" in the same weight/font but a lighter grey — not a color-accented
suffix, not two fonts. Tagline: "Smarter communities. Brighter futures."
Implemented as `components/BrandMark.tsx`. Wordmark font is **Poppins**
(ExtraBold) specifically for this lockup — distinct from Space Grotesk,
which stays the general heading font elsewhere (see Typography). Use the
icon-only mark for small spaces (favicon, app icon, chat avatar); the
tagline only where there's room to breathe (onboarding hero).

## Color

Reuse the parent brand's tokens exactly (already production-proven,
already dark, already not-generic-AI-chrome):

| Token | Value | Use |
|---|---|---|
| `--bitcoin` | `#f7931a` | primary accent, CTAs, focus rings |
| `--bitcoin-dark` | `#d97908` | accent hover/active |
| `--bitcoin-light` | `#ffb45c` | accent on dark, subtle highlights |
| `--panafrican-red` | `#c1121f` | sparing — alerts, logo, never as a large fill |
| `--panafrican-green` | `#008751` | secondary accent, success/positive states |
| `--panafrican-gold` | `#f2a900` | gradient partner with bitcoin orange |
| `--bg-base` … `--bg-muted` | `#070807` → `#202620` | dark surface stack |
| `--text-base` … `--text-faint` | `#f4f5f0` → `#5f665b` | text hierarchy |

Carry over the parent site's texture language too: radial orange/green
glows top-corners, subtle grid-line and noise overlays, gradient text for
hero moments (`text-gradient-brand`). Don't invent a new texture system.

## Typography

- **Display / headings:** Space Grotesk — already the parent brand's
  display font, already reads as "AI tech," already proven readable at
  size. Confirmed with the user 2026-09-14 over the alternative (Poppins).
- **Body / UI text:** DM Sans — same as the parent brand. Warmer and more
  readable than Inter at small sizes on low-end Android screens, which
  matters given PRD §27's low-end-device requirement.
- **Mono (message metadata, code, sat amounts):** JetBrains Mono.
- **Wordmark (BrandMark component only):** Poppins ExtraBold, per the selected identity direction — see Logo section. Not used for anything else.
- Explicitly avoid Inter for this product — that's the merchant-logger
  product's font, and the user asked for something more distinctive here.
- Use the parent site's fluid type scale approach (`clamp()`-based steps)
  rather than fixed breakpoints, for true mobile-first scaling.

## Motion

The user wants animation-first, referencing anime.js (animejs.com).
Precedent already exists in this ecosystem: `insats-site` has `animejs`,
`gsap`, and `motion` all installed together. For Afribit AI:

- **anime.js** for chat-specific micro-interactions: message entrance,
  typing/thinking indicator, the Lightning-mesh motif animating (nodes
  pulsing along connection lines — a natural extension of the logo's own
  network graphic) while waiting for a response.
- Respect `prefers-reduced-motion` unconditionally (parent site already
  does this in `globals.css` — carry the same media query over).
- Motion must stay cheap on low-end Android (PRD §27.1: "no heavy animation
  in chat flow") — anime.js's small footprint and CSS-transform-only
  animations are the right call over heavier physics-based libraries for
  the core chat loop; save GSAP/Motion-style scroll-driven work, if any,
  for marketing/onboarding surfaces rather than the message list itself.

## Component approach

Build on shadcn/ui primitives (the parent site already uses shadcn-style
CSS-variable tokens — `--primary`, `--card`, etc. — so this is continuity,
not a new dependency choice), and pull specific animated flourishes from
Aceternity UI / Kokonut UI where they fit a real interaction (e.g. an
animated border/glow on the composer, a spotlight-follow effect on cards)
rather than using them decoratively. Every borrowed component should be
re-themed to the tokens above, not left in its default demo styling.

## What this spec does NOT cover yet

Actual component implementation, chat streaming UX, the onboarding
redesign, and animation timing/easing choices are UI-build work, done
after this spec — not part of this document.
