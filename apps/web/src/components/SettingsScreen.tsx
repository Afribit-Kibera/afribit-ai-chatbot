import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Bell, BellOff, Check, Download, Languages, LogOut, RotateCcw, SlidersHorizontal, UserPlus } from "lucide-react";
import type { ExplanationLevel, LanguageMode } from "@afribit/shared";
import { BrandMark } from "./BrandMark.js";
import { Button } from "./ui/button.js";
import { cn } from "../lib/utils.js";
import { disablePushNotifications, enablePushNotifications, getNotificationState, sendPushNotificationTest, type NotificationState } from "../lib/pwa.js";
import { fetchProfile, login, logout, register, type AuthedProfile } from "../lib/auth.js";
import { submitLanguageExample } from "../lib/microtasks.js";

interface SettingsScreenProps {
  languageMode: LanguageMode;
  explanationLevel: ExplanationLevel;
  onBack: () => void;
  onUpdatePreferences: (next: Partial<{ languageMode: LanguageMode; explanationLevel: ExplanationLevel }>) => void;
  onResetSetup: () => void;
  canInstall: boolean;
  onInstall: () => void;
}

const LANGUAGE_OPTIONS: { value: LanguageMode; label: string; helper: string }[] = [
  { value: "mixed_ke", label: "Mix Sheng + English", helper: "Natural everyday code-switching." },
  { value: "sheng", label: "Strict Sheng", helper: "Local and casual." },
  { value: "swahili", label: "Kiswahili only", helper: "Clear, natural Kiswahili." },
  { value: "simple_en", label: "Simple English", helper: "Short answers, no heavy jargon." },
];

const LEVEL_OPTIONS: { value: ExplanationLevel; label: string; helper: string }[] = [
  { value: "simple", label: "Simple", helper: "One idea at a time." },
  { value: "normal", label: "Normal", helper: "Balanced explanations." },
  { value: "deep", label: "Deep", helper: "More detail when needed." },
];

const NOTIFICATION_COPY: Record<NotificationState, string> = {
  unsupported: "Notifications are not supported on this browser.",
  not_configured: "Push notifications need VAPID keys on the server before they can be enabled.",
  default: "Get notified when Afribit has a reply or learning reminder.",
  denied: "Notifications are blocked in your browser settings.",
  granted: "Notifications are allowed on this device.",
  enabled: "Notifications are enabled for this device.",
};

