import { readStorage, writeStorage } from "./storage.js";
export interface ChatMessageView {
  clientId: string;
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  usedFallback?: boolean;
  safetyFlag?: string | null;
  incomplete?: boolean;
  conceptTitles?: string[];
  /** F-001: "outside" when a hosted AI service wrote this answer (hybrid or cloud). */
  answeredBy?: "local" | "outside";
}
export interface Conversation {
  localId: string;
  sessionId: string | null;
  title: string;
  updatedAt: number;
  messages: ChatMessageView[];
}
export const HISTORY_KEY = "afribit.conversations.v1";
export function loadHistory(): Conversation[] {
  const raw = readStorage<unknown>(HISTORY_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is Conversation =>
        item &&
        typeof item.localId === "string" &&
        typeof item.title === "string" &&
        typeof item.updatedAt === "number" &&
        Number.isFinite(item.updatedAt) &&
        (typeof item.sessionId === "string" || item.sessionId === null) &&
        Array.isArray(item.messages) &&
        item.messages.every(
          (m: ChatMessageView | null) =>
            m &&
            typeof m.content === "string" &&
            ["user", "assistant"].includes(m.role) &&
            typeof m.id === "string" &&
            typeof m.clientId === "string",
        ),
    )
    .slice(0, 30);
}
export function saveHistory(history: Conversation[]) {
  writeStorage(
    HISTORY_KEY,
    history.slice(0, 30).map((c) => ({
      ...c,
      messages: c.messages
        .filter((m) => !m.safetyFlag)
        .slice(-100)
        .map((m) => ({ ...m, streaming: false })),
    })),
  );
}
export function upsertConversation(
  history: Conversation[],
  conversation: Conversation,
): Conversation[] {
  return [
    conversation,
    ...history.filter((c) => c.localId !== conversation.localId),
  ]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 30);
}

/**
 * The recent turns sent with each message (F-002). A server that keeps no chats uses them so a follow-up
 * question still makes sense. Refused (secret) and unfinished messages are never sent; limits match the API.
 */
export const MAX_HISTORY_TURNS = 8;
export const MAX_TURN_CHARS = 2000;
export function recentTurns(
  messages: ChatMessageView[],
): { role: "user" | "assistant"; content: string }[] {
  return messages
    .filter((m) => !m.safetyFlag && !m.streaming && !m.incomplete && m.content.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_TURN_CHARS) }));
}
