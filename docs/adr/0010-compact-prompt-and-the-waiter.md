# ADR 0010 — A compact prompt, and a waiter that speaks the customer's language

**Status:** Accepted (built, off by default until community reviewers compare it blind).

**Context:** The chat prompt had grown to 4,000–5,500 tokens: long style rules, repeated examples, few-shot turns. Two problems showed up in October 2026.

1. **Speed.** A modest machine must read the whole prompt before answering. On a 2014 desktop with a 4 GB GPU that took 32–85 seconds per question.
2. **Care.** On the same 15 cases and the same knowledge cards, Gemma 3 12B passed our language rubric 15 of 15 with the long prompt but was factually accurate on only 6 (2 clearly wrong); with a compact prompt it was accurate on 11. The production model, Llama 3.3 70B, went from passing 11 of 15 (9 accurate) to passing 15 of 15 (12 accurate, none wrong) with the compact prompt. A long, rule-heavy prompt made models less careful, not more.

**Decision:**

- **Compact prompt** (`apps/api/src/prompt/compactPrompt.ts`, about 900 tokens). It keeps each community-approved rule — compose Sheng directly, keep English technical terms, never open the closing question with "Je", the Sanifu tells to avoid, mirror the customer's register, the safety floor, the known misconceptions — and drops long explanations, repeated examples and few-shot turns. Switch with `PROMPT_MODE=compact`.
- **The waiter's ticket** (`apps/api/src/waiter/ticket.ts`): before retrieval, a small model rewrites the customer's Sheng/Kiswahili/English message into a clean English search question. Searching with it instead of the raw message put the right card in the top 3 for 40 of 40 benchmark questions (33 of 40 for the raw words). The ticket is used for **search only**; the answer is written for the customer's own message. If the waiter fails, retrieval uses the customer's own words. Switch with `WAITER_QUERY_REWRITE=true`.
- The long prompt remains the default **until community reviewers have compared the two blind** (`tools/blind-review/`). The evaluation is an AI judge on 15 cases and cannot, alone, change the public voice of the product.

**Consequences:** A node reads about a fifth as much text per question, and a 16 GB GPU answers in 10–19 seconds. The community-approved style rules now live in two places (the full style guides and the compact prompt) and must be kept in step. Models that are fluent but wrong are a real risk; the accuracy judge, not only the language rubric, is part of every future prompt change.
