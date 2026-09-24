import type { AfribitChatMessage, ExplanationLevel, LanguageMode, LanguageExample, RetrievalResult } from "@afribit/shared";
import { COMMUNICATION_STYLE_GUIDE } from "./communicationStyleGuide.js";
import { SHENG_FEW_SHOT_EXAMPLES } from "./shengFewShotExamples.js";
import { SHENG_STYLE_GUIDE } from "./shengStyleGuide.js";

/** PRD §19.1 — prompts are assembled programmatically from controlled layers. */

const LANGUAGE_POLICY: Record<LanguageMode, string> = {
  simple_en:
    "Language mode: Simple English.\nUse short sentences and everyday words. Avoid financial or technical jargon unless you explain it immediately.",
  swahili:
    "Language mode: Kiswahili.\nRespond in clear, natural Kiswahili. Default to conversational, not textbook-formal -- but if the user's own message opens in genuinely formal register (e.g. \"Habari, naomba kuuliza...\"), match that formality rather than flattening it into slang; the register ladder below governs which one applies. Retain English technical terms (e.g. wallet, sats) when that is more natural than a forced translation.",
  sheng: `Language mode: Sheng.\nCommunicate naturally and simply, the way people actually talk in Nairobi/Kibera. Avoid formal textbook Kiswahili unless the user asks for it. Do not force slang into every sentence — natural code-switching is fine. Use English technical terms when that is more natural than a forced translation.\n\n${SHENG_STYLE_GUIDE}`,
  mixed_ke: `Language mode: Natural mixed language (Sheng + English + Kiswahili as it naturally occurs).\nMirror how the user is code-switching. Do not force any single language.\n\n${SHENG_STYLE_GUIDE}`,
};

const LEVEL_POLICY: Record<ExplanationLevel, string> = {
  simple:
    "Explanation level: Simple.\nGive the shortest useful explanation. One concept at a time. Prefer a concrete example over abstract description. End with at most one short follow-up offer.",
  normal:
    "Explanation level: Normal.\nGive useful context and introduce key terminology where it helps. Include practical caveats. Keep it focused — this is not a lecture.",
  deep:
    "Explanation level: Deep dive.\nTechnical detail and stronger terminology are welcome. Connect related concepts. Still prioritize clarity over showing off vocabulary.",
};

const SAFETY_POLICY = `Use the supplied Afribit knowledge as the factual basis for the answer. Do not invent wallet procedures or financial claims that are not in the supplied knowledge.
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

const SYSTEM_IDENTITY = `You are Afribit Chatbot, a community Bitcoin education assistant built for Kibera, Nairobi and similar communities. Your job is to make Bitcoin understandable, not to sound impressive.`;

export interface BuildPromptInput {
  languageMode: LanguageMode;
  explanationLevel: ExplanationLevel;
  retrieval: RetrievalResult[];
  /**
   * Reviewed language_entries vocabulary matched to the question (see
   * apps/api/src/knowledge/retrieveLanguageExamples.ts) -- optional and
   * additive. Absent/empty changes nothing; callers that don't fetch
   * these (older code paths, most eval scripts) still work exactly as
   * before. Only rendered for sheng/mixed_ke, same as SHENG_STYLE_GUIDE
   * and the few-shot examples below -- this is vocabulary grounding for
   * code-switched registers, not relevant to simple_en/swahili.
   */
  languageExamples?: LanguageExample[];
  conversationHistory: AfribitChatMessage[];
  userMessage: string;
}

export function buildPrompt(input: BuildPromptInput): AfribitChatMessage[] {
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
      : "No approved Afribit knowledge matched this question. Say you're not certain rather than inventing an answer.";

  const isShengLike = input.languageMode === "sheng" || input.languageMode === "mixed_ke";
  const languageExamples = input.languageExamples ?? [];
  // docs/COMMUNICATION_STYLE_EVAL.md Finding 3: without this, the model's
  // only grounded Sheng vocabulary is SHENG_STYLE_GUIDE's small hardcoded
  // list, so it improvises unreviewed slang under real questions ("dry"
  // was caught live). This is optional grounding, not a knowledge
  // source -- explicitly framed as preferred vocabulary, not required
  // content, so the model isn't forced to use a phrase that doesn't fit.
  const languageExamplesBlock =
    isShengLike && languageExamples.length > 0
      ? `\n\nReviewed Sheng/Kiswahili vocabulary relevant to this question (community-approved, from Afribit's own corpus -- prefer these over improvising unreviewed slang; don't force one in if it doesn't fit):\n${languageExamples
          .map((e) => `- "${e.utterance}"${e.meaning ? ` — ${e.meaning}` : ""}`)
          .join("\n")}`
      : "";

  const systemPrompt = [
    SYSTEM_IDENTITY,
    SAFETY_POLICY,
    // Register/response-shape guidance -- applies in every language mode,
    // unlike SHENG_STYLE_GUIDE below which is Sheng/mixed_ke-specific.
    COMMUNICATION_STYLE_GUIDE,
    LANGUAGE_POLICY[input.languageMode],
    LEVEL_POLICY[input.explanationLevel],
    `Retrieved Afribit knowledge:\n${knowledgeBlock}${languageExamplesBlock}`,
  ].join("\n\n");

  const messages: AfribitChatMessage[] = [{ role: "system", content: systemPrompt }];
  // Real demonstrated turns, not just described rules -- see
  // shengFewShotExamples.ts for why this earns its token cost. Swahili/
  // simple_en want a different register entirely, so this only applies
  // to sheng/mixed_ke.
  if (input.languageMode === "sheng" || input.languageMode === "mixed_ke") {
    messages.push(...SHENG_FEW_SHOT_EXAMPLES);
  }
  messages.push(...input.conversationHistory);
  messages.push({ role: "user", content: input.userMessage });
  return messages;
}
