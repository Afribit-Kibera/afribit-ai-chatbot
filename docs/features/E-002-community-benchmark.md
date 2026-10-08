# E-002 — Community benchmark: a bare open model vs Afribit, scored blind

**Status:** Draft · **Roadmap stage:** 1 · **Cost:** a few dollars of model calls, plus reviewer time

## Why

A funder's first question is fair: *is this more than a chat window on someone else's model?* So far our
evidence compares models *inside* our system, using 15 cases and 40 retrieval questions that **we wrote
ourselves** and scored with an **AI judge**. This benchmark answers the question with stronger evidence:

- the questions come from the community;
- scoring is blind and by people;
- a bare open model is put side by side with the same model inside Afribit.

The idea came from an outside review, which suggested a 50-question "fail-fast" test before any grant.

The benchmark also builds two things later stages need:

- the community's **human test set** for model releases ([ADR 0015](../adr/0015-how-the-assistant-learns.md));
- the method for the **language readiness check** of new communities ([F-009](README.md#register)).

## The questions

- **50 questions, written by Afribit's educators and reviewers, not by us or by a model.** They come from what
  people really ask. They cover:
  - money in daily life (M-Pesa, agents, P2P, prices in shillings);
  - Bitcoin terms;
  - Lightning and payments;
  - scams people actually meet;
  - safety (seed phrases, "support" contacts).
- **Languages:** about a third each in Sheng, Kiswahili and English, plus some mixed.
- For each question, the writers note **what a good answer must say and must not say** (two or three points
  each).
- **About 10 questions are deliberately outside our knowledge cards,** to test whether each setup admits it
  doesn't know.
- **The set is frozen before any run** and kept out of every prompt, few-shot example and tuning. Otherwise it
  can't test anything.

## What is compared

| Setup | What it is |
|---|---|
| **A. Bare open model** | The chosen Gemma model with a one-line instruction ("reply in the user's language"), no cards. What a community gets from downloading a model and a chat app |
| **B. Afribit** | The same model inside the engine: retrieval, the community's prompt, safety checks, as deployed |
| **C. A large hosted model, bare** (optional) | For context, e.g. the hosted baseline |

All answers use the same model settings, are collected in one run, and have their source hidden.

## How it is scored

- **Three community reviewers score blind** with the existing [blind-review tool](../../tools/blind-review). For
  each answer they record:
  - **correct** (yes / partly / no);
  - **safe** (yes / no);
  - **sounds like us** (1–3);
  - **would you trust it** (yes / no).

  Reviewers are paid for this (the proposal's review budget).
- **AI judges cross-check** with the same rubric and accuracy judge as our other evaluations. Disagreements
  between people and the AI judge are reported, not hidden.
- **Raw outputs are published** with the results, minus anything a reviewer marks as sensitive.

## Go / no-go

Adapted from the outside review:

| Result | Verdict | Action |
|---|---|---|
| The bare model fails often on local questions (wrong facts, unsafe or foreign advice, wrong register), and Afribit fixes most of it | **Go** | Use the side-by-side results in the grant applications, with the real numbers |
| The bare model already answers local questions well | **Pivot the claim** | Lead with what is still ours (data sovereignty, offline, community control, review), not with "better answers" |
| Afribit is no better than the bare model | **Stop and fix** | Find out why (cards, prompt, retrieval) before any pilot |
| Educators or reviewers can't or won't write or score the questions | **Pause** | Fix the reviewer model (pay, time, tools) before writing more code |

No number goes into a proposal until this benchmark has produced it. Example figures like "a 60% failure
rate" are placeholders, not results.

## Acceptance

- 50 frozen questions with their must and must-not points, in the repository's evaluation folder.
- One run of setups A and B (and C if chosen).
- Three reviewers' blind scores collected.
- A results entry in the [test and evaluation log](../book/test-and-evaluation-log.md), with the go / no-go
  verdict.

## Who writes the questions, and when

Documented for the team to review in the
[writers' guide and plan](../evaluation/community-benchmark-writers-guide.md):

- **Writers:** 3–5 Afribit educators.
- **Coordinator:** Eddie or an educator lead.
- **Scorers:** the three reviewers, never the writers.
- **Timeline:** a four-week plan, from the briefing to the go/no-go report.
- **Pay:** writers are paid for their time.

Names, start date and rate are still to be filled in.

## Decisions needed

1. Who writes the 50 questions, and by when. **Proposed** in the
   [plan](../evaluation/community-benchmark-writers-guide.md#plan-for-the-team-to-review); the team reviews it.
2. Which model runs setups A and B. Recommended: the default chosen by [E-001](E-001-gemma4-and-gpu.md).
3. Whether to include setup C. Recommended: yes. It costs cents and answers "why not just use a big model?".

## Depends on

The blind-review tool (built); [E-001](E-001-gemma4-and-gpu.md) for the model choice; reviewer time.
