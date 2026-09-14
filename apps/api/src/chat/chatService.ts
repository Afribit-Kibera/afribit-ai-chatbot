import { randomUUID } from "node:crypto";
import type { AfribitChatMessage, ExplanationLevel, LanguageMode } from "@afribit/shared";
import { pool } from "../db/pool.js";
import { retrieveKnowledge } from "../knowledge/retrieval.js";
import { buildPrompt } from "../prompt/promptBuilder.js";
import { detectSecret, SECRET_WARNING_MESSAGE } from "../safety/secretDetector.js";
import { GatewayError } from "../gateway/gateway.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";

export interface SendMessageInput {
  sessionId: string | null;
  userId: string | null;
  message: string;
  languageMode?: LanguageMode;
  explanationLevel?: ExplanationLevel;
}

export interface SendMessageOutput {
  sessionId: string;
  messageId: string;
  content: string;
  languageMode: LanguageMode;
  explanationLevel: ExplanationLevel;
  retrievalConfidence: number | null;
  usedFallback: boolean;
  safetyFlag: string | null;
}

const DEFAULT_LANGUAGE: LanguageMode = "mixed_ke";
const DEFAULT_LEVEL: ExplanationLevel = "normal";

async function ensureSession(
  sessionId: string | null,
  userId: string | null,
  languageMode: LanguageMode,
  explanationLevel: ExplanationLevel,
): Promise<string> {
  if (sessionId) {
    const { rows } = await pool.query("SELECT id FROM chat_sessions WHERE id = $1", [sessionId]);
    if (rows.length > 0) return sessionId;
  }
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO chat_sessions (user_id, language_mode, explanation_level) VALUES ($1, $2, $3) RETURNING id`,
    [userId, languageMode, explanationLevel],
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("Failed to create chat session");
  return id;
}

async function loadHistory(sessionId: string, limit = 8) {
  const { rows } = await pool.query<{ role: "user" | "assistant"; content: string }>(
    `SELECT role, content FROM chat_messages
     WHERE session_id = $1 AND role IN ('user', 'assistant')
     ORDER BY created_at DESC LIMIT $2`,
    [sessionId, limit],
  );
  return rows.reverse();
}

async function insertMessage(params: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  retrievalConfidence?: number | null;
  modelProfile?: string | null;
  provider?: string | null;
  latencyMs?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  safetyFlag?: string | null;
}): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO chat_messages
      (session_id, role, content, retrieval_confidence, model_profile, provider, latency_ms, prompt_tokens, completion_tokens, safety_flag)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      params.sessionId,
      params.role,
      params.content,
      params.retrievalConfidence ?? null,
      params.modelProfile ?? null,
      params.provider ?? null,
      params.latencyMs ?? null,
      params.promptTokens ?? null,
      params.completionTokens ?? null,
      params.safetyFlag ?? null,
    ],
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("Failed to insert message");
  return id;
}

interface BlockedContext {
  kind: "blocked";
  response: SendMessageOutput;
}

interface ProceedContext {
  kind: "proceed";
  sessionId: string;
  languageMode: LanguageMode;
  explanationLevel: ExplanationLevel;
  promptMessages: AfribitChatMessage[];
  modelProfile: string;
  requestId: string;
  topConfidence: number | null;
  fallbackContent: string;
}

/**
 * Shared setup for both the single-shot and streaming chat paths: session
 * resolution, secret detection (short-circuits to `blocked`), retrieval,
 * and prompt assembly (PRD §9.2 steps 1-6). Callers differ only in how they
 * invoke the gateway and persist the result.
 */
async function prepareChat(input: SendMessageInput): Promise<BlockedContext | ProceedContext> {
  const languageMode = input.languageMode ?? DEFAULT_LANGUAGE;
  const explanationLevel = input.explanationLevel ?? DEFAULT_LEVEL;
  const sessionId = await ensureSession(input.sessionId, input.userId, languageMode, explanationLevel);

  const secretCheck = detectSecret(input.message);
  if (secretCheck.detected) {
    await pool.query(`INSERT INTO safety_events (session_id, kind, details) VALUES ($1, $2, $3)`, [
      sessionId,
      `${secretCheck.kind}_detected`,
      JSON.stringify({ length: input.message.length }),
    ]);
    await insertMessage({ sessionId, role: "user", content: secretCheck.redacted, safetyFlag: secretCheck.kind });
    const messageId = await insertMessage({ sessionId, role: "assistant", content: SECRET_WARNING_MESSAGE });
    return {
      kind: "blocked",
      response: {
        sessionId,
        messageId,
        content: SECRET_WARNING_MESSAGE,
        languageMode,
        explanationLevel,
        retrievalConfidence: null,
        usedFallback: false,
        safetyFlag: secretCheck.kind,
      },
    };
  }

  await insertMessage({ sessionId, role: "user", content: input.message });

  const retrieval = await retrieveKnowledge(input.message);
  const history = await loadHistory(sessionId);
  const promptMessages = buildPrompt({
    languageMode,
    explanationLevel,
    retrieval,
    conversationHistory: history.slice(0, -1), // exclude the message just inserted
    userMessage: input.message,
  });

  return {
    kind: "proceed",
    sessionId,
    languageMode,
    explanationLevel,
    promptMessages,
    modelProfile: explanationLevel === "deep" ? "deep_dive" : "default_chat",
    requestId: randomUUID(),
    topConfidence: retrieval[0]?.confidence ?? null,
    fallbackContent:
      retrieval[0]?.authoritativeContent ??
      "I'm having trouble reaching the AI service right now, and I don't have a saved answer for this question. Please try again shortly.",
  };
}

/**
 * PRD §9.2 / §16 / §17.3 end to end: safety check → retrieval → prompt
 * assembly → gateway → non-AI fallback on provider failure → persistence.
 */
export async function sendMessage(gateway: AfribitAIGateway, input: SendMessageInput): Promise<SendMessageOutput> {
  const ctx = await prepareChat(input);
  if (ctx.kind === "blocked") return ctx.response;

  const { sessionId, languageMode, explanationLevel, promptMessages, modelProfile, requestId, topConfidence, fallbackContent } = ctx;

  try {
    const response = await gateway.chat({
      requestId,
      messages: promptMessages,
      languageMode,
      explanationLevel,
      modelProfile,
      maxOutputTokens: 500,
      temperature: 0.3,
      privacyProfile: "strict",
    });

    const messageId = await insertMessage({
      sessionId,
      role: "assistant",
      content: response.content,
      retrievalConfidence: topConfidence,
      modelProfile,
      provider: response.provider,
      latencyMs: response.latencyMs,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
    });

    await pool.query(
      `INSERT INTO model_runs (request_id, message_id, profile, provider, model, latency_ms, prompt_tokens, completion_tokens, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ok')`,
      [requestId, messageId, modelProfile, response.provider, response.model, response.latencyMs, response.usage.promptTokens, response.usage.completionTokens],
    );

    return {
      sessionId,
      messageId,
      content: response.content,
      languageMode,
      explanationLevel,
      retrievalConfidence: topConfidence,
      usedFallback: false,
      safetyFlag: null,
    };
  } catch (err) {
    // PRD §17.3 — provider failure: fall back to a canonical knowledge-card
    // answer when retrieval found one, rather than silently failing.
    await pool.query(
      `INSERT INTO model_runs (request_id, profile, status, error_message) VALUES ($1, $2, 'error', $3)`,
      [requestId, modelProfile, err instanceof Error ? err.message : String(err)],
    );

    const messageId = await insertMessage({
      sessionId,
      role: "assistant",
      content: fallbackContent,
      retrievalConfidence: topConfidence,
      safetyFlag: err instanceof GatewayError ? "provider_failure" : "unknown_error",
    });

    return {
      sessionId,
      messageId,
      content: fallbackContent,
      languageMode,
      explanationLevel,
      retrievalConfidence: topConfidence,
      usedFallback: true,
      safetyFlag: null,
    };
  }
}

