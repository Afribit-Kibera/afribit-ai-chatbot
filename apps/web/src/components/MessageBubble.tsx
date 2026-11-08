import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Flag,
  BookOpen,
  ChevronDown,
  PenLine,
} from "lucide-react";
import { sendFeedback } from "../lib/api.js";
import { useI18n } from "../lib/i18n.js";
import type { ChatMessageView } from "../lib/history.js";
export type { ChatMessageView } from "../lib/history.js";
export function MessageBubble({
  message,
  report,
  teach,
}: {
  message: ChatMessageView;
  report: (message: ChatMessageView) => void;
  /** F-003: open "say it your way" for this answer. */
  teach?: (message: ChatMessageView) => void;
}) {
  const { t } = useI18n();
  const root = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const isUser = message.role === "user";
  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !root.current
    )
      return;
    const animation = animate(root.current, {
      translateY: [7, 0],
      duration: 240,
      ease: "outQuad",
    });
    return () => {
      animation.revert();
    };
  }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setNote(t("chat.copied"));
    } catch {
      setNote(t("chat.copyFailed"));
    }
  };
  const vote = async (rating: "helpful" | "not_helpful") => {
    if (busy) return;
    setBusy(true);
    setNote("");
    try {
      await sendFeedback(message.id, rating);
      setFeedback(rating);
      setNote(t("chat.feedbackThanks"));
    } catch {
      setNote(t("chat.feedbackError"));
    } finally {
      setBusy(false);
    }
  };
  if (message.safetyFlag)
    return (
      <div ref={root} className="notice" role="status">
        <h2>{t("chat.refusedTitle")}</h2>
        <p>{t("chat.refusedBody")}</p>
        <p>{t("chat.refusedNext")}</p>
      </div>
    );
  return (
    <article
      ref={root}
      className={`message ${isUser ? "user-message" : "assistant-message"}`}
      aria-label={isUser ? t("chat.messageLabel") : "Afribit AI"}
    >
      {!isUser && (
        <img
          className="assistant-avatar"
          src="/brand/afribit-mark-icon.png"
          width="30"
          height="36"
          alt=""
        />
      )}
      <div>
        <div className="message-text">
          {message.content}
          {message.streaming && (
            <span aria-hidden="true" className="stream-cursor" />
          )}
        </div>
        {!isUser && !message.streaming && (
          <>
            {message.incomplete && (
              <p className="status-note">{t("chat.interrupted")}</p>
            )}
            {message.answerSource && message.answerSource!=="model" && <p className="status-note">{t(message.answerSource==="reviewed-card"?"processing.badge.reviewed":message.answerSource==="reviewed-fallback"?"processing.badge.fallback":"processing.badge.unavailable")}</p>}
            {message.answeredBy === "outside" && (
              <p className="status-note answered-outside">
                {t("chat.answeredOutside")}
              </p>
            )}
            {!message.incomplete && (
              <details className="source-disclosure">
                <summary>
                  <BookOpen size={14} />
                  {t("chat.howMade")}
                  <ChevronDown size={13} />
                </summary>
                <p>{t(message.answerSource==="reviewed-card"?"processing.source.reviewed":message.answerSource==="reviewed-fallback"?"processing.source.fallback":message.answerSource==="unavailable"?"processing.source.unavailable":"chat.howMadeBody")}</p>
                {message.conceptTitles?.length ? (
                  <ul>
                    {message.conceptTitles.map((title) => (
                      <li key={title}>{title}</li>
                    ))}
                  </ul>
                ) : null}
                {message.usedFallback && !message.answerSource && <p>{t("chat.fallback")}</p>}
              </details>
            )}
            <div className="message-actions">
              <button
                className="icon-button"
                onClick={() => void copy()}
                aria-label={t(copied ? "chat.copied" : "chat.copy")}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              {!message.incomplete && message.id !== "pending" && (
                <>
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-pressed={feedback === "helpful"}
                    onClick={() => void vote("helpful")}
                    aria-label={t("chat.helpful")}
                  >
                    <ThumbsUp size={16} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-pressed={feedback === "not_helpful"}
                    onClick={() => report(message)}
                    aria-label={t("chat.notHelpful")}
                  >
                    <ThumbsDown size={16} />
                  </button>
                  <button
                    className="report-button"
                    onClick={() => report(message)}
                  >
                    <Flag size={13} />
                    {t("chat.report")}
                  </button>
                  {teach && !message.safetyFlag && (
                    <button
                      className="report-button"
                      onClick={() => teach(message)}
                    >
                      <PenLine size={13} />
                      {t("teach.action")}
                    </button>
                  )}
                </>
              )}
            </div>
            <p className="status-note" role="status">
              {note}
            </p>
          </>
        )}
      </div>
    </article>
  );
}
