import { useState } from "react";
import { ArrowUpRight, Download, Bell, Trash2 } from "lucide-react";
import { Dialog } from "./ui/Dialog.js";
import { PrivacyLine } from "./PrivacyLine.js";
import type { Preferences } from "../lib/preferences.js";
import { useI18n } from "../lib/i18n.js";
import { PreferenceControls } from "./PreferenceControls.js";
import { PoweredBy } from "./PoweredBy.js";
import { usePack } from "../lib/pack.js";
import {
  enablePushNotifications,
  disablePushNotifications,
  getNotificationState,
  getNotifyToken,
  sendPushNotificationTest,
} from "../lib/pwa.js";
import type { InstallPromptEvent } from "./LearningApp.js";
export default function SettingsScreen({
  preferences,
  update,
  installPrompt,
  installed,
  resetSetup,
  conversationCount = 0,
  deleteAllConversations,
}: {
  preferences: Preferences;
  update: (next: Partial<Preferences>) => void;
  installPrompt: InstallPromptEvent | null;
  installed: () => void;
  resetSetup: () => void;
  /** F-002: how many conversations this phone holds, and how to delete them all (server and phone). */
  conversationCount?: number;
  deleteAllConversations?: () => Promise<boolean>;
}) {
  const { t } = useI18n();
  const pack = usePack();
  const [enabled, setEnabled] = useState(() => Boolean(getNotifyToken()));
  const [notificationState, setNotificationState] =
    useState(getNotificationState);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [installNote, setInstallNote] = useState("");
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [dataNote, setDataNote] = useState("");
  async function notifications(action: "enable" | "disable" | "test") {
    setBusy(true);
    setNote("");
    try {
      if (action === "enable") {
        const state = await enablePushNotifications();
        setNotificationState(state);
        setEnabled(state === "enabled");
        setNote(
          t(
            state === "not_configured"
              ? "settings.notifyNotConfigured"
              : state === "denied"
                ? "settings.notifyDenied"
                : state === "unsupported"
                  ? "settings.notifyUnsupported"
                  : state === "enabled"
                    ? "settings.notifyEnabled"
                    : "settings.notifyDisabled",
          ),
        );
      } else if (action === "disable") {
        await disablePushNotifications();
        setEnabled(false);
        setNote(t("settings.notifyDisabled"));
      } else {
        await sendPushNotificationTest();
        setNote(t("settings.notifyTestSent"));
      }
    } catch {
      setNote(t("settings.notifyError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="secondary-scroll">
      <div className="secondary-content">
        <p className="eyebrow">{t("settings.eyebrow")}</p>
        <h1>{t("settings.title")}</h1>
        <p className="secondary-description">{t("settings.description")}</p>
        <section className="settings-section">
          <h2>{t("settings.learning")}</h2>
          <div className="settings-grid">
            <PreferenceControls preferences={preferences} update={update} />
            <label className="field-select">
              <span>{t("common.uiLanguage")}</span>
              <select
                value={preferences.locale}
                onChange={(e) =>
                  update({ locale: e.target.value as Preferences["locale"] })
                }
              >
                <option value="en">English</option>
                <option value="sw">Kiswahili</option>
                <option value="sh">Sheng</option>
              </select>
            </label>
          </div>
        </section>
        <section className="settings-section">
          <h2>{t("settings.appearance")}</h2>
          <div className="settings-grid">
            <label className="field-select">
              <span>{t("settings.theme")}</span>
              <select
                value={preferences.theme}
                onChange={(e) =>
                  update({ theme: e.target.value as Preferences["theme"] })
                }
              >
                <option value="system">{t("settings.system")}</option>
                <option value="dark">{t("settings.dark")}</option>
                <option value="light">{t("settings.light")}</option>
              </select>
            </label>
            <label className="field-select">
              <span>{t("settings.textSize")}</span>
              <select
                value={preferences.textSize}
                onChange={(e) =>
                  update({
                    textSize: e.target.value as Preferences["textSize"],
                  })
                }
              >
                <option value="normal">{t("settings.textNormal")}</option>
                <option value="large">{t("settings.textLarge")}</option>
                <option value="largest">{t("settings.textLargest")}</option>
              </select>
            </label>
          </div>
        </section>
        <section className="settings-section">
          <h2>{t("settings.install")}</h2>
          <p>{t("settings.installBody")}</p>
          {installPrompt ? (
            <button
              className="button button-outline"
              onClick={async () => {
                try {
                  await installPrompt.prompt();
                  await installPrompt.userChoice;
                  installed();
                } catch {
                  setInstallNote(t("settings.installHelp"));
                }
              }}
            >
              <Download size={17} />
              {t("settings.installButton")}
            </button>
          ) : (
            <p>{t("settings.installHelp")}</p>
          )}
          {installNote && <p role="status">{installNote}</p>}
        </section>
        <section className="settings-section">
          <h2>{t("settings.notifications")}</h2>
          <p>{t("settings.notificationsBody")}</p>
          {notificationState === "unsupported" ? (
            <p>{t("settings.notifyUnsupported")}</p>
          ) : notificationState === "denied" ? (
            <p>{t("settings.notifyDenied")}</p>
          ) : (
            <div className="settings-buttons">
              <button
                className="button button-outline"
                disabled={busy}
                onClick={() =>
                  void notifications(enabled ? "disable" : "enable")
                }
              >
                <Bell size={16} />
                {t(
                  enabled ? "settings.notifyDisable" : "settings.notifyEnable",
                )}
              </button>
              {enabled && (
                <button
                  className="button button-ghost"
                  disabled={busy}
                  onClick={() => void notifications("test")}
                >
                  {t("settings.notifyTest")}
                </button>
              )}
            </div>
          )}
          <p className="status-note" role="status">
            {note}
          </p>
        </section>
        <section className="settings-section">
          <h2>{t("settings.data")}</h2>
          <PrivacyLine />
          <p>{t("settings.dataBody")}</p>
          {deleteAllConversations && (
            <div className="settings-links">
              <button
                className="button button-ghost"
                disabled={conversationCount === 0 || deletingAll}
                onClick={() => {
                  setDataNote("");
                  setConfirmDeleteAll(true);
                }}
              >
                <Trash2 size={16} />
                {t("settings.deleteAll")}
              </button>
            </div>
          )}
          <p className="status-note" role="status">
            {dataNote}
          </p>
          <div className="settings-links">
            <a className="text-link" href="/privacy">
              {t("common.privacy")}
              <ArrowUpRight size={15} />
            </a>
            <a
              className="text-link"
              href="mailto:eddie@afribit.africa?subject=Delete%20my%20Afribit%20AI%20data"
            >
              {t("settings.deleteData")}
              <ArrowUpRight size={15} />
            </a>
            <a
              className="text-link"
              href="https://github.com/afribit/afribit-ai"
            >
              {t("common.github")}
              <ArrowUpRight size={15} />
            </a>
            <button className="button button-ghost" onClick={resetSetup}>
              {t("settings.setup")}
            </button>
          </div>
          <p className="quiet">{t("settings.version")}</p>
          <p className="quiet">{t("footer.licences")}</p>
          <PoweredBy brand={pack.branding} className="powered-by-left" />
        </section>
      </div>
      <Dialog
        open={confirmDeleteAll}
        onOpenChange={setConfirmDeleteAll}
        title={t("settings.deleteAllTitle")}
        description={t("settings.deleteAllBody")}
      >
        <div className="dialog-footer">
          <button
            className="button button-ghost"
            onClick={() => setConfirmDeleteAll(false)}
          >
            {t("common.cancel")}
          </button>
          <button
            className="button button-primary"
            disabled={deletingAll}
            onClick={async () => {
              if (!deleteAllConversations) return;
              setDeletingAll(true);
              const done = await deleteAllConversations();
              setDeletingAll(false);
              setConfirmDeleteAll(false);
              setDataNote(t(done ? "settings.deleteAllDone" : "settings.deleteAllError"));
            }}
          >
            {t(deletingAll ? "common.loading" : "settings.deleteAllConfirm")}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
