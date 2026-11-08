import type { AfribitChatMessage, ExplanationLevel, LanguageExample, RetrievalResult } from "@afribit/shared";

/**
 * Fixed inputs for the prompt snapshot test. Everything a prompt builder takes is here, so a snapshot
 * of the output only changes when the prompt text or the builder changes -- never because of data.
 */

export const FIXTURE_MODES = ["simple_en", "swahili", "sheng", "mixed_ke"] as const;
export const FIXTURE_LEVELS: ExplanationLevel[] = ["simple", "normal", "deep"];

export const FIXTURE_CARDS: RetrievalResult[] = [
  {
    conceptId: "fixture.fees",
    authoritativeContent: "On-chain fees are paid by the sender to the miner who includes the transaction in a block. Fees depend on transaction size and how busy the network is.",
    approvedExamples: ["Fees go to miners."],
    languageGuidance: null,
    safetyWarnings: ["Never share a seed phrase."],
    sourceVersion: 1,
    freshnessDate: "2026-09-24",
    relatedConcepts: [],
    confidence: 0.82,
  },
  {
    conceptId: "fixture.scams",
    authoritativeContent: "No legitimate support agent will ever ask for a seed phrase, private key, PIN or password.",
    approvedExamples: [],
    languageGuidance: null,
    safetyWarnings: [],
    sourceVersion: 2,
    freshnessDate: "2026-09-24",
    relatedConcepts: [],
    confidence: 0.61,
  },
];

export const FIXTURE_EXAMPLES: LanguageExample[] = [
  { utterance: "ina-run", meaning: "is running", intent: null, style: "sheng" } as LanguageExample,
];

export const FIXTURE_HISTORY: AfribitChatMessage[] = [
  { role: "user", content: "earlier question" },
  { role: "assistant", content: "earlier answer" },
];

export const FIXTURE_USER_MESSAGE = "Niaje, kwani fee ya on-chain inatoka wapi?";

export const FIXTURE_FACTS = JSON.stringify({ points: ["The sender pays the fee."], example: null, warnings: [], not_covered: false, check_topic: "who pays" });
