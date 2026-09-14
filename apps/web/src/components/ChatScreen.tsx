import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import type { ExplanationLevel, LanguageMode } from "@afribit/shared";
import { streamChatMessage } from "../lib/api.js";
import { MessageBubble, type ChatMessageView } from "./MessageBubble.js";
import { ThinkingIndicator } from "./ThinkingIndicator.js";
import { BrandMark } from "./BrandMark.js";
import { Button } from "./ui/button.js";

interface ChatScreenProps {
  languageMode: LanguageMode;
  explanationLevel: ExplanationLevel;
  onChangeLanguageMode: (mode: LanguageMode) => void;
}

const LANGUAGE_LABELS: Record<LanguageMode, string> = {
  simple_en: "Simple English",
  swahili: "Kiswahili",
  sheng: "Sheng",
  mixed_ke: "Mix naturally",
};

function newClientId(): string {
  return `c${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatScreen({ languageMode, explanationLevel, onChangeLanguageMode }: ChatScreenProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [awaitingFirstToken, setAwaitingFirstToken] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, awaitingFirstToken]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;

    const userMessage: ChatMessageView = { clientId: newClientId(), id: `local-${Date.now()}`, role: "user", content: text };
    const assistantClientId = newClientId();
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setSending(true);
    setAwaitingFirstToken(true);

    let assistantAdded = false;

    try {
      await streamChatMessage({ sessionId, message: text, languageMode, explanationLevel }, (event) => {
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
          content: "Sorry, I couldn't reach the server. Please check your connection and try again.",
        },
      ]);
    } finally {
      setSending(false);
      setAwaitingFirstToken(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      <header className="flex items-center justify-between border-b border-border-soft px-4 py-3">
        <BrandMark size="sm" />
        <select
          className="rounded-lg border border-border-strong bg-bg-surface px-2.5 py-1.5 text-xs text-text-soft"
          value={languageMode}
          onChange={(e) => onChangeLanguageMode(e.target.value as LanguageMode)}
        >
          {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.length === 0 && (
          <p className="mt-8 px-4 text-center text-sm text-text-muted">
            Uliza swali lolote la Bitcoin — ask any Bitcoin question to get started.
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.clientId} message={m} />
        ))}
        {awaitingFirstToken && <ThinkingIndicator />}
      </div>

      <div className="flex items-end gap-2 border-t border-border-soft p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Andika swali lako..."
          rows={1}
          className="max-h-24 flex-1 resize-none rounded-xl border border-border-strong bg-bg-surface px-3.5 py-2.5 text-[15px] text-text-base placeholder:text-text-faint focus:border-bitcoin focus:outline-none"
        />
        <Button size="icon" onClick={handleSend} disabled={sending || !draft.trim()} aria-label="Send message">
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
