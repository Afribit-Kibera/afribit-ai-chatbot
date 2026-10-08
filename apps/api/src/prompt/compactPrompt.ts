import type { AfribitChatMessage, ExplanationLevel } from "@afribit/shared";
import { getPack } from "../pack/active.js";
import type { CommunityPack } from "../pack/types.js";
import { modeOf, type BuildPromptInput } from "./promptBuilder.js";

/**
 * The compact prompt: the "waiter". About a seventh of the size of the full
 * prompt (roughly 600-900 tokens versus 4,000-5,500).
 *
 * Why it exists (docs/evaluation/methodology.md, October 2026). On the same 15
 * cases, with the same cards, Gemma 3 12B given the long prompt passed our
 * language rubric 15/15 but was factually accurate on only 6 of 15 (2 clearly
 * wrong); given this compact prompt it passed 14/15 and was accurate on 13 of 15
 * (none clearly wrong). A long, rule-heavy prompt is not just slow on modest
 * hardware -- it makes a small model less careful. The compact prompt keeps each
 * community-approved rule (compose Sheng directly, keep English terms, no "Je",
 * the Sanifu tells to avoid, register mirroring, the safety floor, the known
 * misconceptions) and drops the long explanations, the few-shot turns and the
 * repeated examples.
 *
 * What the prompt SAYS about a community (identity, safety, language rules, shape) comes from the
 * active community pack; this file owns only its layout. The constants below are the original Kibera
 * wording, kept for the dataset lab and for the pack test, which proves the Kibera pack reproduces
 * them byte for byte.
 *
 * The full prompt (promptBuilder.ts) stays the default until community reviewers
 * have compared the two blind; PROMPT_MODE=compact switches to this one.
 */

export const MODE_RULES: Record<"simple_en" | "swahili" | "sheng" | "mixed_ke", string> = {
  simple_en: "Write in Simple English: short sentences, everyday words, explain any jargon at once.",
  swahili:
    "Write in clear, natural Kiswahili. Conversational, not textbook-formal -- unless the customer's own message is formal (for example \"Habari, naomba kuuliza...\"); then match that.",
  sheng: "Write in Community Teaching Sheng (rules below).",
  mixed_ke: "Write the way the customer mixes Sheng, Kiswahili and English; mirror them (Sheng rules below).",
};

/** Condensed from SHENG_STYLE_GUIDE (the community-reviewed source of truth); keep the two in step. */
export const SHENG_RULES = `COMMUNITY TEACHING SHENG -- compose directly in Sheng from the first word; never write formal Kiswahili first and then swap in slang.
- Short conversational sentences, one idea each. Keep common English and Bitcoin terms in English: Bitcoin, wallet, network, bank, transaction, address, security, nodes, miners, blockchain, Lightning, backup, seed phrase, fee.
- Natural mixed verbs: ina-run, inawork, inacontrol, anaeza, unaeza, kuget, kusend, kucheki, kumanage.
- Do NOT force "Niaje/Bro/msee" as a tic. Do not invent neighbourhood slang.
- Avoid Sanifu tells: "Hii ina maana kwamba", "Kwa hivyo/Kwa hiyo", "bila kujali", "ina manufaa", "ili kutumia", "ambayo ni", "anayeweza", "mtandaoni", "benki", "anwani", "usalama", "muamala".
- Never start the closing question with "Je". Ask it directly: "Unatumia wallet gani?"
Model sentences: "Bitcoin ni pesa ya digital yenye ina-run kwa open network. Unaweza tuma ama kuget Bitcoin direct bila bank ama kampuni moja kuwa katikati ya kila payment." / "Si bank ama serikali moja ndio iko inacontrol network yote. Kuna computers mob, zinaitwa nodes, zenye zinacheki transactions."`;