export type StreamEvent =
  | { type: "meta"; sessionId: string; safetyFlag: string | null }
  | { type: "delta"; text: string }
  | { type: "done"; messageId: string; usedFallback: boolean }
  | { type: "error"; message: string };

/**
 * Streaming counterpart to `sendMessage` (PRD §27.2). Shares the same
 * safety/retrieval/prompt setup via `prepareChat`; forwards text deltas to
 * `onEvent` as they arrive and persists the assembled message the same way
 * `sendMessage` would once the stream ends.
 */
export async function streamMessage(
  gateway: AfribitAIGateway,
  input: SendMessageInput,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const ctx = await prepareChat(input);

  if (ctx.kind === "blocked") {
    onEvent({ type: "meta", sessionId: ctx.response.sessionId, safetyFlag: ctx.response.safetyFlag });
    onEvent({ type: "delta", text: ctx.response.content });
    onEvent({ type: "done", messageId: ctx.response.messageId, usedFallback: false });
    return;
  }

  const { sessionId, languageMode, explanationLevel, promptMessages, modelProfile, requestId, topConfidence, fallbackContent } = ctx;
  onEvent({ type: "meta", sessionId, safetyFlag: null });

  let content = "";
  try {
    const generator = gateway.chatStream({
      requestId,
      messages: promptMessages,
      languageMode,
      explanationLevel,
      modelProfile,
      maxOutputTokens: 500,
      temperature: 0.3,
      privacyProfile: "strict",
    });

    let response = await generator.next();
    while (!response.done) {
      content += response.value;
      onEvent({ type: "delta", text: response.value });
      response = await generator.next();
    }
    const finalResponse = response.value;

    const messageId = await insertMessage({
      sessionId,
      role: "assistant",
      content,
      retrievalConfidence: topConfidence,
      modelProfile,
      provider: finalResponse.provider,
      latencyMs: finalResponse.latencyMs,
      promptTokens: finalResponse.usage.promptTokens,
      completionTokens: finalResponse.usage.completionTokens,
    });

    await pool.query(
      `INSERT INTO model_runs (request_id, message_id, profile, provider, model, latency_ms, prompt_tokens, completion_tokens, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ok')`,
      [requestId, messageId, modelProfile, finalResponse.provider, finalResponse.model, finalResponse.latencyMs, finalResponse.usage.promptTokens, finalResponse.usage.completionTokens],
    );

    onEvent({ type: "done", messageId, usedFallback: false });
  } catch (err) {
    await pool.query(
      `INSERT INTO model_runs (request_id, profile, status, error_message) VALUES ($1, $2, 'error', $3)`,
      [requestId, modelProfile, err instanceof Error ? err.message : String(err)],
    );

    if (content.length > 0) {
      // Streaming had already started when it broke — don't silently swap in
      // the canonical answer under a half-written response; end the turn.
      const messageId = await insertMessage({
        sessionId,
        role: "assistant",
        content,
        retrievalConfidence: topConfidence,
        safetyFlag: "stream_interrupted",
      });
      onEvent({ type: "error", message: "The response was interrupted. Please try again." });
      onEvent({ type: "done", messageId, usedFallback: false });
      return;
    }

    const messageId = await insertMessage({
      sessionId,
      role: "assistant",
      content: fallbackContent,
      retrievalConfidence: topConfidence,
      safetyFlag: err instanceof GatewayError ? "provider_failure" : "unknown_error",
    });
    onEvent({ type: "delta", text: fallbackContent });
    onEvent({ type: "done", messageId, usedFallback: true });
  }
}
