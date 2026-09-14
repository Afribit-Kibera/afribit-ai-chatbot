/**
 * Structured-output JSON schemas for Dataset Lab generation calls
 * (Architecture doc §14). Kept deliberately strict (no free-form
 * `confidence` float, no optional fields) because OpenRouter/OpenAI
 * structured-output "strict" mode requires every property to be in
 * `required` with `additionalProperties: false` at every level.
 */

export interface CandidateExample {
  text: string;
  register: string;
  notes: string;
}

export interface CandidateBatch {
  concept: string;
  intent: string;
  language: "sheng" | "swahili" | "simple_en" | "mixed_ke";
  examples: CandidateExample[];
}

export const candidateBatchSchema = {
  type: "object",
  properties: {
    concept: { type: "string", description: "Echo back the concept name given in the prompt, unchanged." },
    intent: {
      type: "string",
      description:
        "A short snake_case intent label for what this batch is about, e.g. 'receive_bitcoin' or 'explain_sats'. NOT a sentence, NOT the generated content — that belongs in the examples array below.",
    },
    language: { type: "string", enum: ["sheng", "swahili", "simple_en", "mixed_ke"] },
    examples: {
      type: "array",
      description:
        "REQUIRED, and this is the actual output the caller needs — every candidate phrasing you generate goes here as a separate array item. Never leave this empty; never put generated text anywhere else.",
      items: {
        type: "object",
        properties: {
          text: { type: "string", description: "One complete candidate phrasing — a full sentence or question, not a fragment." },
          register: { type: "string", description: "e.g. 'casual', 'formal', 'merchant_facing'." },
          notes: { type: "string", description: "Brief note on word choice or phrasing rationale, or empty string if none." },
        },
        required: ["text", "register", "notes"],
        additionalProperties: false,
      },
    },
  },
  required: ["concept", "intent", "language", "examples"],
  additionalProperties: false,
} as const;

/** Runtime validation beyond JSON-schema shape (doc §17 "Schema" check). */
export function isValidCandidateBatch(value: unknown): value is CandidateBatch {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.concept !== "string" || typeof v.intent !== "string") return false;
  if (!["sheng", "swahili", "simple_en", "mixed_ke"].includes(v.language as string)) return false;
  if (!Array.isArray(v.examples)) return false;
  return v.examples.every(
    (e) =>
      typeof e === "object" &&
      e !== null &&
      typeof (e as Record<string, unknown>).text === "string" &&
      typeof (e as Record<string, unknown>).register === "string" &&
      typeof (e as Record<string, unknown>).notes === "string",
  );
}
