import { getPack } from "../pack/active.js";
import type { CommunityPack } from "../pack/types.js";

/**
 * Deterministic cleanup applied to every model-generated chat response,
 * regardless of language mode. WHAT it cleans is the community's: the rules live in the active
 * pack (language/postprocess.json); this file only applies them. The history below is why the
 * Kibera pack has its rule for "Kwa hivyo". Added 2026-09-24 after live eval
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
export function applyPostprocess(text: string, pack: CommunityPack = getPack()): string {
  let out = text;
  for (const rule of pack.postprocess) {
    rule.find.lastIndex = 0;
    out = out.replace(rule.find, rule.replace);
  }
  return out;
}
