import type { AfribitChatMessage, ExplanationLevel, LanguageMode, RetrievalResult } from "@afribit/shared";

/** PRD §19.1 — prompts are assembled programmatically from controlled layers. */

const LANGUAGE_POLICY: Record<LanguageMode, string> = {
  simple_en:
    "Language mode: Simple English.\nUse short sentences and everyday words. Avoid financial or technical jargon unless you explain it immediately.",
  swahili:
    "Language mode: Kiswahili.\nRespond in clear, natural Kiswahili. Keep it conversational, not textbook-formal. Retain English technical terms (e.g. wallet, sats) when that is more natural than a forced translation.",
  sheng:
    "Language mode: Sheng.\nCommunicate naturally and simply, the way people actually talk in Nairobi/Kibera. Avoid formal textbook Kiswahili unless the user asks for it. Do not force slang into every sentence — natural code-switching is fine. Use English technical terms when that is more natural than a forced translation.",
  mixed_ke:
    "Language mode: Natural mixed language (Sheng + English + Kiswahili as it naturally occurs).\nMirror how the user is code-switching. Do not force any single language.",
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
If the supplied knowledge does not cover the question, say so plainly rather than inventing an answer.`;

const SYSTEM_IDENTITY = `You are Afribit Chatbot, a community Bitcoin education assistant built for Kibera, Nairobi and similar communities. Your job is to make Bitcoin understandable, not to sound impressive.`;

export interface BuildPromptInput {
  languageMode: LanguageMode;
  explanationLevel: ExplanationLevel;
  retrieval: RetrievalResult[];
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

  const systemPrompt = [
    SYSTEM_IDENTITY,
    SAFETY_POLICY,
    LANGUAGE_POLICY[input.languageMode],
    LEVEL_POLICY[input.explanationLevel],
    `Retrieved Afribit knowledge:\n${knowledgeBlock}`,
  ].join("\n\n");

  const messages: AfribitChatMessage[] = [{ role: "system", content: systemPrompt }];
  messages.push(...input.conversationHistory);
  messages.push({ role: "user", content: input.userMessage });
  return messages;
}
