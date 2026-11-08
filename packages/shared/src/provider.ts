import type { ExplanationLevel, LanguageModeId } from "./language.js";

export type ProcessingPolicy = "configured" | "local-only";
export type AnswerMode = "generate" | "reviewed-only";
export type AnswerSource = "model" | "reviewed-card" | "reviewed-fallback" | "unavailable";

/**
 * PRD §16.3 — the provider interface. Nothing outside the Afribit AI Gateway
 * should need to know which concrete provider (OpenRouter, future local
 * model, future hybrid) is active. Never import a concrete provider outside
 * gateway/ — that coupling is exactly what this interface exists to prevent.
 */
export interface AfribitChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Requests a strict structured JSON response from the model instead of
 * free-form text (Dataset Architecture doc §14 — "do not ask the API for
 * free-form blobs that then need fragile parsing"). Optional: the chatbot's
 * normal chat/chatStream calls never set this.
 */
export interface AfribitResponseFormat {
  name: string;
  schema: Record<string, unknown>;
}

export interface AfribitChatRequest {
  /** Internal cancellation only; API bodies never supply it. Concrete providers check the platform signal. */
  signal?: unknown;
  requestId: string;
  messages: AfribitChatMessage[];
  languageMode: LanguageModeId;
  explanationLevel: ExplanationLevel;
  modelProfile: string;
  maxOutputTokens: number;
  temperature: number;
  /** PRD §17.2 — enforced by the gateway, not left to the caller. */
  privacyProfile: "strict" | "standard";
  responseFormat?: AfribitResponseFormat;
  /** Must remain on the community box on every attempt, including fallback. */
  contextPrivacy?: "personal-local-only";
}

export interface AfribitChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AfribitChatResponse {
  requestId: string;
  content: string;
  provider: string;
  model: string;
  usage: AfribitChatUsage;
  latencyMs: number;
  finishReason: "stop" | "length" | "error";
  /** Estimated cost in USD, when the provider reports it. */
  estimatedCostUsd: number | null;
}

export interface ProviderHealth {
  healthy: boolean;
  message?: string;
  checkedAt: string;
}

export interface ProviderCapabilities {
  streaming: boolean;
  maxContextTokens: number;
  supportsJsonMode: boolean;
  /** Whether this provider can enforce zero-data-retention. PRD §17.2. */
  zdrSupported: boolean;
}

export interface InferenceProvider {
  readonly name: string;
  chat(request: AfribitChatRequest): Promise<AfribitChatResponse>;
  /**
   * PRD §27.2 — stream responses where network conditions allow. Yields text
   * deltas as they arrive and returns the same shape `chat()` would, once
   * the stream completes, so callers can persist a normal AfribitChatResponse
   * either way. Implementations that can't stream should throw rather than
   * fake it — the gateway falls back to `chat()` when `capabilities().streaming`
   * is false.
   */
  chatStream(request: AfribitChatRequest): AsyncGenerator<string, AfribitChatResponse, void>;
  health(): Promise<ProviderHealth>;
  capabilities(): ProviderCapabilities;
}

/**
 * PRD §16.4 — model configuration is data, not code. A profile is looked up
 * by name (e.g. "default_chat") and resolved to a concrete provider + model.
 */
export interface ModelProfile {
  profile: string;
  provider: string;
  model: string;
  fallbackProfile: string | null;
  maxOutputTokens: number;
  temperature: number;
  privacyProfile: "strict" | "standard";
  /**
   * Maximum duration of an attempt, including the whole stream. The gateway aborts its transport.
   * Defaults to the gateway's 15s, which suits hosted APIs. A community node
   * on modest hardware needs minutes -- it must read a multi-thousand-token
   * prompt before it can emit anything -- so node profiles set this higher.
   */
  timeoutMs?: number;
}
