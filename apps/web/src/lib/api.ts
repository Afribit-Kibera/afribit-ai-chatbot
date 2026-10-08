import type { LanguageModeId, ExplanationLevel } from "@afribit/shared";
import { getSource } from "./source.js";
export const API_BASE = import.meta.env.VITE_API_URL ?? "";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new ApiError(
      response.status,
      body.error ?? `Request failed (${response.status})`,
    );
  }
  return response.json() as Promise<T>;
}
export interface ChatParams {
  sessionId: string | null;
  message: string;
  languageMode: LanguageModeId;
  explanationLevel: ExplanationLevel;
  notifyToken?: string;
  /** Channel label from the learner's link (?ref=). Filled in from this browser when not given. */
  source?: string;
  /** F-002: recent turns (lib/history.ts recentTurns); used by a server that keeps no chats. */
  history?: { role: "user" | "assistant"; content: string }[];
}
/** The request body: the saved channel label rides along so the API can note where a conversation started. */
function chatBody(params: ChatParams): string {
  return JSON.stringify({ ...params, source: params.source ?? getSource() ?? undefined });
}
export interface SendMessageResponse {
  sessionId: string;
  messageId: string;
  content: string;
  languageMode: LanguageModeId;
  explanationLevel: ExplanationLevel;
  retrievalConfidence: number | null;
  usedFallback: boolean;
  safetyFlag: string | null;
  conceptTitles?: string[];
  answeredBy?: "local" | "outside";
}
export type ChatStreamEvent =
  | {
      type: "meta";
      sessionId: string | null;
      safetyFlag: string | null;
      conceptTitles?: string[];
    }
  | { type: "delta"; text: string }
  | {
      type: "done";
      messageId: string;
      usedFallback: boolean;
      answeredBy?: "local" | "outside";
    }
  | { type: "error"; message: string };
export function parseStreamEvent(line: string): ChatStreamEvent {
  const e = JSON.parse(line) as Record<string, unknown>;
  if (
    e.type === "meta" &&
    (typeof e.sessionId === "string" || e.sessionId === null) &&
    (typeof e.safetyFlag === "string" || e.safetyFlag === null)
  )
    return e as ChatStreamEvent;
  if (e.type === "delta" && typeof e.text === "string")
    return e as ChatStreamEvent;
  if (
    e.type === "done" &&
    typeof e.messageId === "string" &&
    typeof e.usedFallback === "boolean"
  )
    return {
      type: "done",
      messageId: e.messageId,
      usedFallback: e.usedFallback,
      answeredBy:
        e.answeredBy === "outside" || e.answeredBy === "local"
          ? e.answeredBy
          : undefined,
    };
  if (e.type === "error" && typeof e.message === "string")
    return e as ChatStreamEvent;
  throw new Error("The reply stream contained an unreadable event.");
}
export async function consumeChatStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  const emit = (line: string) => {
    if (!line.trim()) return;
    const event = parseStreamEvent(line);
    onEvent(event);
    if (event.type === "error") throw new Error(event.message);
    if (event.type === "done") completed = true;
  };
  try {
    while (!completed) {
      const { done, value } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!completed) emit(line);
      }
      if (done) {
        if (buffer.trim() && !completed) emit(buffer);
        break;
      }
      if (buffer.length > 1_000_000)
        throw new Error("The reply stream exceeded its size limit.");
    }
    if (!completed)
      throw new Error("The connection ended before the answer was finished.");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export async function sendChatMessage(
  params: ChatParams,
  signal?: AbortSignal,
): Promise<SendMessageResponse> {
  return readResponse(
    await fetch(`${API_BASE}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: chatBody(params),
      signal,
    }),
  );
}
export async function streamChatMessage(
  params: ChatParams,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: chatBody(params),
    signal,
  });
  // Unsupported endpoints only: never silently repeat a partial request or 429.
  if ([404, 405, 501].includes(response.status)) {
    const result = await sendChatMessage(params, signal);
    onEvent({
      type: "meta",
      sessionId: result.sessionId,
      safetyFlag: result.safetyFlag,
      conceptTitles: result.conceptTitles,
    });
    onEvent({ type: "delta", text: result.content });
    onEvent({
      type: "done",
      messageId: result.messageId,
      usedFallback: result.usedFallback,
      answeredBy: result.answeredBy,
    });
    return;
  }
  if (!response.ok) await readResponse(response);
  if (!response.body)
    throw new Error("The reply stream is unavailable. Please try again.");
  await consumeChatStream(response.body, onEvent);
}
export interface SessionResponse {
  sessionId: string;
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
  }[];
}
export async function getSession(
  sessionId: string,
  signal?: AbortSignal,
): Promise<SessionResponse> {
  return readResponse(
    await fetch(`${API_BASE}/api/v1/chat/${encodeURIComponent(sessionId)}`, {
      signal,
    }),
  );
}
export async function sendFeedback(
  messageId: string,
  rating: "helpful" | "not_helpful",
  reason?: string,
  comment?: string,
  /** F-002: the question and answer, only when the learner chose to share them with the reviewers. */
  shared?: { questionText: string; answerText: string },
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/v1/messages/${encodeURIComponent(messageId)}/feedback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, reason, comment, ...shared }),
    },
  );
  if (!response.ok) await readResponse(response);
}
/** F-002: delete one conversation from the server (holding its id is the permission). */
export async function deleteConversation(sessionId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/v1/chat/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) await readResponse(response);
}
/** F-002: delete every conversation this phone started, 50 at a time (the API's limit). */
export async function deleteConversations(sessionIds: string[]): Promise<void> {
  for (let i = 0; i < sessionIds.length; i += 50) {
    const response = await fetch(`${API_BASE}/api/v1/chat/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionIds: sessionIds.slice(i, i + 50) }),
    });
    if (!response.ok) await readResponse(response);
  }
}
/** F-002: delete the signed-in account; contributions are kept without the name, or deleted. */
export async function deleteMyAccount(
  token: string,
  contributions: "keep" | "delete",
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/me`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ contributions }),
  });
  if (!response.ok) await readResponse(response);
}
export async function getVapidPublicKey(): Promise<{
  enabled: boolean;
  publicKey: string | null;
}> {
  return readResponse(
    await fetch(`${API_BASE}/api/v1/notifications/vapid-public-key`),
  );
}
export async function savePushSubscription(params: {
  installationId: string;
  subscription: PushSubscriptionJSON;
}): Promise<{ notifyToken: string | null }> {
  return readResponse(
    await fetch(`${API_BASE}/api/v1/notifications/subscription`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-afribit-user-id": params.installationId,
      },
      body: JSON.stringify(params),
    }),
  );
}
export async function deletePushSubscription(endpoint: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/v1/notifications/subscription`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    },
  );
  if (!response.ok) await readResponse(response);
}
export async function sendTestNotification(notifyToken: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/notifications/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notifyToken }),
  });
  if (!response.ok) await readResponse(response);
}
/** F-003: a member's "say it your way" suggestion. Nothing changes for anyone until a reviewer approves it. */
export interface SuggestionParams {
  sessionId: string | null;
  messageId: string | null;
  /** The member's own question: sent only when they leave "include my question" ticked. */
  questionText?: string;
  /** The assistant's answer being rewritten (the AI's words, not the member's). */
  answerText: string;
  suggestion: string;
  languageMode: LanguageModeId;
  reason?: "too_formal" | "wrong_words" | "wrong_facts" | "other";
  consent: { answers: boolean; testing: boolean; training: boolean };
}
export async function sendSuggestion(params: SuggestionParams): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/teach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  await readResponse(response);
}
