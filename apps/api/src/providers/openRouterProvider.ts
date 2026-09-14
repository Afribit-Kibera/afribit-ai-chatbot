import type {
  AfribitChatRequest,
  AfribitChatResponse,
  InferenceProvider,
  ProviderCapabilities,
  ProviderHealth,
} from "@afribit/shared";
import { getModelProfile } from "../config/modelProfiles.js";
import { env } from "../config/env.js";

interface OpenRouterChoice {
  message: { content: string };
  finish_reason: string;
}

interface OpenRouterResponse {
  model: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    /** Present when the request sets `usage: { include: true }`. */
    cost?: number;
  };
}

interface OpenRouterStreamChunk {
  model?: string;
  choices?: { delta?: { content?: string }; finish_reason?: string | null }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
}

function buildRequestBody(request: AfribitChatRequest, model: string, stream: boolean) {
  return {
    model,
    messages: request.messages,
    max_tokens: request.maxOutputTokens,
    temperature: request.temperature,
    stream,
    // Ask OpenRouter to report actual billed cost so callers (esp. Dataset
    // Lab campaigns) can track real cost-per-example rather than estimating
    // from list pricing, which provider routing can deviate from.
    usage: { include: true },
    ...(stream ? { stream_options: { include_usage: true } } : {}),
    // PRD §17.2 — enforce zero-data-retention / no third-party training
    // wherever the caller's privacy profile requires it.
    provider:
      request.privacyProfile === "strict" && env.openRouterZdrOnly
        ? { zdr: true, data_collection: "deny" }
        : undefined,
    // Dataset Architecture doc §14 — structured JSON output instead of a
    // free-form blob needing fragile parsing. Only set by Dataset Lab
    // callers; the chatbot's chat()/chatStream() calls never pass this.
    response_format: request.responseFormat
      ? {
          type: "json_schema",
          json_schema: {
            name: request.responseFormat.name,
            strict: true,
            schema: request.responseFormat.schema,
          },
        }
      : undefined,
  };
}

/**
 * PRD §16.3 / §17 — the Phase 1 InferenceProvider implementation. This is the
 * ONLY module in the codebase that should know about OpenRouter's API shape.
 * The Gateway (see gateway/gateway.ts) is the only caller.
 */
export class OpenRouterProvider implements InferenceProvider {
  readonly name = "openrouter";

  async chat(request: AfribitChatRequest): Promise<AfribitChatResponse> {
    const profile = getModelProfile(request.modelProfile);
    const startedAt = Date.now();

    if (!env.openRouterApiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const body = buildRequestBody(request, profile.model, false);

    const response = await fetch(`${env.openRouterBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://afribit.africa",
        "X-Title": "Afribit AI",
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `OpenRouter request failed (${response.status}): ${errorText.slice(0, 500)}`,
      );
    }

    const data = (await response.json()) as OpenRouterResponse & { error?: { message?: string } };
    const choice = data.choices?.[0];
    if (!choice) {
      // A 200 response with no choices usually means an error/moderation
      // shape came back instead of a completion (e.g. `{ error: {...} }`) —
      // surface whatever we got rather than crashing on `.choices[0]`.
      throw new Error(`OpenRouter returned no choices: ${data.error?.message ?? JSON.stringify(data).slice(0, 300)}`);
    }

    return {
      requestId: request.requestId,
      content: choice.message.content,
      provider: this.name,
      model: data.model ?? profile.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      latencyMs,
      finishReason: choice.finish_reason === "length" ? "length" : "stop",
      estimatedCostUsd: data.usage?.cost ?? null,
    };
  }

  async *chatStream(request: AfribitChatRequest): AsyncGenerator<string, AfribitChatResponse, void> {
    const profile = getModelProfile(request.modelProfile);
    const startedAt = Date.now();

    if (!env.openRouterApiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const response = await fetch(`${env.openRouterBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://afribit.africa",
        "X-Title": "Afribit AI",
      },
      body: JSON.stringify(buildRequestBody(request, profile.model, true)),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `OpenRouter stream request failed (${response.status}): ${errorText.slice(0, 500)}`,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let finishReason: "stop" | "length" | "error" = "stop";
    let model = profile.model;
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;

          let chunk: OpenRouterStreamChunk;
          try {
            chunk = JSON.parse(payload) as OpenRouterStreamChunk;
          } catch {
            continue; // malformed/partial SSE line — skip rather than crash the stream
          }

          model = chunk.model ?? model;
          const choice = chunk.choices?.[0];
          const delta = choice?.delta?.content;
          if (delta) {
            content += delta;
            yield delta;
          }
          if (choice?.finish_reason === "length") finishReason = "length";
          if (chunk.usage) {
            usage = {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens,
            };
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      requestId: request.requestId,
      content,
      provider: this.name,
      model,
      usage,
      latencyMs: Date.now() - startedAt,
      finishReason,
      estimatedCostUsd: null,
    };
  }

  async health(): Promise<ProviderHealth> {
    if (!env.openRouterApiKey) {
      return {
        healthy: false,
        message: "OPENROUTER_API_KEY not configured",
        checkedAt: new Date().toISOString(),
      };
    }
    try {
      const response = await fetch(`${env.openRouterBaseUrl}/models`, {
        headers: { Authorization: `Bearer ${env.openRouterApiKey}` },
      });
      return {
        healthy: response.ok,
        message: response.ok ? undefined : `status ${response.status}`,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        healthy: false,
        message: err instanceof Error ? err.message : "unknown error",
        checkedAt: new Date().toISOString(),
      };
    }
  }

  capabilities(): ProviderCapabilities {
    return {
      streaming: true,
      maxContextTokens: 32000,
      supportsJsonMode: false,
      zdrSupported: true,
    };
  }
}
