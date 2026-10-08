import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  Square,
  ShieldCheck,
  BookOpen,
  Zap,
  Smartphone,
} from "lucide-react";
import type { Preferences } from "../lib/preferences.js";
import { ApiError, streamChatMessage } from "../lib/api.js";
import { getNotifyToken } from "../lib/pwa.js";
import { readStorage, writeStorage } from "../lib/storage.js";
import { proposedStarters } from "../lib/starters.js";
import { useI18n } from "../lib/i18n.js";
import { startersFor, usePack } from "../lib/pack.js";
import { PoweredBy } from "./PoweredBy.js";
import { recentTurns, type ChatMessageView, type Conversation } from "../lib/history.js";
import { PrivacyLine } from "./PrivacyLine.js";
import { MessageBubble } from "./MessageBubble.js";
import { ThinkingIndicator } from "./ThinkingIndicator.js";
import { PreferenceControls } from "./PreferenceControls.js";
import { FeedbackDialog } from "./FeedbackDialog.js";
import { TeachDialog } from "./TeachDialog.js";
const DRAFT_KEY = "afribit.draft";
const SECRET_FLAGS = new Set([
  "seed_phrase",
  "private_key",
  "pin_or_otp",
  "password",
]);
export function ChatScreen({
  preferences,
  update,
  conversation,
  commit,
  online,
  ready,
  busyChanged,
  initialQuestion,
}: {
  preferences: Preferences;
  update: (next: Partial<Preferences>) => void;
  conversation: Conversation | null;
  commit: (c: Conversation) => void;
  online: boolean;
  ready: boolean;
  busyChanged: (busy: boolean) => void;
  initialQuestion: string | null;
}) {
  const { t } = useI18n();
  const pack = usePack();
  // The pack's starter questions for the active mode; the built-in ones remain the fallback.
  const packStarters = startersFor(pack, preferences.languageMode);
  // The built-in starter questions and the "someone asked for my seed phrase" shortcut are about Bitcoin:
  // another community's pack must not inherit them.
  const isBitcoin = pack.domainId === "bitcoin";
  const starterIcons = [BookOpen, Zap, Smartphone] as const;
  const mainStarters = packStarters
    ? packStarters.questions.slice(0, 3).map((q, i) => ({
        key: q,
        text: q,
        Icon: starterIcons[i]!,
      }))
    : !isBitcoin
      ? []
      : (
          [
            { key: "chat.starter1", Icon: BookOpen },
            { key: "chat.starter2", Icon: Zap },
            { key: "chat.starter3", Icon: Smartphone },
          ] as const
        ).map(({ key, Icon }) => ({ key, text: t(key), Icon }));
  const moreStarters = packStarters
    ? packStarters.questions.slice(3)
    : isBitcoin
      ? proposedStarters
      : [];
  const reminder = pack.disclaimers.length
    ? pack.disclaimers.join(" ")
    : t("chat.reminder");
  const [messages, setMessages] = useState<ChatMessageView[]>(
    conversation?.messages ?? [],
  );
  const [sessionId, setSessionId] = useState(conversation?.sessionId ?? null);
  const [draft, setDraft] = useState(() => {
    const stored = readStorage<unknown>(DRAFT_KEY, "");
    return typeof stored === "string" ? stored.slice(0, 6000) : "";
  });
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [retryText, setRetryText] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [report, setReport] = useState<ChatMessageView | null>(null);
  const [teach, setTeach] = useState<ChatMessageView | null>(null);
  const localId = useRef(conversation?.localId ?? crypto.randomUUID());
  const scroll = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);
  const initialHandled = useRef(false);
  const frame = useRef(0);
  useEffect(() => {
    writeStorage(DRAFT_KEY, draft || null);
  }, [draft]);
  useEffect(
    () => () => {
      controller.current?.abort();
      cancelAnimationFrame(frame.current);
    },
    [],
  );
  useEffect(() => {
    if (stickToBottom.current && scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages, thinking, error]);
  useEffect(() => {
    if (initialQuestion && !initialHandled.current && ready) {
      initialHandled.current = true;
      setDraft(initialQuestion.slice(0, 6000));
      textarea.current?.focus();
    }
  }, [initialQuestion, ready]);
  const resize = () => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 135)}px`;
  };
  useEffect(resize, [draft]);
  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sendingRef.current || !online || !ready) return;
    sendingRef.current = true;
    setSending(true);
    busyChanged(true);
    setThinking(true);
    setError("");
    setAnnouncement("");
    setRetryText("");
    setDraft("");
    writeStorage(DRAFT_KEY, null);
    stickToBottom.current = true;
    const userId = crypto.randomUUID();
    const answerId = crypto.randomUUID();
    const user: ChatMessageView = {
      clientId: userId,
      id: `local-${userId}`,
      role: "user",
      content: trimmed,
    };
    const answer: ChatMessageView = {
      clientId: answerId,
      id: "pending",
      role: "assistant",
      content: "",
      streaming: true,
    };
    let current = [...messages, user];
    setMessages(current);
    let nextSession = sessionId;
    let content = "";
    let refused = false;
    let completed = false;
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort("timeout"), 120_000);
    const flush = () => {
      frame.current = 0;
      setMessages([...current]);
    };
    const schedule = () => {
      if (!frame.current) frame.current = requestAnimationFrame(flush);
    };
    try {
      const notifyToken =
        document.visibilityState !== "visible"
          ? (getNotifyToken() ?? undefined)
          : undefined;
      await streamChatMessage(
        {
          sessionId,
          message: trimmed,
          languageMode: preferences.languageMode,
          explanationLevel: preferences.explanationLevel,
          notifyToken,
          history: recentTurns(messages),
        },
        (event) => {
          if (event.type === "meta") {
            nextSession = event.sessionId;
            setSessionId(nextSession);
            if (SECRET_FLAGS.has(event.safetyFlag ?? "")) {
              refused = true;
              answer.safetyFlag = event.safetyFlag;
              answer.streaming = false;
              current = messages;
              setDraft("");
              writeStorage(DRAFT_KEY, null);
            }
            if (event.conceptTitles) answer.conceptTitles = event.conceptTitles;
          } else if (event.type === "delta") {
            setThinking(false);
            content += event.text;
            answer.content = content;
            current = [
              ...current.filter((m) => m.clientId !== answerId),
              { ...answer },
            ];
            schedule();
          } else if (event.type === "done") {
            completed = true;
            answer.id = event.messageId;
            answer.usedFallback = event.usedFallback;
            answer.answeredBy = event.answeredBy;
            answer.streaming = false;
            if (!answer.content && !refused) throw new Error("Empty answer");
            current = [
              ...current.filter((m) => m.clientId !== answerId),
              { ...answer },
            ];
            cancelAnimationFrame(frame.current);
            flush();
            setAnnouncement(
              t(refused ? "chat.refusedTitle" : "chat.answerReady"),
            );
          }
        },
        abort.signal,
      );
    } catch (e) {
      answer.streaming = false;
      answer.incomplete = true;
      if (content)
        current = [
          ...current.filter((m) => m.clientId !== answerId),
          { ...answer },
        ];
      else if (!refused) {
        current = current.filter((m) => m.clientId !== userId);
        setDraft(trimmed);
        setRetryText(trimmed);
      }
      cancelAnimationFrame(frame.current);
      flush();
      setError(
        e instanceof ApiError && e.status === 429
          ? t("chat.rateLimit")
          : abort.signal.aborted && abort.signal.reason !== "timeout"
            ? t("chat.stopped")
            : t("chat.error"),
      );
    } finally {
      window.clearTimeout(timeout);
      setThinking(false);
      setSending(false);
      sendingRef.current = false;
      busyChanged(false);
      controller.current = null;
      // No refused content is kept locally. Commit only finished or visibly partial answers.
      const persisted = current.filter((m) => !m.safetyFlag);
      if (persisted.length && (completed || content))
        commit({
          localId: localId.current,
          sessionId: nextSession,
          title: (
            conversation?.title ??
            persisted.find((m) => m.role === "user")?.content ??
            t("history.new")
          ).slice(0, 80),
          updatedAt: Date.now(),
          messages: persisted,
        });
    }
  }
  const reportIndex = messages.findIndex(
    (m) => m.clientId === report?.clientId,
  );
  const reportQuestion =
    messages
      .slice(0, reportIndex)
      .reverse()
      .find((m) => m.role === "user")?.content ?? "";
  const teachIndex = messages.findIndex((m) => m.clientId === teach?.clientId);
  const teachQuestion =
    messages
      .slice(0, teachIndex)
      .reverse()
      .find((m) => m.role === "user")?.content ?? "";
  return (
    <section className="chat-surface" aria-label={t("chat.label")}>
      <div className="preference-bar">
        <PreferenceControls preferences={preferences} update={update} />
      </div>
      <div
        ref={scroll}
        className="message-scroll"
        onScroll={() => {
          const el = scroll.current;
          if (el)
            stickToBottom.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        }}
      >
        <div className="chat-content">
          {messages.length === 0 && (
            <div className="empty-state">
              {!pack.branding.logoUrl && (
                <img
                  className="empty-mark"
                  src="/brand/afribit-mark-icon.png"
                  width="38"
                  height="45"
                  alt=""
                />
              )}
              <p className="eyebrow">{t("chat.eyebrow")}</p>
              <h1>{pack.branding.welcomeTitle ?? t("chat.title")}</h1>
              <p className="empty-description">
                {pack.branding.welcomeText ?? t("chat.description")}
              </p>
              <PrivacyLine />
              {mainStarters.length > 0 && (
                <p className="starter-label">{t("chat.starterLabel")}</p>
              )}
              <div className="starters">
                {mainStarters.map(({ key, text, Icon }) => (
                  <button
                    key={key}
                    className="starter"
                    disabled={sending || !online}
                    onClick={() => void sendText(text)}
                  >
                    <Icon size={20} strokeWidth={1.5} />
                    <span>{text}</span>
                  </button>
                ))}
              </div>
              {moreStarters.length > 0 && (
                <details className="more-starters">
                  <summary>{t("chat.moreQuestions")}</summary>
                  {(!packStarters || !packStarters.reviewed) && (
                    <p>{t("chat.reviewPending")}</p>
                  )}
                  {moreStarters.map((q) => (
                    <button
                      disabled={sending || !online}
                      key={q}
                      onClick={() => void sendText(q)}
                    >
                      {q}
                    </button>
                  ))}
                </details>
              )}
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble
              key={message.clientId}
              message={message}
              report={setReport}
              teach={setTeach}
            />
          ))}
          {thinking && <ThinkingIndicator />}
          {error && (
            <div className="notice" role="alert">
              <p>{error}</p>
              {retryText && (
                <button
                  className="text-link"
                  disabled={!online || sending}
                  onClick={() => void sendText(retryText)}
                >
                  {t("common.retry")}
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="composer-area">
        {isBitcoin && (
          <button
            className="safety-shortcut"
            disabled={sending || !online}
            onClick={() => void sendText(t("safety.question"))}
          >
            <ShieldCheck size={16} />
            {t("safety.action")}
            <ArrowRight size={14} />
          </button>
        )}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            void sendText(draft);
          }}
        >
          <label className="sr-only" htmlFor="chat-question">
            {t("chat.messageLabel")}
          </label>
          <textarea
            id="chat-question"
            ref={textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={pack.branding.composerPlaceholder ?? t("chat.composer")}
            maxLength={6000}
            rows={1}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                window.matchMedia("(pointer: fine)").matches
              ) {
                e.preventDefault();
                void sendText(draft);
              }
            }}
          />
          {sending ? (
            <button
              type="button"
              className="button button-primary icon-button"
              aria-label={t("chat.stop")}
              onClick={() => controller.current?.abort()}
            >
              <Square size={15} />
            </button>
          ) : (
            <button
              className="button button-primary icon-button"
              disabled={!draft.trim() || !online || !ready}
              aria-label={t("chat.send")}
            >
              <ArrowUp size={19} />
            </button>
          )}
        </form>
        <p className="chat-reminder">{reminder}</p>
        <p className="composer-hint">{t("chat.hint")}</p>
        <PoweredBy brand={pack.branding} />
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      {report && (
        <FeedbackDialog
          key={report.clientId}
          message={report}
          question={reportQuestion}
          close={() => setReport(null)}
        />
      )}
      {teach && (
        <TeachDialog
          key={teach.clientId}
          message={teach}
          question={teachQuestion}
          sessionId={sessionId}
          languageMode={preferences.languageMode}
          close={() => setTeach(null)}
        />
      )}
    </section>
  );
}
