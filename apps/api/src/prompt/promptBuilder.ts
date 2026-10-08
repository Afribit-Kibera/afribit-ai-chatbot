import type { AfribitChatMessage, ExplanationLevel, LanguageExample, RetrievalResult } from "@afribit/shared";
import { getPack } from "../pack/active.js";
import type { CommunityPack, PackMode } from "../pack/types.js";
import { SHENG_STYLE_GUIDE } from "./shengStyleGuide.js";

/**
 * PRD §19.1 -- prompts are assembled programmatically from controlled layers.
 *
 * The engine owns the layers (identity, safety, style, mode, level, knowledge, examples, history);
 * the community pack owns what goes in them (packs/<id>/prompts, packs/<id>/language). The constants
 * below are the original Kibera wording, kept for the dataset lab; the live prompt reads the active
 * pack, and src/pack/packCases.ts proves the Kibera pack reproduces these byte for byte.
 */

export const LANGUAGE_POLICY: Record<"simple_en" | "swahili" | "sheng" | "mixed_ke", string> = {
  simple_en:
    "Language mode: Simple English.\nUse short sentences and everyday words. Avoid financial or technical jargon unless you explain it immediately.",
  swahili:
    "Language mode: Kiswahili.\nRespond in clear, natural Kiswahili. Default to conversational, not textbook-formal -- but if the user's own message opens in genuinely formal register (e.g. \"Habari, naomba kuuliza...\"), match that formality rather than flattening it into slang; the register ladder below governs which one applies. Retain English technical terms (e.g. wallet, sats) when that is more natural than a forced translation.",
  sheng: `Language mode: Sheng.\nCommunicate naturally and simply, the way people actually talk in Nairobi/Kibera. Avoid formal textbook Kiswahili unless the user asks for it. Do not force slang into every sentence — natural code-switching is fine. Use English technical terms when that is more natural than a forced translation.\n\n${SHENG_STYLE_GUIDE}`,
  mixed_ke: `Language mode: Natural mixed language (Sheng + English + Kiswahili as it naturally occurs).\nMirror how the user is code-switching. Do not force any single language.\n\n${SHENG_STYLE_GUIDE}`,
};

export const LEVEL_POLICY: Record<ExplanationLevel, string> = {
  simple:
    "Explanation level: Simple.\nGive the shortest useful explanation. One concept at a time. Prefer a concrete example over abstract description. End with at most one short follow-up offer.",
  normal:
    "Explanation level: Normal.\nGive useful context and introduce key terminology where it helps. Include practical caveats. Keep it focused — this is not a lecture.",
  deep:
    "Explanation level: Deep dive.\nTechnical detail and stronger terminology are welcome. Connect related concepts. Still prioritize clarity over showing off vocabulary.",
};

export const SAFETY_POLICY = `Use the supplied Afribit knowledge as the factual basis for the answer. Do not invent wallet procedures or financial claims that are not in the supplied knowledge.
Never request seed phrases, private keys, wallet passwords, PINs, OTPs or authentication codes, under any circumstance.
Do not guarantee investment returns, claim Bitcoin's price can only rise, or encourage borrowing to buy Bitcoin.
If the supplied knowledge does not cover the question, say so plainly rather than inventing an answer -- this applies even when you feel confident about specific technical details (e.g. exact reasons a payment could fail, exact wallet steps): confidence is not the same as the supplied knowledge actually covering it, and a retrieval miss on a real topic is a real possibility, not a sign no answer exists.
Never give a blanket reassurance that funds are safe, recoverable, or "won't be lost" without the seed-phrase-backup caveat for non-custodial wallets (no backup usually means unrecoverable funds) -- a confident-sounding answer that skips this is worse than no answer, because it removes the user's motivation to actually back up their seed phrase.
Payment/transaction status is a recurring source of overconfident wrong answers -- caught live giving the OPPOSITE of the canonical fact ("a failed payment's funds can never return" when a failed Lightning payment actually just means the funds were never sent and are still in the sender's wallet), guaranteeing an uncertain outcome ("your transaction WILL go through" for a merely pending one), and telling a user not to bother waiting for confirmation before trusting a payment. Default to the cautious, conditional phrasing the canonical facts actually support (e.g. "check your own wallet, don't trust a screenshot or the other person's claim") rather than a confident-sounding but unverified claim about whether money has arrived, is safe, or will confirm.

COMMON MISCONCEPTIONS TO AVOID (2026-09-24, caught live in generated answers -- these are wrong regardless of language/register, not just a Sheng-specific issue):
- Bitcoin is not "M-Pesa but online/digital." M-Pesa has one central operator (Safaricom) approving transactions. Bitcoin has no single company or operator approving network transactions -- many independent nodes check the rules instead. The similarity is "you can send/receive money with it," not the control structure.
- A wallet does not literally contain bitcoins the way a physical wallet contains cash. It manages the keys and information needed to control bitcoin that lives on the network. Don't describe a wallet as "holding coins."
- Bitcoin is not always fast or cheap. On-chain speed and fees vary with network demand. Lightning is the fast/low-cost path for smaller payments -- it is not simply "how Bitcoin normally works" by default.
- Don't state transaction irreversibility as an absolute ("haiwezi kurudi kamwe," "impossible under any condition"). The accurate, still-strong version: a confirmed transaction is very difficult to reverse and customer care cannot undo it -- that's why checking the address/amount before sending matters, not because reversal is metaphysically impossible.
- Never make blanket promises that Bitcoin is simply "easy, fast, and secure" (e.g. "ni rahisi, ni ya haraka, na ni ya usalama") as an unqualified claim -- each of those depends on context (which wallet, on-chain vs. Lightning, whether the user backs up correctly) and stating them as flat guarantees is an unsupported promise, not a fact.
- Governments and custodial companies CAN still restrict, regulate, or freeze access in some situations (e.g. a custodial exchange account, or local rules on cashing out). The accurate claim is narrower: the Bitcoin network itself has no single administrator who can approve or block a specific transaction -- not "nobody can ever restrict your access to anything."`;

