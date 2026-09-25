/**
 * Deterministic cleanup applied to every model-generated chat response,
 * regardless of language mode. Added 2026-09-24 after live eval
 * (docs/COMMUNICATION_STYLE_EVAL.md) found "Kwa hivyo"/"Kwa hiyo" -- banned
 * in SHENG_STYLE_GUIDE -- still surfacing in a meaningful, stable fraction
 * of live responses (~4/15 across two separate eval runs, both before and
 * after two rounds of strengthening the prompt's ban on it) always in the
 * same structural spot: restating the answer as a "therefore" summary.
 *
 * A system prompt is guidance, not a hard constraint -- it cannot
 * deterministically control token-level word choice from a 70B-parameter
 * model, and this specific connective turned out to be a genuinely
 * persistent structural habit of the model in production use, not a gap in
 * the instruction (the rule is stated four separate times in
 * SHENG_STYLE_GUIDE). Rather than keep tightening prompt text with
 * diminishing returns -- the exact over-tuning trap already documented for
 * the closing-question rule earlier in this project's history -- this is a
 * narrow, deterministic, zero-cost (no extra model call) safety net for
 * this one specific, well-defined pattern.
 *
 * Deliberately narrow in scope: this is not a general formality filter.
 * Adding more patterns here should require the same live-eval evidence bar
 * this one met (a specific phrase, confirmed persistent across multiple
 * live runs despite prompt-level fixes) -- not a first-line response to a
 * single bad sample.
 */
export function fixFormalConnectives(text: string): string {
  return text
    .replace(/Kwa hivyo,?/g, "So,")
    .replace(/Kwa hiyo,?/g, "So,")
    .replace(/kwa hivyo,?/g, "so,")
    .replace(/kwa hiyo,?/g, "so,");
}
