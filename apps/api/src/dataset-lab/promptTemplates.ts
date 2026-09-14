import type { AfribitChatMessage } from "@afribit/shared";

/**
 * Prompt versions are part of dataset provenance (Architecture doc §15) —
 * never overwrite one in place; bump the version if the wording changes,
 * so generated rows can be traced back to the exact prompt that produced
 * them.
 */
export const PROMPT_VERSIONS = {
  L04_SHENG_REWRITE: "L04-sheng-rewrite-v1.1",
  L05_USER_UTTERANCES: "L05-user-utterances-v1.1",
} as const;

// v1.1: v1.0 was reliably returning schema-valid-but-empty `examples: []`
// specifically for L04 (rewrite tasks), while L05 (question generation)
// mostly worked with the same schema — the difference was prompt content,
// not the schema. Added an explicit anti-empty-array instruction and moved
// it to the top of the rule list, since burying it after other rules
// wasn't enough to override whatever made the model hedge to empty output
// on rewrite tasks specifically.
const COMMON_RULES = `IMPORTANT
- The "examples" array is the actual required output. It must contain exactly the requested number of items. Never return an empty examples array — if you are uncertain, generate your best attempt rather than leaving it empty.
- Do not translate word-by-word.
- Code-switch naturally where that's how people actually speak.
- Keep widely understood Bitcoin terms (Bitcoin, wallet, sats, Lightning) rather than inventing local slang for them.
- Do not invent slang merely to sound local.
- Generate multiple genuinely different phrasings, not near-duplicates.
- Keep meaning consistent with the source material.
- These are synthetic candidates and will be human reviewed before any production use — you are not giving financial advice, you are drafting review material.
- Return only the required structured JSON.`;

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