/** Condensed from the safety policy and the known-misconceptions list in promptBuilder.ts. */
export const SAFETY_AND_TRAPS = `Facts and safety (these override style):
- Use ONLY the knowledge below. Never invent wallet steps, prices, fees, laws, or office hours. If the knowledge does not cover the question, say so plainly and suggest asking an Afribit educator.
- Never ask for or repeat a seed phrase, private key, wallet password, PIN or one-time code. Never promise returns, say the price can only rise, or encourage borrowing to buy Bitcoin.
- Never say funds are "safe" or "recoverable" without the seed-phrase-backup caveat for non-custodial wallets. For payment or transaction status, follow the knowledge exactly and never guess why a payment failed.
- Bitcoin is not "M-Pesa but online": no single company approves transactions; many independent nodes check the rules.
- A wallet does not hold coins; it manages the keys that control them.
- Bitcoin is not always fast or cheap: on-chain speed and fees vary; Lightning is the fast, cheap path for small payments.
- A confirmed transaction is very hard to reverse and customer care cannot undo it -- but do not say "impossible".
- Never say Bitcoin is simply "easy, fast and secure". Custodians and governments can still restrict access in some situations; the network itself has no single administrator.`;

export const LEVEL_RULES: Record<ExplanationLevel, string> = {
  simple: "Level: Simple. The shortest useful answer, one concept at a time, a concrete example over abstraction.",
  normal: "Level: Normal. Useful context and the key term where it helps, practical caveats, focused -- not a lecture.",
  deep: "Level: Deep dive. Technical detail and stronger terminology are welcome; still prioritise clarity.",
};

export const SHAPE = `Shape: answer directly first, in the customer's register; give one concrete everyday example (a Kibera or M-Pesa-style situation) if it helps; include any warning plainly; end with ONE short question that checks understanding (not a vague offer). Mirror the customer's formality. If a customer may be in an active scam or money emergency, drop casual language and give plain, direct safety steps.`;

function vocabularyBlock(intro: string, examples: BuildPromptInput["languageExamples"], codeSwitched: boolean): string {
  const list = examples ?? [];
  return codeSwitched && list.length > 0 ? `\n\n${intro}\n${list.map((e) => `- "${e.utterance}"${e.meaning ? ` -- ${e.meaning}` : ""}`).join("\n")}` : "";
}

export function buildCompactPrompt(input: BuildPromptInput, pack: CommunityPack = getPack()): AfribitChatMessage[] {
  const mode = modeOf(pack, input.languageMode);

  const knowledge =
    input.retrieval.length > 0
      ? input.retrieval
          .map(
            (r, i) =>
              `[Card ${i + 1}] ${r.authoritativeContent}${r.safetyWarnings.length ? `\nSafety notes: ${r.safetyWarnings.join("; ")}` : ""}`,
          )
          .join("\n\n")
      : "(no approved knowledge matched this question)";

  const examples = vocabularyBlock(pack.prompts.vocabIntroCompact, input.languageExamples, mode.codeSwitched);

  const system = [
    pack.prompts.identityCompact,
    pack.prompts.safetyCompact,
    mode.rulesCompact,
    mode.codeSwitched ? pack.prompts.codeSwitchedRulesCompact : "",
    LEVEL_RULES[input.explanationLevel],
    pack.prompts.shapeCompact,
    `Knowledge (your only source of facts):\n${knowledge}${examples}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    { role: "system", content: system },
    ...input.conversationHistory,
    { role: "user", content: input.userMessage },
  ];
}

/**
 * The waiter's serving prompt for the restaurant pipeline: the customer's own message plus the chef's
 * fact sheet. The waiter adds no facts and changes no numbers; it serves them in the customer's
 * language and register.
 */
export function buildServePrompt(
  input: {
    languageMode: string;
    explanationLevel: ExplanationLevel;
    facts: string;
    languageExamples?: BuildPromptInput["languageExamples"];
    conversationHistory: AfribitChatMessage[];
    userMessage: string;
  },
  pack: CommunityPack = getPack(),
): AfribitChatMessage[] {
  const mode = modeOf(pack, input.languageMode);
  const examples = vocabularyBlock(pack.prompts.vocabIntroCompact, input.languageExamples, mode.codeSwitched);
  const system = [
    pack.prompts.serveIdentity,
    pack.prompts.serveSafety,
    mode.rulesCompact,
    mode.codeSwitched ? pack.prompts.codeSwitchedRulesCompact : "",
    LEVEL_RULES[input.explanationLevel],
    pack.prompts.shapeCompact,
    `Fact sheet from the chef (your only source of facts):\n${input.facts}${examples}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return [{ role: "system", content: system }, ...input.conversationHistory, { role: "user", content: input.userMessage }];
}
