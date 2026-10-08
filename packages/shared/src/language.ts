/**
 * A language mode is whatever the active community pack declares ("sheng", "pidgin", "plain_en", ...).
 * User selection always overrides inference. The API validates ids against the pack.
 */
export type LanguageModeId = string;

/**
 * PRD §10.2 — the four modes of the original Kibera pack. Kept for code that knows that pack;
 * everything else uses LanguageModeId.
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