export function SettingsScreen({
  languageMode,
  explanationLevel,
  onBack,
  onUpdatePreferences,
  onResetSetup,
  canInstall,
  onInstall,
}: SettingsScreenProps) {
  const [notificationState, setNotificationState] = useState<NotificationState>(() => getNotificationState());
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationNote, setNotificationNote] = useState<string | null>(null);

  useEffect(() => {
    setNotificationState(getNotificationState());
  }, []);

  // Contributor/admin account -- separate from chat, which stays fully
  // anonymous (see db/migrations/009_auth.sql). Only Microtasks
  // contribution and admin actions need this.
  const [profile, setProfile] = useState<AuthedProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [phraseText, setPhraseText] = useState("");
  const [phraseMeaning, setPhraseMeaning] = useState("");
  const [phraseStyle, setPhraseStyle] = useState<"sheng" | "swahili" | "mixed_ke" | "simple_en">("sheng");
  const [phraseBusy, setPhraseBusy] = useState(false);
  const [phraseNote, setPhraseNote] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile()
      .then(setProfile)
      .finally(() => setProfileLoading(false));
  }, []);

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      if (authMode === "register") {
        await register(authEmail, authPassword);
      } else {
        await login(authEmail, authPassword);
      }
      setProfile(await fetchProfile());
      setAuthEmail("");
      setAuthPassword("");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setAuthBusy(false);
    }
  }

  function handleLogout() {
    logout();
    setProfile(null);
  }

  async function handleSubmitPhrase(e: FormEvent) {
    e.preventDefault();
    setPhraseBusy(true);
    setPhraseNote(null);
    try {
      await submitLanguageExample({ utterance: phraseText.trim(), meaning: phraseMeaning.trim() || undefined, style: phraseStyle });
      setPhraseText("");
      setPhraseMeaning("");
      setPhraseNote("Thank you — sent for community review before it's ever used.");
    } catch (err) {
      setPhraseNote(err instanceof Error ? err.message : "Could not submit that right now.");
    } finally {
      setPhraseBusy(false);
    }
  }

  async function handleEnableNotifications() {
    setNotificationBusy(true);
    setNotificationNote(null);
    try {
      const next = await enablePushNotifications();
      setNotificationState(next);
      if (next === "not_configured") {
        setNotificationNote("Server keys are missing, so this device cannot subscribe yet.");
      }
    } catch {
      setNotificationState("not_configured");
      setNotificationNote("Could not enable notifications right now.");
    } finally {
      setNotificationBusy(false);
    }
  }

  async function handleDisableNotifications() {
    setNotificationBusy(true);
    setNotificationNote(null);
    try {
      await disablePushNotifications();
      setNotificationState(getNotificationState());
    } finally {
      setNotificationBusy(false);
    }
  }

  async function handleTestNotification() {
    setNotificationBusy(true);
    setNotificationNote(null);
    try {
      await sendPushNotificationTest();
      setNotificationNote("Test notification sent.");
    } catch {
      setNotificationNote("Test notification could not be sent.");
    } finally {
      setNotificationBusy(false);
    }
  }

  const notificationsEnabled = notificationState === "enabled" || notificationState === "granted";
  const canAskForNotifications = notificationState === "default" || notificationState === "granted";

  return (
    <div className="relative min-h-full overflow-hidden bg-bg-base">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(247,147,26,0.15),transparent_32%)]" />

      <main className="relative mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-4">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-soft bg-bg-surface/70 text-text-muted"
            aria-label="Back to chat"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <BrandMark size="sm" />
          <span className="h-10 w-10" />
        </header>

        <section className="py-7">
          <p className="font-mono text-xs uppercase text-bitcoin-light">Settings</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Make Afribit feel right.</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-text-muted">
            These settings are light. You can also change voice later by telling Afribit in chat.
          </p>
        </section>

        <div className="grid gap-4 pb-8">
          <section className="rounded-xl border border-border-soft bg-bg-surface/90 p-4">
            <div className="flex items-start gap-3">
              <Download className="mt-1 h-4 w-4 text-bitcoin-light" />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold">Install app</h2>
                <p className="mt-1 text-sm leading-6 text-text-muted">
                  Add Afribit AI to your phone for a cleaner full-screen chat and offline shell access.
                </p>
              </div>
            </div>
            <Button className="mt-4" size="sm" onClick={onInstall} disabled={!canInstall}>
              {canInstall ? "Install Afribit AI" : "Install unavailable"}
            </Button>
          </section>

          <section className="rounded-xl border border-border-soft bg-bg-surface/90 p-4">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-bitcoin-light" />
              <h2 className="text-base font-semibold">Voice</h2>
            </div>
            <div className="mt-4 grid gap-2">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onUpdatePreferences({ languageMode: option.value })}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    languageMode === option.value ? "border-bitcoin bg-bitcoin/10" : "border-border-soft bg-bg-base/40 hover:border-border-strong",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-text-base">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-text-muted">{option.helper}</span>
                  </span>
                  {languageMode === option.value && <Check className="h-4 w-4 text-bitcoin-light" />}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border-soft bg-bg-surface/90 p-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-bitcoin-light" />
              <h2 className="text-base font-semibold">Answer depth</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {LEVEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onUpdatePreferences({ explanationLevel: option.value })}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    explanationLevel === option.value ? "border-bitcoin bg-bitcoin/10" : "border-border-soft bg-bg-base/40 hover:border-border-strong",
                  )}
                >
                  <span className="block text-sm font-semibold text-text-base">{option.label}</span>
                  <span className="mt-1 block text-xs text-text-muted">{option.helper}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border-soft bg-bg-surface/90 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-bitcoin-light">{notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold">Notifications</h2>
                <p className="mt-1 text-sm leading-6 text-text-muted">{NOTIFICATION_COPY[notificationState]}</p>
                <p className="mt-2 text-xs leading-5 text-text-faint">
                  Afribit will only use this for chat replies and learning reminders. Never share seed phrases or private keys.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleEnableNotifications}
                disabled={notificationBusy || !canAskForNotifications}
              >
                {notificationsEnabled ? "Sync device" : "Enable"}
              </Button>
              {notificationsEnabled && (
                <Button size="sm" variant="ghost" onClick={handleDisableNotifications} disabled={notificationBusy}>
                  Disable
                </Button>
              )}
              {notificationsEnabled && (
                <Button size="sm" variant="ghost" onClick={handleTestNotification} disabled={notificationBusy}>
                  Send test
                </Button>
              )}
            </div>
            {notificationNote && <p className="mt-3 text-xs text-text-muted">{notificationNote}</p>}
          </section>

          <section className="rounded-xl border border-border-soft bg-bg-surface/90 p-4">
            <div className="flex items-start gap-3">
              <UserPlus className="mt-1 h-4 w-4 text-bitcoin-light" />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold">Contributor account</h2>
                <p className="mt-1 text-sm leading-6 text-text-muted">
                  Chatting with Afribit never needs an account. Sign in only if you want to help review or add
                  Sheng/Kiswahili phrases through Microtasks — every submission is community-reviewed before it's
                  ever used.
                </p>
              </div>
            </div>

            {profileLoading ? null : profile ? (
              <div className="mt-4">
                <p className="text-sm text-text-base">
                  Signed in as <span className="font-semibold">{profile.email}</span>{" "}
                  <span className="text-xs uppercase text-text-faint">({profile.role})</span>
                </p>
                <Button size="sm" variant="ghost" className="mt-3" onClick={handleLogout}>
                  <LogOut className="mr-1.5 h-3.5 w-3.5" />
                  Sign out
                </Button>

                <form onSubmit={handleSubmitPhrase} className="mt-5 border-t border-border-soft pt-4">
                  <h3 className="text-sm font-semibold">Contribute a phrase</h3>
                  <div className="mt-3 grid gap-2">
                    <input
                      type="text"
                      required
                      placeholder="A Sheng or Kiswahili phrase, e.g. Poa sana bro"
                      value={phraseText}
                      onChange={(e) => setPhraseText(e.target.value)}
                      className="rounded-lg border border-border-soft bg-bg-base/40 p-2.5 text-sm text-text-base placeholder:text-text-faint"
                    />
                    <input
                      type="text"
                      placeholder="What it means (optional)"
                      value={phraseMeaning}
                      onChange={(e) => setPhraseMeaning(e.target.value)}
                      className="rounded-lg border border-border-soft bg-bg-base/40 p-2.5 text-sm text-text-base placeholder:text-text-faint"
                    />
                    <select
                      value={phraseStyle}
                      onChange={(e) => setPhraseStyle(e.target.value as typeof phraseStyle)}
                      className="rounded-lg border border-border-soft bg-bg-base/40 p-2.5 text-sm text-text-base"
                    >
                      <option value="sheng">Sheng</option>
                      <option value="mixed_ke">Mixed Sheng + English</option>
                      <option value="swahili">Kiswahili</option>
                      <option value="simple_en">Simple English</option>
                    </select>
                  </div>
                  <Button type="submit" size="sm" className="mt-3" disabled={phraseBusy || !phraseText.trim()}>
                    {phraseBusy ? "Sending…" : "Submit for review"}
                  </Button>
                  {phraseNote && <p className="mt-2 text-xs text-text-muted">{phraseNote}</p>}
                </form>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="mt-4">
                <div className="mb-3 flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className={cn("rounded-md px-2 py-1", authMode === "login" ? "bg-bitcoin/15 text-bitcoin-light" : "text-text-muted")}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("register")}
                    className={cn("rounded-md px-2 py-1", authMode === "register" ? "bg-bitcoin/15 text-bitcoin-light" : "text-text-muted")}
                  >
                    Create account
                  </button>
                </div>
                <div className="grid gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="rounded-lg border border-border-soft bg-bg-base/40 p-2.5 text-sm text-text-base placeholder:text-text-faint"
                  />
                  <input
                    type="password"
                    required
                    minLength={10}
                    placeholder="Password (10+ characters)"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="rounded-lg border border-border-soft bg-bg-base/40 p-2.5 text-sm text-text-base placeholder:text-text-faint"
                  />
                </div>
                <Button type="submit" size="sm" className="mt-3" disabled={authBusy}>
                  {authBusy ? "Please wait…" : authMode === "register" ? "Create account" : "Sign in"}
                </Button>
                {authError && <p className="mt-2 text-xs text-red-400">{authError}</p>}
              </form>
            )}
          </section>

          <section className="rounded-xl border border-border-soft bg-bg-surface/90 p-4">
            <div className="flex items-start gap-3">
              <RotateCcw className="mt-1 h-4 w-4 text-text-muted" />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold">Setup profile</h2>
                <p className="mt-1 text-sm leading-6 text-text-muted">Redo the first-run questions if Afribit should learn a different goal or level.</p>
              </div>
            </div>
            <Button className="mt-4" variant="ghost" size="sm" onClick={onResetSetup}>
              Redo setup
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
