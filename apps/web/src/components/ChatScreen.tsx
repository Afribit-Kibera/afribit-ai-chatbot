import { randomId } from "../lib/randomId.js";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  Square,
  ShieldCheck,
  BookOpen,
  Zap,
  Smartphone,
  Paperclip,
  ClipboardPaste,
} from "lucide-react";
import type { Preferences } from "../lib/preferences.js";
import { ApiError, streamChatMessage } from "../lib/api.js";
import { getNotifyToken } from "../lib/pwa.js";
import { getLearnerIdentity, sameLearnerIdentity } from "../lib/learnerSession.js";
import { proposedStarters } from "../lib/starters.js";
import { useI18n } from "../lib/i18n.js";
import { startersFor, usePack } from "../lib/pack.js";
import { PoweredBy } from "./PoweredBy.js";
import { loadDraft, saveDraft, recentTurns, type ChatMessageView, type Conversation } from "../lib/history.js";
import { PrivacyLine } from "./PrivacyLine.js";
import { MessageBubble } from "./MessageBubble.js";
import { ThinkingIndicator } from "./ThinkingIndicator.js";
import { PreferenceControls } from "./PreferenceControls.js";
import { FeedbackDialog } from "./FeedbackDialog.js";
import { TeachDialog } from "./TeachDialog.js";
import type { ProcessingPolicy,AnswerMode } from "@afribit/shared";
import { VoiceInput } from './VoiceInput.js';
import { questionFits, questionBytes } from '../lib/composer.js';
const SECRET_FLAGS = new Set([
  "seed_phrase",
  "private_key",
  "pin_or_otp",
  "password",
]);
export function ChatScreen({
  notebookId,
  scope,
  preferences,
  update,
  conversation,
  commit,
  online,
  ready,
  busyChanged,
  initialQuestion,
  autoSendInitial = false,
}: {
  notebookId?: string;
  scope: string;
  preferences: Preferences;
  update: (next: Partial<Preferences>) => void;
  conversation: Conversation | null;
  commit: (c: Conversation) => void;
  online: boolean;
  ready: boolean;
  busyChanged: (busy: boolean) => void;
  initialQuestion: string | null;
  autoSendInitial?: boolean;
}) {
  const identityToken = getLearnerIdentity()?.token ?? null;
  const { t } = useI18n();
  const pack = usePack();
  // The pack's starter questions for the active mode; the built-in ones remain the fallback.
  const packStarters = notebookId ? null : startersFor(pack, preferences.languageMode);
  // The built-in starter questions and the "someone asked for my seed phrase" shortcut are about Bitcoin:
  // another community's pack must not inherit them.
  const isBitcoin = !notebookId && pack.domainId === "bitcoin";
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
  const reminder = notebookId ? 'AI can make mistakes. Check the supporting source text.' : pack.disclaimers.length
    ? pack.disclaimers.join(" ")
    : t("chat.reminder");
  const [messages, setMessages] = useState<ChatMessageView[]>(
    conversation?.messages ?? [],
  );
  const [sessionId, setSessionId] = useState(conversation?.sessionId ?? null);
  const [processingPolicy,setProcessingPolicy]=useState<ProcessingPolicy>(notebookId || preferences.remoteProcessingAllowed===false ? 'local-only' : conversation?.processingPolicy??"configured");
  const [localLocked,setLocalLocked]=useState(!!notebookId || conversation?.processingPolicy==="local-only");
  const [answerMode,setAnswerMode]=useState<AnswerMode>("generate");
  const [draft, setDraft] = useState(() => loadDraft(scope));
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [retryText, setRetryText] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [report, setReport] = useState<ChatMessageView | null>(null);
  const [teach, setTeach] = useState<ChatMessageView | null>(null);
  const localId = useRef(conversation?.localId ?? randomId());
  const scroll = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const attachment=useRef<HTMLInputElement>(null);
  const [toolNote,setToolNote]=useState('');
  function appendText(text:string){setDraft(previous=>{const next=previous?previous+'\n'+text:text;if(!questionFits(next)){setToolNote('That text is too long for one question. Add it as a notebook source instead (6,000 characters / 8,000 UTF-8 bytes per question).');return previous;}setToolNote('Text added. Review it before sending.');return next;});textarea.current?.focus();}
  const stickToBottom = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);
  const initialHandled = useRef(false);
  const frame = useRef(0);
  useEffect(() => {
    if (sameLearnerIdentity(identityToken)) saveDraft(scope, draft);
  }, [draft, scope, identityToken]);
  useEffect(
    () => () => {
      controller.current?.abort();
      cancelAnimationFrame(frame.current);
    },
    [],
  );
  useEffect(() => {
    if (!scroll.current) return;
    if (messages.length === 0 && !thinking && !error) {
      scroll.current.scrollTop = 0;
      return;
    }
    if (stickToBottom.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages, thinking, error]);
  useEffect(() => {
    if (initialQuestion && !initialHandled.current && ready) {
      initialHandled.current = true;
      if(autoSendInitial)void sendText(initialQuestion);
      else setDraft(initialQuestion.slice(0, 6000));
      textarea.current?.focus();
    }
  }, [initialQuestion, ready, autoSendInitial]);
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
    if(!questionFits(trimmed)){setError('Your question exceeds 6,000 characters or 8,000 UTF-8 bytes. Put longer material in a source notebook.');return;}
    sendingRef.current = true;
    setSending(true);
    busyChanged(true);
    setThinking(true);
    setError("");
    setAnnouncement("");
    setRetryText("");
    setDraft("");
    saveDraft(scope, "");
    stickToBottom.current = true;
    const userId = randomId();
    const answerId = randomId();
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
    let nextPolicy:ProcessingPolicy=localLocked||processingPolicy==="local-only"||answerMode==="reviewed-only"?"local-only":"configured";
    if(nextPolicy==="local-only"){setLocalLocked(true);setProcessingPolicy("local-only");}
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
          notebookId,
          processingPolicy:nextPolicy,
          answerMode,
          message: trimmed,
          languageMode: preferences.languageMode,
          explanationLevel: preferences.explanationLevel,
          notifyToken,
          history: recentTurns(messages),
        },
        (event) => {
          if (event.type === "meta") {
            if(event.processingPolicy==="local-only"){nextPolicy="local-only";setLocalLocked(true);setProcessingPolicy("local-only");}
            nextSession = event.sessionId;
            setSessionId(nextSession);
            if (SECRET_FLAGS.has(event.safetyFlag ?? "")) {
              refused = true;
              answer.safetyFlag = event.safetyFlag;
              answer.streaming = false;
              current = messages;
              setDraft("");
              if (sameLearnerIdentity(identityToken)) saveDraft(scope, "");
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
            answer.answerSource = event.answerSource;
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
          notebookId,
          localId: localId.current,
          sessionId: nextSession,
          processingPolicy:nextPolicy,
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
      <details className="processing-controls">
        <summary>{t("processing.options")}</summary>
        <label className="form-field">{t("processing.location")}<select value={processingPolicy} disabled={sending||localLocked||preferences.remoteProcessingAllowed===false} onChange={(e)=>setProcessingPolicy(e.target.value as ProcessingPolicy)}>
          <option value="configured">{t("processing.configured")}</option><option value="local-only">{t("processing.local")}</option>
        </select></label>
        <label className="form-field">{t("processing.answer")}<select value={answerMode} disabled={sending} onChange={(e)=>setAnswerMode(e.target.value as AnswerMode)}>
          <option value="generate">{t("processing.generate")}</option><option value="reviewed-only">{t("processing.reviewed")}</option>
        </select></label>
        <p>{t("processing.explanation")}</p>
        {(localLocked||answerMode==="reviewed-only")&&<p role="status">{t("processing.locked")}</p>}
      </details>
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
              <h1>{notebookId ? 'What would you like to understand?' : pack.branding.welcomeTitle ?? t("chat.title")}</h1>
              <p className="empty-description">
                {notebookId ? 'Ask about your sources, request a simpler explanation, or ask to study one idea at a time.' : pack.branding.welcomeText ?? t("chat.description")}
              </p>
              <PrivacyLine localOnly={localLocked||processingPolicy==="local-only"||answerMode==="reviewed-only"} />
              <div className="starters">
                {mainStarters.map(({ key, text, Icon }) => (
                  <button
                    key={key}
                    className="starter"
                    disabled={sending || !online || !ready}
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
                      disabled={sending || !online || !ready}
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
                  disabled={!online || sending || !ready}
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
        {isBitcoin && <button className="safety-shortcut" disabled={sending||!online||!ready} onClick={()=>void sendText(t("safety.question"))}><ShieldCheck size={16}/>{t("safety.action")}<ArrowRight size={14}/></button>}
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
            onPaste={(e)=>{const inserted=e.clipboardData.getData('text');const el=e.currentTarget;const next=draft.slice(0,el.selectionStart)+inserted+draft.slice(el.selectionEnd);if(!questionFits(next)){e.preventDefault();setToolNote('This paste is too large for one question. Add the material to a source notebook instead.');}}}
            placeholder={notebookId ? 'Ask about your sources…' : pack.branding.composerPlaceholder ?? t("chat.composer")}
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
              disabled={!draft.trim() || !questionFits(draft) || !online || !ready}
              aria-label={t("chat.send")}
            >
              <ArrowUp size={19} />
            </button>
          )}
        </form>
        <div className="composer-tools">
          <input ref={attachment} className="sr-only" type="file" accept=".txt,.md,text/plain,text/markdown" aria-label="Attach plain text to question" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>24000){setToolNote('This file is too large for a question. Import it as a source instead.');return;}const text=await file.text();if(sameLearnerIdentity(identityToken))appendText(text);}}/>
          <button type="button" className="icon-button" aria-label="Add text file" disabled={sending||!ready} onClick={()=>attachment.current?.click()}><Paperclip size={18}/></button>
          <button type="button" className="icon-button" aria-label="Paste text" disabled={sending||!ready} onClick={()=>void navigator.clipboard?.readText().then(appendText).catch(()=>setToolNote('Clipboard access was denied. Paste into the question box using your keyboard.'))}><ClipboardPaste size={18}/></button>
          <VoiceInput disabled={sending||!ready} localOnly={localLocked||processingPolicy==='local-only'||answerMode==='reviewed-only'} language={preferences.languageMode} onTranscript={appendText}/>
          {(draft.length>=4800||questionBytes(draft)>=6400)&&<span className="composer-count" aria-label="Question size">{draft.length.toLocaleString()}/6,000 · {questionBytes(draft).toLocaleString()}/8,000 bytes</span>}
        </div>
        {toolNote&&<p className="composer-tool-note" role="status">{toolNote}</p>}
        <p className="chat-reminder">{reminder}</p>
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
