import { readStorage, writeStorage } from "./storage.js";
import { onLearnerIdentityChange } from "./learnerSession.js";
import type { AnswerSource,ProcessingPolicy } from "@afribit/shared";
export interface ChatMessageView {
  answerSource?: AnswerSource;
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
  notebookId?: string;
  processingPolicy?: ProcessingPolicy;
  localId: string;
  sessionId: string | null;
  title: string;
  updatedAt: number;
  messages: ChatMessageView[];
}
export const HISTORY_KEY = "afribit.conversations.v1";
const accountHistory = new Map<string, Conversation[]>();
const accountDrafts = new Map<string, string>();
onLearnerIdentityChange(() => { accountHistory.clear(); accountDrafts.clear(); });
export function loadHistory(scope?: string): Conversation[] {
  const raw = scope?.startsWith("account:") ? accountHistory.get(scope) ?? [] : readStorage<unknown>(scope && scope !== "guest" ? `${HISTORY_KEY}:${scope}` : HISTORY_KEY, []);
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
export function saveHistory(history: Conversation[], scope?: string) {
  const safe = history.slice(0, 30).map((c) => ({
      ...c,
      messages: c.messages
        .filter((m) => !m.safetyFlag)
        .slice(-100)
        .map((m) => ({ ...m, streaming: false })),
    }));
  if (scope?.startsWith("account:")) accountHistory.set(scope, safe);
  else writeStorage(scope && scope !== "guest" ? `${HISTORY_KEY}:${scope}` : HISTORY_KEY, safe);
}

export function loadDraft(scope: string): string {
  const draft = scope.startsWith("account:") ? accountDrafts.get(scope) ?? "" : readStorage<unknown>(scope === "guest" ? "afribit.draft" : `afribit.draft:${scope}`, "");
  return typeof draft === "string" ? draft.slice(0,6000) : "";
}
export function saveDraft(scope: string, draft: string) {
  if (scope.startsWith("account:")) { if (draft) accountDrafts.set(scope,draft); else accountDrafts.delete(scope); }
  else writeStorage(scope === "guest" ? "afribit.draft" : `afribit.draft:${scope}`, draft || null);
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
