import { randomId } from "../lib/randomId.js";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Plus,
  Settings2,
  Menu,
  Trash2,
  ArrowLeft,
  ArrowUpRight,
  Users,
  WifiOff,
  MessageSquare,
} from "lucide-react";
import { BrandMark } from "./BrandMark.js";
import { ChatScreen } from "./ChatScreen.js";
import { Onboarding } from "./Onboarding.js";
import { Dialog } from "./ui/Dialog.js";
import { I18nProvider, useI18n } from "../lib/i18n.js";
import {
  loadPreferences,
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  type Preferences,
} from "../lib/preferences.js";
import { readStorage, writeStorage } from "../lib/storage.js";
import {
  loadHistory,
  saveHistory,
  upsertConversation,
  type Conversation,
} from "../lib/history.js";
import { API_BASE, deleteConversation, deleteConversations, getSession } from "../lib/api.js";
import { getLearnerIdentity, sameLearnerIdentity, subscribeLearnerIdentity } from "../lib/learnerSession.js";
import { accountConversations, type CommunityAccess } from "../lib/member.js";
import { selectedCommunity } from "../lib/communityScope.js";
import { LearnerAccount } from "./LearnerAccount.js";
import { EducationEntry } from "./EducationEntry.js";
import { PrivacyChip, PrivacyLine } from "./PrivacyLine.js";
import { applyBranding, resolveMode, titleFor, usePack } from "../lib/pack.js";
const SettingsScreen = lazy(() => import("./SettingsScreen.js"));
const ContributorScreen = lazy(() => import("./ContributorScreen.js"));
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
export default function LearningApp() {
  const identity = useSyncExternalStore(subscribeLearnerIdentity, getLearnerIdentity, () => null);
  return <LearningProfile key={identity?.token ?? "guest"} />;
}
function LearningProfile() {
  const identity = getLearnerIdentity();
  const [stored, setPreferences] = useState(() => identity ? { ...DEFAULT_PREFERENCES } : loadPreferences());
  const pack = usePack();
  // A stored mode the pack does not offer (or none yet) follows the pack's default.
  const preferences = useMemo(
    () => ({ ...stored, languageMode: resolveMode(pack, stored.languageMode) }),
    [stored, pack],
  );
  const update = useCallback(
    (next: Partial<Preferences>) =>
      setPreferences((previous) => {
        const result = { ...previous, ...next };
        if (!identity && readStorage('afribit.remember-learning-preferences.v2',true)) writeStorage(PREFERENCES_KEY, result);
        return result;
      }),
    [identity],
  );
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.style.setProperty(
      "--reading-scale",
      preferences.textSize === "large"
        ? "1.18"
        : preferences.textSize === "largest"
          ? "1.35"
          : "1",
    );
  }, [preferences]);
  return (
    <I18nProvider locale={preferences.locale}>
      <EducationEntry key={pack.id??selectedCommunity()??'default'} preferences={preferences} update={update}>{(notebookId,question)=><LearningWorkspace key={`${pack.id ?? selectedCommunity() ?? 'default'}:${notebookId??'bitcoin'}`} notebookId={notebookId} starterQuestion={question} preferences={preferences} update={update} />}</EducationEntry>
    </I18nProvider>
  );
}
function LearningWorkspace({
  notebookId,
  starterQuestion,
  preferences,
  update,
}: {
  notebookId?: string;
  starterQuestion?: string;
  preferences: Preferences;
  update: (next: Partial<Preferences>) => void;
}) {
  const { t, reviewPending } = useI18n();
  const pack = usePack();
  const identity = getLearnerIdentity();
  const identityToken = identity?.token ?? null;
  const scope = identity ? `account:${identity.id}:${API_BASE}:${pack.id ?? selectedCommunity() ?? "default"}`
    : selectedCommunity() || API_BASE ? `guest:${API_BASE}:${selectedCommunity() ?? "default"}` : "guest";
  const historyScope=notebookId?`${scope}:notebook:${notebookId}`:scope;
  const [access, setAccess] = useState<CommunityAccess | null>(null);
  const [path, setPath] = useState(window.location.pathname);
  const view = path.includes("/settings")
    ? "settings"
    : path.includes("/contribute")
      ? "contribute"
      : "chat";
  const [history, setHistory] = useState(() => loadHistory(historyScope));
  useEffect(() => {
    if (!identity) return;
    const controller = new AbortController();
    accountConversations(controller.signal).then((result) => {
      if (!controller.signal.aborted && sameLearnerIdentity(identityToken)) setHistory((previous) =>
        [...previous, ...result.conversations.filter((item) => (item.notebookId??undefined)===notebookId && !previous.some((old) => old.sessionId === item.sessionId))
          .map((item) => ({ ...item, notebookId:item.notebookId??undefined, localId: item.sessionId, messages: [] }))].sort((a,b) => b.updatedAt-a.updatedAt).slice(0,30));
    }).catch(() => { /* Access panel reports membership/connectivity failures; no other identity's cache is used. */ });
    return () => controller.abort();
  }, [identityToken, access?.member,notebookId]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  /** Remove a conversation from this phone (and, when asked, from the server first). F-002. */
  async function removeConversation(target: Conversation, everywhere: boolean) {
    setDeleteError("");
    if (everywhere && target.sessionId) {
      setDeleting(true);
      try {
        await deleteConversation(target.sessionId);
      } catch {
        setDeleting(false);
        setDeleteError(t("history.deleteError"));
        return;
      }
      setDeleting(false);
    }
    const next = history.filter((c) => c.localId !== target.localId);
    setHistory(next);
    if (!sameLearnerIdentity(identityToken)) return;
    saveHistory(next, scope);
    if (selected?.localId === target.localId) newChat();
    setDeleteTarget(null);
  }
  /** Delete every conversation this phone started, on the server and here. Used by Settings. */
  async function removeAllConversations(): Promise<boolean> {
    const ids = history.map((c) => c.sessionId).filter((id): id is string => Boolean(id));
    try {
      await deleteConversations(ids);
    } catch {
      return false;
    }
    setHistory([]);
    if (!sameLearnerIdentity(identityToken)) return false;
    saveHistory([], scope);
    newChat();
    return true;
  }
  const [setup, setSetup] = useState(
    () =>
      !readStorage("afribit.onboarded", false) &&
      !readStorage(PREFERENCES_KEY, null),
  );
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const [sessionDialog, setSessionDialog] = useState(false);
  const [sessionInput, setSessionInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [initialQuestion, setInitialQuestion] = useState(() =>
    starterQuestion ?? new URLSearchParams(window.location.search).get("question"),
  );
  const navigate = (next: string) => {
    window.history.pushState({}, "", next);
    setPath(next);
    setDrawer(false);
  };
  useEffect(() => {
    const change = () => {
      setPath(window.location.pathname);
      setInitialQuestion(
        new URLSearchParams(window.location.search).get("question"),
      );
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const install = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("popstate", change);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", install);
    return () => {
      window.removeEventListener("popstate", change);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", install);
    };
  }, []);
  useEffect(() => {
    document.title = titleFor(
      view === "settings"
        ? t("common.settings")
        : view === "contribute"
          ? t("contribute.submitTab")
          : t("chat.eyebrow"),
      pack.branding,
    );
  }, [view, t, pack.branding]);
  // The pack's accent colour (if it has one) replaces the app's primary colour; without one nothing is set.
  useEffect(() => {
    const root = document.documentElement;
    applyBranding(root, pack.branding);
    return () => applyBranding(root, { ...pack.branding, accentColor: null });
  }, [pack.branding]);
  const commit = useCallback((conversation: Conversation) => {
    if (!sameLearnerIdentity(identityToken)) return;
    setHistory((previous) => {
      const next = upsertConversation(previous, conversation);
      saveHistory(next, historyScope);
      return next;
    });
  }, [identityToken, historyScope]);
  const newChat = () => {
    if (busy) return;
    setSelected(null);
    setChatKey((k) => k + 1);
    setInitialQuestion(null);
    setNote("");
    navigate("/app");
  };
  async function openConversation(conversation: Conversation) {
    if (busy || loading) return;
    setSelected(conversation);
    setChatKey((k) => k + 1);
    setInitialQuestion(null);
    setNote("");
    navigate("/app");
    if (online && conversation.sessionId) {
      setLoading(true);
      try {
        const response = await getSession(conversation.sessionId);
        const refreshed = {
          ...conversation,
          processingPolicy:response.processingPolicy??conversation.processingPolicy,
          messages: response.messages.map((m) => ({ ...m, clientId: m.id })),
        };
        commit(refreshed);
        setSelected(refreshed);
        setChatKey((k) => k + 1);
      } catch {
        setNote(t("history.error"));
      } finally {
        setLoading(false);
      }
    }
  }
  async function resumeSession() {
    if (!sessionInput.trim() || loading || !online) return;
    setLoading(true);
    setNote("");
    try {
      const response = await getSession(sessionInput.trim());
      const conversation: Conversation = {
        localId: randomId(),
        sessionId: response.sessionId,
        processingPolicy:response.processingPolicy,
        title: (
          response.messages.find((m) => m.role === "user")?.content ??
          t("history.new")
        ).slice(0, 80),
        updatedAt: Date.now(),
        messages: response.messages.map((m) => ({ ...m, clientId: m.id })),
      };
      commit(conversation);
      setSelected(conversation);
      setChatKey((k) => k + 1);
      setInitialQuestion(null);
      setSessionDialog(false);
      setSessionInput("");
      navigate("/app");
    } catch {
      setNote(t("history.error"));
    } finally {
      setLoading(false);
    }
  }
  const sidebar = (
    <aside className="sidebar" aria-label={t(identity ? "member.history" : "history.title")}>
      <a href="/" className="sidebar-brand" aria-label={t("nav.home")}>
        <BrandMark
          size="sm"
          brand={pack.branding}
          tagline={Boolean(pack.branding.tagline)}
        />
      </a>
      <button
        className="button button-outline new-chat"
        disabled={busy || loading}
        onClick={newChat}
      >
        <Plus size={17} />
        {t("history.new")}
      </button>
      <div className="history-section">
        <p className="sidebar-label">{t(identity ? "member.history" : "history.title")}</p>
        {history.length === 0 ? (
          <p className="history-empty">{t("history.empty")}</p>
        ) : (
          history.map((c) => (
            <div
              className={`history-row ${selected?.localId === c.localId ? "active" : ""}`}
              key={c.localId}
            >
              <button
                disabled={busy || loading}
                onClick={() => void openConversation(c)}
                title={c.title}
              >
                {c.title}
              </button>
              <button
                className="icon-button"
                disabled={busy}
                onClick={() => setDeleteTarget(c)}
                aria-label={`${t("history.delete")}: ${c.title}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="sidebar-footer">
        <button
          onClick={() => {
            setSessionDialog(true);
            setDrawer(false);
          }}
          disabled={busy || loading}
        >
          <MessageSquare size={16} />
          {t("history.resume")}
        </button>
        <a
          href="/app/contribute"
          onClick={(e) => {
            e.preventDefault();
            navigate("/app/contribute");
          }}
        >
          <Users size={16} />
          {t("community.reviewLink")}
        </a>
        <a
          href="/app/settings"
          onClick={(e) => {
            e.preventDefault();
            navigate("/app/settings");
          }}
        >
          <Settings2 size={16} />
          {t("common.settings")}
        </a>
        <a href="/">
          <ArrowUpRight size={16} />
          {t("nav.home")}
        </a>
        <p className="sidebar-note">{t(identity ? "member.privateHistory" : "history.shared")}</p>
      </div>
    </aside>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#app-content">
        {t("nav.skip")}
      </a>
      <div className="desktop-sidebar">{sidebar}</div>
      <main id="app-content" className="app-main">
        <header className="app-header">
          <div className="app-header-leading">
            <button
              className="icon-button mobile-menu"
              aria-label={t("history.open")}
              onClick={() => setDrawer(true)}
            >
              <Menu size={19} />
            </button>
            <BrandMark size="sm" brand={pack.branding} />
            <span className="header-caption">{t("demo.title")}</span>
            <PrivacyChip onOpen={() => setPrivacyOpen(true)} />
          </div>
          <div className="app-header-actions">
            {view !== "chat" ? (
              <button
                className="button button-ghost"
                onClick={() => navigate("/app")}
              >
                <ArrowLeft size={16} />
                {t("common.back")}
              </button>
            ) : (
              <>
                <button
                  className="icon-button"
                  disabled={busy || loading}
                  aria-label={t("history.new")}
                  onClick={newChat}
                >
                  <Plus size={19} />
                </button>
                <button
                  className="icon-button"
                  aria-label={t("common.settings")}
                  onClick={() => navigate("/app/settings")}
                >
                  <Settings2 size={19} />
                </button>
              </>
            )}
          </div>
        </header>
        {view !== "contribute" && <LearnerAccount onAccess={setAccess} />}
        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={16} />
            {t("chat.offline")}
          </div>
        )}
        {reviewPending && (
          <p className="app-translation-note" role="status">
            {t("common.translationNote")}
          </p>
        )}
        {note && !sessionDialog && (
          <div className="offline-banner" role="status">
            {note}
          </div>
        )}
        <div className="chat-holder" hidden={view !== "chat"}>
          <ChatScreen
            notebookId={notebookId}
            key={chatKey}
            scope={historyScope}
            preferences={preferences}
            update={update}
            conversation={selected}
            commit={commit}
            online={online}
            ready={!setup && !loading && access !== null && (!access.membersOnly || access.member)}
            busyChanged={setBusy}
            initialQuestion={initialQuestion}
            autoSendInitial={!!starterQuestion}
          />
        </div>
        <Suspense
          fallback={
            <p className="loading-note" role="status">
              {t("common.loading")}
            </p>
          }
        >
          {view === "settings" && (
            <SettingsScreen
              preferences={preferences}
              update={update}
              installPrompt={installPrompt}
              installed={() => setInstallPrompt(null)}
              resetSetup={() => {
                setSetup(true);
                navigate("/app");
              }}
              conversationCount={history.length}
              deleteAllConversations={removeAllConversations}
            />
          )}
          {view === "contribute" && <ContributorScreen />}
        </Suspense>
      </main>
      <Dialog
        open={drawer}
        onOpenChange={setDrawer}
        title={t(identity ? "member.history" : "history.title")}
        description={t(identity ? "member.privateHistory" : "history.shared")}
        className="drawer-content"
      >
        {sidebar}
      </Dialog>
      <Dialog
        open={privacyOpen}
        onOpenChange={setPrivacyOpen}
        title={t("privacy.title")}
        description={t("privacy.dialogBody")}
      >
        <PrivacyLine />
        <p>{t("processing.defaultNotice")}</p>
        <a className="text-link" href="/privacy">
          {t("privacy.more")}
          <ArrowUpRight size={16} />
        </a>
        <div className="dialog-footer">
          <button
            className="button button-primary"
            onClick={() => setPrivacyOpen(false)}
          >
            {t("common.close")}
          </button>
        </div>
      </Dialog>
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(value) => {
          if (!value) setDeleteTarget(null);
        }}
        title={t("history.deleteTitle")}
        description={t("history.deleteBody")}
      >
        {deleteError && (
          <p className="status-note" role="alert">
            {deleteError}
          </p>
        )}
        <div className="dialog-footer">
          <button
            className="button button-ghost"
            onClick={() => setDeleteTarget(null)}
          >
            {t("common.cancel")}
          </button>
          <button
            className="button button-ghost"
            disabled={deleting}
            onClick={() => deleteTarget && void removeConversation(deleteTarget, false)}
          >
            {t("history.deleteConfirm")}
          </button>
          <button
            className="button button-primary"
            disabled={deleting || !online}
            onClick={() => deleteTarget && void removeConversation(deleteTarget, true)}
          >
            {t(deleting ? "common.loading" : "history.deleteEverywhere")}
          </button>
        </div>
      </Dialog>
      <Dialog
        open={sessionDialog}
        onOpenChange={(value) => {
          setSessionDialog(value);
          setNote("");
        }}
        title={t("history.resume")}
        description={t("history.shared")}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void resumeSession();
          }}
        >
          <label className="form-field">
            {t("history.sessionId")}
            <input
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              required
              maxLength={100}
            />
          </label>
          <p role="status" className="status-note">
            {note}
          </p>
          <div className="dialog-footer">
            <button
              className="button button-primary"
              disabled={loading || !online}
            >
              {t(loading ? "common.loading" : "history.load")}
            </button>
          </div>
        </form>
      </Dialog>
      <Onboarding
        key={setup ? "setup-open" : "setup-closed"}
        open={setup && view === "chat"}
        preferences={preferences}
        complete={(p) => {
          update(p);
          writeStorage("afribit.onboarded", true);
          setSetup(false);
        }}
      />
    </div>
  );
}
