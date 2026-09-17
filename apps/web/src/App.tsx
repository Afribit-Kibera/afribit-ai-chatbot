import { useEffect, useState } from "react";
import type { ExplanationLevel, LanguageMode } from "@afribit/shared";
import { Onboarding, type OnboardingProfile } from "./components/Onboarding.js";
import { ChatScreen } from "./components/ChatScreen.js";
import { SettingsScreen } from "./components/SettingsScreen.js";

type Preferences = OnboardingProfile & { languageMode: LanguageMode; explanationLevel: ExplanationLevel };
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const STORAGE_KEY = "afribit.preferences";
const DEFAULT_PREFERENCES: Preferences = {
  goal: "understand",
  experience: "new",
  languageMode: "mixed_ke",
  explanationLevel: "normal",
};

function loadStoredPreferences(): Preferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) };
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
  const [screen, setScreen] = useState<"chat" | "settings">("chat");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function savePreferences(profile: Preferences) {
    const prefs = profile;
    storePreferences(prefs);
    setPreferences(prefs);
  }

  function completeOnboarding(profile: Preferences) {
    savePreferences(profile);
    setScreen("chat");
  }

  function skipOnboarding() {
    completeOnboarding(DEFAULT_PREFERENCES);
  }

  function resetSetup() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage can be unavailable; resetting in-memory state is enough.
    }
    setPreferences(null);
    setScreen("chat");
  }

  async function installPwa() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (!preferences) {
    return <Onboarding onComplete={completeOnboarding} onSkip={skipOnboarding} />;
  }

  if (screen === "settings") {
    return (
      <SettingsScreen
        languageMode={preferences.languageMode}
        explanationLevel={preferences.explanationLevel}
        onBack={() => setScreen("chat")}
        onResetSetup={resetSetup}
        onUpdatePreferences={(next) => savePreferences({ ...preferences, ...next })}
        canInstall={Boolean(installPrompt)}
        onInstall={installPwa}
      />
    );
  }

  return (
    <ChatScreen
      languageMode={preferences.languageMode}
      explanationLevel={preferences.explanationLevel}
      profile={preferences}
      onUpdatePreferences={(next) => savePreferences({ ...preferences, ...next })}
      onOpenSettings={() => setScreen("settings")}
    />
  );
}
