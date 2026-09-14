import { useState } from "react";
import type { ExplanationLevel, LanguageMode } from "@afribit/shared";
import { Onboarding } from "./components/Onboarding.js";
import { ChatScreen } from "./components/ChatScreen.js";

type Preferences = { languageMode: LanguageMode; explanationLevel: ExplanationLevel };

const STORAGE_KEY = "afribit.preferences";

function loadStoredPreferences(): Preferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Preferences) : null;
  } catch {
    return null;
  }
}

function storePreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage can be unavailable (private mode) — non-critical.
  }
}

export function App() {
  const [preferences, setPreferences] = useState<Preferences | null>(() => loadStoredPreferences());

  function completeOnboarding(languageMode: LanguageMode, explanationLevel: ExplanationLevel) {
    const prefs = { languageMode, explanationLevel };
    storePreferences(prefs);
    setPreferences(prefs);
  }

  function skipOnboarding() {
    completeOnboarding("mixed_ke", "normal");
  }

  if (!preferences) {
    return <Onboarding onComplete={completeOnboarding} onSkip={skipOnboarding} />;
  }

  return (
    <ChatScreen
      languageMode={preferences.languageMode}
      explanationLevel={preferences.explanationLevel}
      onChangeLanguageMode={(mode) => completeOnboarding(mode, preferences.explanationLevel)}
    />
  );
}
