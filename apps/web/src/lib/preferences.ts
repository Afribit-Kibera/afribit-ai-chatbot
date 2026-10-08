import {
  EXPLANATION_LEVELS,
  type LanguageModeId,
  type ExplanationLevel,
} from "@afribit/shared";
import { readStorage } from "./storage.js";
export type Locale = "en" | "sw" | "sh";
export type Theme = "system" | "dark" | "light";
export interface Preferences {
  /** A mode id declared by the active pack. "" means "use the pack's default". */
  languageMode: LanguageModeId;
  explanationLevel: ExplanationLevel;
  locale: Locale;
  theme: Theme;
  textSize: "normal" | "large" | "largest";
}
export const DEFAULT_PREFERENCES: Preferences = {
  languageMode: "",
  explanationLevel: "simple",
  locale: "en",
  theme: "system",
  textSize: "normal",
};
export const PREFERENCES_KEY = "afribit.preferences";
export function validatePreferences(value: unknown): Preferences {
  const p = (
    value && typeof value === "object" ? value : {}
  ) as Partial<Preferences>;
  return {
    // Any id is kept here; the pack decides which ids are valid (see resolveMode in pack.ts).
    languageMode:
      typeof p.languageMode === "string" &&
      /^[A-Za-z0-9_-]{1,64}$/.test(p.languageMode)
        ? p.languageMode
        : DEFAULT_PREFERENCES.languageMode,
    explanationLevel: EXPLANATION_LEVELS.includes(
      p.explanationLevel as ExplanationLevel,
    )
      ? p.explanationLevel!
      : DEFAULT_PREFERENCES.explanationLevel,
    locale: ["en", "sw", "sh"].includes(p.locale ?? "") ? p.locale! : "en",
    theme: ["system", "dark", "light"].includes(p.theme ?? "")
      ? p.theme!
      : "system",
    textSize: ["normal", "large", "largest"].includes(p.textSize ?? "")
      ? p.textSize!
      : "normal",
  };
}
export function loadPreferences() {
  return validatePreferences(readStorage(PREFERENCES_KEY, DEFAULT_PREFERENCES));
}
