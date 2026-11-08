import { randomUUID } from "node:crypto";
import type { AfribitChatMessage, ExplanationLevel, LanguageExample, RetrievalResult } from "@afribit/shared";
import { selectModelProfile } from "../chat/chatService.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { retrieveKnowledge } from "../knowledge/retrieval.js";
import { retrieveLanguageExamples } from "../knowledge/retrieveLanguageExamples.js";
import { buildCompactPrompt } from "../prompt/compactPrompt.js";
import { applyPostprocess } from "../prompt/postProcess.js";
import { buildPrompt, modeOf } from "../prompt/promptBuilder.js";
import { inspectAnswer } from "../safety/grounding.js";
import { checkOutputSafety } from "../safety/outputSafetyCheck.js";
import { detectSecret } from "../safety/secretDetector.js";
import { runWithPack } from "./active.js";
import type { CommunityPack } from "./types.js";

/**
 * "Try it" in the Voice Lab: one question answered with the real retrieval, the real prompt builder,
 * the real gateway and the same clean-up and safety checks as a live chat, but against a pack that may
 * carry unsaved draft wording. Nothing is stored: no chat session, no messages, no safety events.
 * (The gateway's usage meter still records the model call, as it does for every call.)
 */

export const PREVIEW_MAX_MESSAGE = 500;
export const LEVELS: ExplanationLevel[] = ["simple", "normal", "deep"];

export interface PreviewInput {
  message: string;
  mode: string;
  level: ExplanationLevel;
  promptMode: "full" | "compact";
}

export interface PreviewResult {
  /** What the learner would have been shown. */
  answer: string;
  /** What the model said before the safety checks, when they changed it. */
  rawAnswer: string | null;
  blocked: "secret" | "output_safety" | "ungrounded" | null;
  /** Names and figures in the answer found nowhere in the prompt (the grounding check). */
  ungrounded: string[];
  cardIds: string[];
  promptMode: "full" | "compact";
  promptTokensApprox: number;
  /** The assembled system message: exactly what the model was told. */
  systemPrompt: string;
  /** The messages after it: example conversations, then the question. */
  turns: AfribitChatMessage[];
  modelProfile: string;
  provider: string | null;
  model: string | null;
  latencyMs: number;
  error: string | null;
}

export interface PreviewDeps {
  retrieve(query: string): Promise<RetrievalResult[]>;
  examples(query: string): Promise<LanguageExample[]>;
  profile(mode: string, level: ExplanationLevel): string;
}

export const liveDeps: PreviewDeps = {
  retrieve: (q) => retrieveKnowledge(q),
  examples: (q) => retrieveLanguageExamples(q),
  profile: (mode, level) => selectModelProfile(mode, level),
};

/** Rough token count (4 characters a token) so wording can be weighed against a small model's context. */
export function approxTokens(messages: AfribitChatMessage[]): number {
  return Math.ceil(messages.reduce((n, m) => n + m.content.length, 0) / 4);
}

/** Answers one question against `pack` (saved or draft). Never throws for a model failure: that comes back as `error`. */
export function previewAnswer(gateway: Pick<AfribitAIGateway, "chat">, pack: CommunityPack, input: PreviewInput, deps: PreviewDeps = liveDeps): Promise<PreviewResult> {
  // Everything below reads getPack(), so binding the pack here makes retrieval (synonyms), the prompt and the clean-up rules use the draft.
  return runWithPack(pack, async (): Promise<PreviewResult> => {
    const started = Date.now();
    const base = { promptMode: input.promptMode, cardIds: [] as string[], ungrounded: [] as string[], turns: [] as AfribitChatMessage[], provider: null, model: null, rawAnswer: null, error: null };
    const profile = deps.profile(input.mode, input.level);

    // A pasted secret is refused exactly as in a live chat: it must not reach a model, even in a test.
    if (pack.safety.secretDetection && detectSecret(input.message).detected) {
      return { ...base, answer: pack.prompts.secretWarning, blocked: "secret", promptTokensApprox: 0, systemPrompt: "", modelProfile: profile, latencyMs: Date.now() - started };
    }

    const retrieval = await deps.retrieve(input.message);
    const examples = modeOf(pack, input.mode).codeSwitched ? await deps.examples(input.message) : [];
    const build = input.promptMode === "compact" ? buildCompactPrompt : buildPrompt;
    const messages = build({ languageMode: input.mode, explanationLevel: input.level, retrieval, languageExamples: examples, conversationHistory: [], userMessage: input.message }, pack);
    const shown = {
      ...base,
      cardIds: retrieval.map((r) => r.conceptId),
      promptTokensApprox: approxTokens(messages),
      systemPrompt: messages[0]?.content ?? "",
      turns: messages.slice(1),
      modelProfile: profile,
    };

    try {
      const response = await gateway.chat({
        requestId: randomUUID(),
        messages,
        languageMode: input.mode,
        explanationLevel: input.level,
        modelProfile: profile,
        maxOutputTokens: 800,
        temperature: 0.3,
        privacyProfile: "strict",
      });
      const cleaned = applyPostprocess(response.content);
      const safety = checkOutputSafety(cleaned);
      const ungrounded = safety.violated || pack.safety.grounding === "off" ? [] : inspectAnswer(cleaned, messages).specifics;
      const enforced = ungrounded.length > 0 && pack.safety.grounding === "enforce";
      return {
        ...shown,
        answer: safety.violated ? pack.prompts.outputWithheld : enforced ? pack.prompts.ungroundedNote : cleaned,
        rawAnswer: safety.violated || enforced ? cleaned : null,
        blocked: safety.violated ? "output_safety" : enforced ? "ungrounded" : null,
        ungrounded,
        provider: response.provider,
        model: response.model,
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      return { ...shown, answer: "", blocked: null, latencyMs: Date.now() - started, error: (err instanceof Error ? err.message : String(err)).slice(0, 200) };
    }
  });
}