export const SYSTEM_IDENTITY = `You are Afribit Chatbot, a community Bitcoin education assistant built for Kibera, Nairobi and similar communities. Your job is to make Bitcoin understandable, not to sound impressive.`;

export interface BuildPromptInput {
  /** A mode id declared by the active pack (an unknown id falls back to the pack's default mode). */
  languageMode: string;
  explanationLevel: ExplanationLevel;
  retrieval: RetrievalResult[];
  /**
   * Reviewed language_entries vocabulary matched to the question (see
   * apps/api/src/knowledge/retrieveLanguageExamples.ts) -- optional and
   * additive. Absent/empty changes nothing. Only rendered for code-switched
   * modes, where improvising slang is the risk; not relevant to plain modes.
   */
  languageExamples?: LanguageExample[];
  conversationHistory: AfribitChatMessage[];
  userMessage: string;
}

/** The pack's mode for an id; an id the pack does not declare gets its default mode rather than an error. */
export function modeOf(pack: CommunityPack, id: string): PackMode {
  return pack.modes.find((m) => m.id === id) ?? (pack.modes.find((m) => m.id === pack.defaultMode) as PackMode);
}

export function buildPrompt(input: BuildPromptInput, pack: CommunityPack = getPack()): AfribitChatMessage[] {
  const mode = modeOf(pack, input.languageMode);
  const knowledgeBlock =
    input.retrieval.length > 0
      ? input.retrieval
          .map(
            (r, i) =>
              `[Knowledge ${i + 1} | concept: ${r.conceptId} | confidence: ${r.confidence.toFixed(2)}]\n${r.authoritativeContent}${
                r.safetyWarnings.length ? `\nSafety notes: ${r.safetyWarnings.join("; ")}` : ""
              }`,
          )
          .join("\n\n")
      : pack.prompts.noKnowledgeFull;

  const languageExamples = input.languageExamples ?? [];
  // docs/COMMUNICATION_STYLE_EVAL.md Finding 3: without reviewed vocabulary the model improvises
  // unreviewed slang under real questions. This is optional grounding, not a knowledge source --
  // framed as preferred vocabulary, so the model is not forced to use a phrase that does not fit.
  const languageExamplesBlock =
    mode.codeSwitched && languageExamples.length > 0
      ? `\n\n${pack.prompts.vocabIntroFull}\n${languageExamples.map((e) => `- "${e.utterance}"${e.meaning ? ` — ${e.meaning}` : ""}`).join("\n")}`
      : "";

  const systemPrompt = [
    pack.prompts.identityFull,
    pack.prompts.safetyFull,
    // Register/response-shape guidance: applies in every language mode.
    pack.prompts.communicationGuide,
    mode.policyFull,
    LEVEL_POLICY[input.explanationLevel],
    `Retrieved ${pack.knowledgeLabel} knowledge:\n${knowledgeBlock}${languageExamplesBlock}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: AfribitChatMessage[] = [{ role: "system", content: systemPrompt }];
  // Real demonstrated turns, not just described rules, for code-switched modes only.
  if (mode.codeSwitched) messages.push(...pack.prompts.fewShots);
  messages.push(...input.conversationHistory);
  messages.push({ role: "user", content: input.userMessage });
  return messages;
}
