import type { AfribitChatMessage } from "@afribit/shared";
import { COMMUNICATION_STYLE_GUIDE } from "../prompt/communicationStyleGuide.js";
import { SHENG_STYLE_GUIDE } from "../prompt/shengStyleGuide.js";

/**
 * Prompt versions are part of dataset provenance (Architecture doc §15) —
 * never overwrite one in place; bump the version if the wording changes,
 * so generated rows can be traced back to the exact prompt that produced
 * them.
 */
export const PROMPT_VERSIONS = {
  L04_SHENG_REWRITE: "L04-sheng-rewrite-v1.5",
  L05_USER_UTTERANCES: "L05-user-utterances-v1.5",
} as const;

// v1.1: v1.0 was reliably returning schema-valid-but-empty `examples: []`
// specifically for L04 (rewrite tasks), while L05 (question generation)
// mostly worked with the same schema — the difference was prompt content,
// not the schema. Added an explicit anti-empty-array instruction and moved
// it to the top of the rule list, since burying it after other rules
// wasn't enough to override whatever made the model hedge to empty output
// on rewrite tasks specifically.
//
// v1.2 (2026-09-17): Batch 003's critic/judge pass and the live chat eval
// both surfaced the same failure mode -- "code-switch naturally" alone
// wasn't enough instruction, and the model was defaulting to literal
// English-into-Kiswahili substitution ("Ukiwant...") instead of real Sheng
// vocabulary/particles. Added SHENG_STYLE_GUIDE (shared with the live chat
// prompt in promptBuilder.ts, and with critique.ts/judge.ts's scoring
// prompts) with concrete corrected vocabulary and example sentences from
// direct product-owner review, replacing vague "sound natural" guidance.
//
// v1.4 (2026-09-23): added COMMUNICATION_STYLE_GUIDE alongside
// SHENG_STYLE_GUIDE, for the same reason it was added to the live chat
// prompt (docs/COMMUNICATION_STYLE_EVAL.md) -- its register ladder and
// "never invent slang the user didn't use" rule are directly relevant to
// generation naturalness, and its safety floor applies to any generated
// Bitcoin content, not just live chat responses. Its Response Template
// section (direct answer + example + closing check question) targets a
// full conversational reply and doesn't map cleanly onto a single L04
// rewrite or L05 question -- left in rather than trimmed, since the
// register/safety portions are what matters here and the rest is
// harmless to include.
//
// v1.5 (2026-09-24): SHENG_STYLE_GUIDE itself was rewritten (composition-
// first framing, "Community Teaching Sheng" instead of an implicit "strict
// Sheng" target, expanded AVOID list, corrected verb-grafting allowlist) --
// bumped so generated rows are traceable to the corrected guide, not the
// pre-fix one that still let formal-Sanifu-with-Sheng-words-through.
const COMMON_RULES = `IMPORTANT
- The "examples" array is the actual required output. It must contain exactly the requested number of items. Never return an empty examples array — if you are uncertain, generate your best attempt rather than leaving it empty.
- Do not translate word-by-word.
- Code-switch naturally where that's how people actually speak.
- Keep widely understood Bitcoin terms (Bitcoin, wallet, sats, Lightning) rather than inventing local slang for them.
- Do not invent slang merely to sound local.
- Generate multiple genuinely different phrasings, not near-duplicates.
- Keep meaning consistent with the source material.
- These are synthetic candidates and will be human reviewed before any production use — you are not giving financial advice, you are drafting review material.
- Return only the required structured JSON.

${SHENG_STYLE_GUIDE}

${COMMUNICATION_STYLE_GUIDE}`;

/** Doc §16 example, adapted: a canonical fact rewritten as natural Sheng. */
export function buildL04Prompt(params: { canonicalFact: string; concept: string; count: number }): AfribitChatMessage[] {
  return [
    {
      role: "system",
      content: `ROLE\nYou generate candidate language examples for Afribit AI, a Bitcoin education chatbot for Kibera/Nairobi.\n\nSOURCE OF TRUTH\nUse only the canonical Bitcoin fact supplied below as the factual basis.\n\nLANGUAGE TARGET\nNatural conversational Nairobi Sheng — the way someone would actually explain this to a friend, not a dictionary translation.\n\n${COMMON_RULES}`,
    },
    {
      role: "user",
      content: `CANONICAL FACT\n${params.canonicalFact}\n\nCONCEPT\n${params.concept}\n\nGENERATE\n${params.count} candidate Sheng explanations of this fact, each a different natural phrasing.`,
    },
  ];
}

/** Doc L05: natural ways a beginner might ask about the same concept. */
export function buildL05Prompt(params: { canonicalFact: string; concept: string; intent: string; count: number }): AfribitChatMessage[] {
  return [
    {
      role: "system",
      content: `ROLE\nYou generate candidate user questions for Afribit AI, a Bitcoin education chatbot for Kibera/Nairobi.\n\nTASK\nGiven a Bitcoin concept, write natural questions a beginner might actually ask about it — in conversational Sheng (natural code-switching with English/Kiswahili is expected and good).\n\n${COMMON_RULES}`,
    },
    {
      role: "user",
      content: `CONCEPT\n${params.concept}\n\nINTENT\n${params.intent}\n\nBACKGROUND FACT (for grounding only — do not include this in the questions)\n${params.canonicalFact}\n\nGENERATE\n${params.count} different natural questions someone might ask about this, as if messaging a friend or a chatbot for the first time.`,
    },
  ];
}
