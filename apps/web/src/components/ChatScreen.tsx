import { useEffect, useRef, useState } from "react";
import { Plus, SendHorizontal, Settings2 } from "lucide-react";
import type { ExplanationLevel, LanguageMode } from "@afribit/shared";
import { streamChatMessage } from "../lib/api.js";
import { MessageBubble, type ChatMessageView } from "./MessageBubble.js";
import { ThinkingIndicator } from "./ThinkingIndicator.js";
import { BrandMark } from "./BrandMark.js";
import { Button } from "./ui/button.js";
import type { OnboardingProfile } from "./Onboarding.js";
import { getInstallationId } from "../lib/pwa.js";

interface ChatScreenProps {
  languageMode: LanguageMode;
  explanationLevel: ExplanationLevel;
  profile: OnboardingProfile;
  onUpdatePreferences: (next: Partial<{ languageMode: LanguageMode; explanationLevel: ExplanationLevel }>) => void;
  onOpenSettings: () => void;
}

const LANGUAGE_HINTS: Record<LanguageMode, string> = {
  simple_en: "Simple English",
  swahili: "Kiswahili only",
  sheng: "Strict Sheng",
  mixed_ke: "Sheng + English",
};

const GOAL_PROMPTS: Record<OnboardingProfile["goal"], string> = {
  understand: "Explain Bitcoin like niko beginner",
  avoid_scams: "How do I spot a Bitcoin scam?",
  send_save: "How can I send or save Bitcoin safely?",
};

const LANGUAGE_ACKS: Record<LanguageMode, string> = {
  mixed_ke: "Sawa, nitarudi kwa Sheng + English mix. Ukiwant nibadilishe tena, niambie tu.",
  sheng: "Sawa, tunaenda strict Sheng. Nitaweka explanation simple na local.",
  swahili: "Sawa, nitatumia Kiswahili only. Ukiwant nibadilishe tena, niambie tu.",
  simple_en: "Sawa, I will use simple English. Short sentences, no heavy jargon.",
};

function newClientId(): string {
  return `c${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

function detectLanguageModeRequest(text: string): LanguageMode | null {
  const normalized = text.toLowerCase();
  const asksForVoiceChange = /\b(ongea|speak|talk|jibu|respond|use|tumia|switch|change|badili|badilisha|kwa|in)\b/.test(normalized);
  if (!asksForVoiceChange) return null;

  if (/\b(kiswahili|swahili)\b/.test(normalized)) return "swahili";
  if (/\b(simple english|plain english|english only|only english)\b/.test(normalized)) return "simple_en";
  if (/\b(strict sheng|sheng tupu|pure sheng|sheng only)\b/.test(normalized)) return "sheng";
  if (/\b(sheng)\b/.test(normalized) && !/\b(english|kiswahili|swahili)\b/.test(normalized)) return "sheng";
  if (/\b(mix|mixed|code[- ]?switch|sheng na english|sheng and english)\b/.test(normalized)) return "mixed_ke";

  return null;
}

export function ChatScreen({ languageMode, explanationLevel, profile, onUpdatePreferences, onOpenSettings }: ChatScreenProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [awaitingFirstToken, setAwaitingFirstToken] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestedPrompt = GOAL_PROMPTS[profile.goal];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, awaitingFirstToken]);

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessageView = { clientId: newClientId(), id: `local-${Date.now()}`, role: "user", content: trimmed };
    const assistantClientId = newClientId();
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");

    const requestedLanguageMode = detectLanguageModeRequest(trimmed);
    if (requestedLanguageMode) {
      onUpdatePreferences({ languageMode: requestedLanguageMode });
      setMessages((prev) => [
        ...prev,
        {
          clientId: assistantClientId,
          id: `settings-${Date.now()}`,
          role: "assistant",
          content: LANGUAGE_ACKS[requestedLanguageMode],
        },
      ]);
      return;
    }

    setSending(true);
    setAwaitingFirstToken(true);

    let assistantAdded = false;

    try {
      const notifyInstallationId =
        "Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible"
          ? getInstallationId()
          : undefined;

      await streamChatMessage({ sessionId, message: trimmed, languageMode, explanationLevel, notifyInstallationId }, (event) => {
        if (event.type === "meta") {
          setSessionId(event.sessionId);
        } else if (event.type === "delta") {
          setAwaitingFirstToken(false);
          if (!assistantAdded) {
            assistantAdded = true;
            setMessages((prev) => [
              ...prev,
              { clientId: assistantClientId, id: "pending", role: "assistant", content: event.text, streaming: true },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.clientId === assistantClientId ? { ...m, content: m.content + event.text } : m)),
            );
          }
        } else if (event.type === "done") {
          setMessages((prev) =>
            prev.map((m) => (m.clientId === assistantClientId ? { ...m, id: event.messageId, streaming: false, usedFallback: event.usedFallback } : m)),
          );
        } else if (event.type === "error") {
          setMessages((prev) =>
            prev.map((m) => (m.clientId === assistantClientId ? { ...m, streaming: false } : m)),
          );
        }
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          clientId: newClientId(),
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Connection imekwama kidogo. Check internet yako, then try again.",
        },
      ]);
    } finally {
      setSending(false);
      setAwaitingFirstToken(false);
    }
  }

  function handleSend() {
    void sendText(draft);
  }

  function startNewChat() {
    setSessionId(null);
    setMessages([]);
    setDraft("");
  }

  return (
    <div className="relative h-full overflow-hidden bg-bg-base">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-5%,rgba(247,147,26,0.18),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(244,245,240,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(244,245,240,0.02)_1px,transparent_1px)] bg-[size:34px_34px] opacity-45" />

      <div className="relative mx-auto flex h-full max-w-2xl flex-col">
        <header className="flex items-center justify-between px-4 py-4">
          <BrandMark size="sm" className="items-start" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startNewChat}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-soft bg-bg-surface/70 text-text-muted transition-colors hover:border-border-strong hover:text-text-base"
              aria-label="Start new chat"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-soft bg-bg-surface/70 text-text-muted transition-colors hover:border-border-strong hover:text-text-base"
              aria-label="Settings"
              title={`Current voice: ${LANGUAGE_HINTS[languageMode]}`}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-4 pb-5 pt-3">
          {messages.length === 0 && (
            <section className="flex min-h-full flex-col justify-center py-6">
              <div className="max-w-[88%] rounded-xl border border-border-soft bg-bg-surface/90 px-5 py-4 shadow-xl shadow-black/20">
                <p className="text-[15px] leading-7 text-text-base">
                  Karibu. Nitaongea kwa <span className="text-bitcoin-light">{LANGUAGE_HINTS[languageMode]}</span>. Ukiwant nibadilishe style later, niambie tu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void sendText(suggestedPrompt)}
                className="mt-4 w-fit rounded-full border border-border-accent bg-bg-surface/80 px-4 py-2 text-left text-sm text-bitcoin-light transition-colors hover:border-bitcoin"
              >
                {suggestedPrompt}
              </button>
            </section>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.clientId} message={m} />
          ))}
          {awaitingFirstToken && <ThinkingIndicator />}
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-end gap-2 rounded-2xl border border-border-strong bg-bg-surface/95 p-2 shadow-2xl shadow-black/30">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Andika swali lako"
              rows={1}
              className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] leading-6 text-text-base placeholder:text-text-faint focus:outline-none"
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !draft.trim()} aria-label="Send message" className="rounded-xl">
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
