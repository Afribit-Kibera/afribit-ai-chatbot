import { useEffect, useState } from "react";
import { ArrowLeft, Bell, BellOff, Check, Download, Languages, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { ExplanationLevel, LanguageMode } from "@afribit/shared";
import { BrandMark } from "./BrandMark.js";
import { Button } from "./ui/button.js";
import { cn } from "../lib/utils.js";
import { disablePushNotifications, enablePushNotifications, getNotificationState, sendPushNotificationTest, type NotificationState } from "../lib/pwa.js";

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
