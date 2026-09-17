import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { Check, ShieldCheck, X } from "lucide-react";
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

export function MessageBubble({ message }: { message: ChatMessageView }) {
  const [feedbackGiven, setFeedbackGiven] = useState<"helpful" | "not_helpful" | null>(null);
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
    try {
      await sendFeedback(message.id, rating, reason);
    } catch {
      // Best-effort — feedback is not critical-path for the chat experience.
    }
  }

  return (
    <div ref={rootRef} className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <img src="/brand/afribit-mark-icon.png" alt="" className="mt-1 h-7 w-7 shrink-0 rounded-full bg-bg-elevated p-0.5" />
      )}
      <div className={cn("flex max-w-[86%] flex-col gap-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-lg shadow-black/10",
            isUser
              ? "rounded-br-md bg-bitcoin text-bg-base"
              : "rounded-bl-md border border-border-soft bg-bg-elevated/95 text-text-base",
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
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-panafrican-green/30 px-2.5 py-1 text-xs text-panafrican-green">
              <ShieldCheck className="h-3.5 w-3.5" />
              No hype
            </span>
            {feedbackGiven ? (
              <span className="text-xs text-text-faint">Thanks for the feedback</span>
            ) : (
              <>
                <button
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border-soft text-text-muted transition-colors hover:border-panafrican-green hover:text-panafrican-green"
                  onClick={() => handleFeedback("helpful")}
                  aria-label="Mark response as helpful"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border-soft text-text-muted transition-colors hover:border-panafrican-red hover:text-panafrican-red"
                  onClick={() => handleFeedback("not_helpful", "quick_negative")}
                  aria-label="Mark response as not helpful"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
