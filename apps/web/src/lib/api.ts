import type { ExplanationLevel, LanguageMode } from "@afribit/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export interface SendMessageResponse {
  sessionId: string;
  messageId: string;
  content: string;
  languageMode: LanguageMode;
  explanationLevel: ExplanationLevel;
  retrievalConfidence: number | null;
  usedFallback: boolean;
  safetyFlag: string | null;
}

export async function sendChatMessage(params: {
  sessionId: string | null;
  message: string;
  languageMode: LanguageMode;
  explanationLevel: ExplanationLevel;
}): Promise<SendMessageResponse> {
  const response = await fetch(`${API_BASE}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }
  return response.json();
}

export type ChatStreamEvent =
  | { type: "meta"; sessionId: string; safetyFlag: string | null }
  | { type: "delta"; text: string }
  | { type: "done"; messageId: string; usedFallback: boolean }
  | { type: "error"; message: string };

/**
 * Consumes the NDJSON stream from POST /api/v1/chat/stream (PRD §27.2).
 * Not EventSource/SSE — this is a POST body, so we read the fetch response
 * as a stream and split on newlines ourselves. `onEvent` fires once per
 * line; the promise resolves once the server closes the stream.
 */
export async function streamChatMessage(
  params: { sessionId: string | null; message: string; languageMode: LanguageMode; explanationLevel: ExplanationLevel },
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Chat stream request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line) as ChatStreamEvent);
    }
  }
  if (buffer.trim()) {
    onEvent(JSON.parse(buffer) as ChatStreamEvent);
  }
}

export async function sendFeedback(messageId: string, rating: "helpful" | "not_helpful", reason?: string): Promise<void> {
  await fetch(`${API_BASE}/api/v1/messages/${messageId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, reason }),
  });
}
