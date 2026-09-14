import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { sendFeedback } from "../lib/api.js";
import { cn } from "../lib/utils.js";

export interface ChatMessageView {
  /** Stable client-side identity for React's `key` — never reassigned. */
  clientId: string;
  /** Server message id, used for feedback; a placeholder until streaming completes. */
  id: string;
  role: "user" | "assistant";
  content: string;
  usedFallback?: boolean;
  streaming?: boolean;
}

const NEGATIVE_REASONS: { value: string; label: string }[] = [
  { value: "too_complicated", label: "Too complicated" },
  { value: "wrong_information", label: "Wrong information" },
  { value: "sheng_unnatural", label: "Sheng sounds unnatural" },
  { value: "too_formal", label: "Too formal" },
  { value: "too_long", label: "Too long" },
  { value: "did_not_answer", label: "Did not answer my question" },
];

export function MessageBubble({ message }: { message: ChatMessageView }) {
  const [feedbackGiven, setFeedbackGiven] = useState<"helpful" | "not_helpful" | null>(null);
  const [showReasons, setShowReasons] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isUser = message.role === "user";

  useEffect(() => {
    if (!rootRef.current) return;
    animate(rootRef.current, {
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 320,
      ease: "outQuad",
    });
    // Entrance only, on mount — not re-run as streamed content appends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFeedback(rating: "helpful" | "not_helpful", reason?: string) {
    setFeedbackGiven(rating);
    setShowReasons(false);
    try {
      await sendFeedback(message.id, rating, reason);
    } catch {
      // Best-effort — feedback is not critical-path for the chat experience.
    }
  }

  return (
    <div ref={rootRef} className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <img src="/brand/afribit-mark-icon.png" alt="" className="mt-1 h-6 w-6 shrink-0 rounded-full bg-bg-elevated p-0.5" />
      )}
      <div className={cn("flex max-w-[85%] flex-col gap-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
            isUser ? "rounded-br-md bg-bitcoin/15 text-text-base" : "rounded-bl-md bg-bg-elevated text-text-base",
          )}
        >
          <p className="whitespace-pre-wrap">
            {message.content}
            {message.streaming && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse-node bg-bitcoin align-middle" />}
          </p>
          {message.usedFallback && (
            <p className="mt-1.5 text-xs text-text-faint">Answered from saved Afribit knowledge while the AI service was unavailable.</p>
          )}
        </div>

        {message.role === "assistant" && !message.streaming && (
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            {feedbackGiven ? (
              <span className="text-xs text-text-faint">Thanks for the feedback</span>
            ) : (
              <>
                <button
                  className="rounded-full border border-border-strong px-3 py-1 text-xs text-text-muted transition-colors hover:border-panafrican-green hover:text-panafrican-green"
                  onClick={() => handleFeedback("helpful")}
                >
                  Helpful
                </button>
                <button
                  className="rounded-full border border-border-strong px-3 py-1 text-xs text-text-muted transition-colors hover:border-panafrican-red hover:text-panafrican-red"
                  onClick={() => setShowReasons((s) => !s)}
                >
                  Not helpful
                </button>
              </>
            )}
            {showReasons && (
              <div className="flex w-full flex-wrap gap-1.5">
                {NEGATIVE_REASONS.map((r) => (
                  <button
                    key={r.value}
                    className="rounded-full border border-border-soft bg-bg-surface px-2.5 py-1 text-xs text-text-soft hover:border-border-strong"
                    onClick={() => handleFeedback("not_helpful", r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
