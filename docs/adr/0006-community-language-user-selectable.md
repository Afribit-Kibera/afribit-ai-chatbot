# ADR 0006 — Community Language Is User-Selectable

**Status:** Accepted

**Context:** The system must not stereotype users based on location, slang usage, or inferred demographics.

**Decision:** Language mode (`simple_en` / `swahili` / `sheng` / `mixed_ke`) is always a user choice, changeable at any time during a conversation. The system may infer a likely preference from conversational input, but inference never overrides an explicit user selection. Context labels used when collecting language data (e.g. `kibera-context`, `youth-conversation`,) describe the context of collection, not an assumption about how any individual speaks.

**Consequence:** `chat_sessions.language_mode` and `user_preferences.language_mode` are always explicit, settable fields — never derived-and-locked-in silently.
