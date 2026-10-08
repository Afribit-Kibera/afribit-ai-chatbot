# ADR 0008 — Detect Secrets by Content, Not by Keyword

**Status:** Accepted

**Context:** The chat refused any message containing words like "seed phrase", "PIN" or "password". In a Bitcoin education product those are the most important things to talk about: the live app refused to answer "What is a seed phrase?" and gave a non-answer to "Should I give my seed phrase to someone claiming to be support?" — the two questions that most protect a beginner.

**Decision:** Live-chat secret detection (`apps/api/src/safety/secretDetector.ts`) flags the *content* of a secret, never the mention of the topic: a run of 12+ words from the official BIP39 wordlist (or 6+ with a "seed phrase" lead-in), key material (xprv, nsec, WIF, labelled 64-hex), and a PIN, OTP or password with an actual value. Detection is a heuristic that favours not blocking education over catching every possible secret; the model-level rules (never ask for or repeat a secret) remain the second line.

The Dataset Lab's quality gate keeps its separate, looser keyword policy (`mentionsSecretTerms`): changing what training candidates are allowed to mention is a different decision from fixing live chat.

**Consequences:** Education and scam questions reach the model. Real secrets are still refused, not stored and not forwarded. Behaviour is locked in by `pnpm --filter @afribit/api test:secret-detector`.
