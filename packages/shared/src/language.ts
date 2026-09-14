/**
 * PRD §10.2 — MVP language modes. User selection always overrides inference.
 */
export type LanguageMode = "simple_en" | "swahili" | "sheng" | "mixed_ke";

/** PRD §10.3 */
export type ExplanationLevel = "simple" | "normal" | "deep";

export const LANGUAGE_MODES: readonly LanguageMode[] = [
  "simple_en",
  "swahili",
  "sheng",
  "mixed_ke",
];

export const EXPLANATION_LEVELS: readonly ExplanationLevel[] = [
  "simple",
  "normal",
  "deep",
];
