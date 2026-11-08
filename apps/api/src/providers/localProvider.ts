import type {
  AfribitChatRequest,
  AfribitChatResponse,
  InferenceProvider,
  ProviderCapabilities,
  ProviderHealth,
} from "@afribit/shared";
import { env } from "../config/env.js";
import { getModelProfile, scopedModelProfile } from "../config/modelProfiles.js";
import { assertContextPolicy } from "../privacy/contextPolicy.js";
import { computeCall,computeStream } from "../compute/admission.js";
import { assertNativeContext, assertNativeCompletion } from "../prompt/nativeContext.js";

/**
 * Inference on a community node: a model server running on hardware the
 * community controls (Ollama, or any OpenAI-compatible server such as vLLM,
 * llama.cpp's llama-server, or Open WebUI). Prompts and answers never leave
 * the node's network, so unlike the OpenRouter provider there is no
 * zero-data-retention promise to trust -- there is simply no third party.
 *
 * Like openRouterProvider.ts, this is one of the only modules that knows a
 * concrete provider's API shape; everything else goes through the gateway.
 *
 * Two wire formats, chosen with LOCAL_LLM_API:
 *  - "ollama": native /api/chat. Preferred for Ollama because it is the only way
 *    to set the context window (the OpenAI-compatible route silently truncates
 *    to Ollama's small default, which would cut our ~5.5k-token prompts).
 *  - "openai": /v1/chat/completions, for everything else.
 */

interface OllamaChatChunk {
  model?: string;
  message?: { content?: string };
  done?: boolean;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  error?: string;
}

interface OpenAIChatResponse {
  model?: string;
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string };
}

interface OpenAIStreamChunk {
  model?: string;
  choices?: { delta?: { content?: string }; finish_reason?: string | null }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (env.localLlmApiKey) h.Authorization = `Bearer ${env.localLlmApiKey}`;
  return h;
}

function modelFor(request: AfribitChatRequest): string {
  return scopedModelProfile(request.modelProfile)?.model || env.localLlmModel || getModelProfile(request.modelProfile).model;
}

function ollamaBody(request: AfribitChatRequest, stream: boolean): Record<string, unknown> {
  return {
    model: modelFor(request),
    messages: request.messages,
    stream,
    ...(env.localLlmDisableThinking ? { think: false } : {}),
    options: {
      num_ctx: env.localLlmNumCtx,
      temperature: request.temperature,
      num_predict: request.maxOutputTokens,
      ...(env.localLlmNumGpu !== undefined ? { num_gpu: env.localLlmNumGpu } : {}),
    },
    // Ollama accepts a JSON schema here for structured output.
    ...(request.responseFormat ? { format: request.responseFormat.schema } : {}),
  };
}

function openAIBody(request: AfribitChatRequest, stream: boolean): Record<string, unknown> {
  return {
    model: modelFor(request),
    messages: request.messages,
    max_tokens: request.maxOutputTokens,
    temperature: request.temperature,
    stream,
    ...(stream ? { stream_options: { include_usage: true } } : {}),
    ...(request.responseFormat
      ? {
          response_format: {
            type: "json_schema",
            json_schema: { name: request.responseFormat.name, strict: true, schema: request.responseFormat.schema },
          },
        }
      : {}),
  };
}

export class LocalProvider implements InferenceProvider {
  readonly name = "local";

  async chat(request: AfribitChatRequest): Promise<AfribitChatResponse> {
    assertContextPolicy(request, this.name);
    assertNativeContext(request.messages,request.maxOutputTokens,env.localLlmApi,env.localLlmNumCtx);
    const startedAt = Date.now();
    return computeCall({kind:"chat",provider:"local",model:modelFor(request),baseUrl:env.localLlmBaseUrl},
      {messages:request.messages,responseFormat:request.responseFormat},request.maxOutputTokens,
      async()=>{const response=await (env.localLlmApi === "ollama" ? this.ollamaChat(request, startedAt) : this.openAIChat(request, startedAt));
        assertNativeCompletion(response.finishReason);return response;},(r)=>r.estimatedCostUsd);
  }

  private async ollamaChat(request: AfribitChatRequest, startedAt: number): Promise<AfribitChatResponse> {
    const response = await fetch(`${env.localLlmBaseUrl}/api/chat`, {
      method: "POST",
      signal: request.signal instanceof AbortSignal ? request.signal : undefined,
      redirect: "error",
      headers: headers(),
      body: JSON.stringify(ollamaBody(request, false)),
    });
    if (!response.ok) {
      throw new Error(`Local model request failed (${response.status}): ${(await response.text().catch(() => "")).slice(0, 300)}`);
    }
    const data = (await response.json()) as OllamaChatChunk;
    if (data.error) throw new Error(`Local model error: ${data.error}`);
    const content = data.message?.content;
    if (!content) throw new Error("Local model returned empty content");
    const prompt = data.prompt_eval_count ?? 0;
    const completion = data.eval_count ?? 0;
    return {
      requestId: request.requestId,
      content,
      provider: this.name,
      model: data.model ?? modelFor(request),
      usage: { promptTokens: prompt, completionTokens: completion, totalTokens: prompt + completion },
      latencyMs: Date.now() - startedAt,
      finishReason: data.done_reason === "length" ? "length" : "stop",
      estimatedCostUsd: 0,
    };
  }

  private async openAIChat(request: AfribitChatRequest, startedAt: number): Promise<AfribitChatResponse> {
    const response = await fetch(`${env.localLlmBaseUrl}/v1/chat/completions`, {
      method: "POST",
      signal: request.signal instanceof AbortSignal ? request.signal : undefined,
      redirect: "error",
      headers: headers(),
      body: JSON.stringify(openAIBody(request, false)),
    });
    if (!response.ok) {
      throw new Error(`Local model request failed (${response.status}): ${(await response.text().catch(() => "")).slice(0, 300)}`);
    }
    const data = (await response.json()) as OpenAIChatResponse;
    const choice = data.choices?.[0];
    const content = choice?.message?.content;
    if (!content) throw new Error(`Local model returned no content: ${data.error?.message ?? "empty choices"}`);
    return {
      requestId: request.requestId,
      content,
      provider: this.name,
      model: data.model ?? modelFor(request),
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      latencyMs: Date.now() - startedAt,
      finishReason: choice?.finish_reason === "length" ? "length" : "stop",
      estimatedCostUsd: 0,
    };
  }

  async *chatStream(request: AfribitChatRequest): AsyncGenerator<string, AfribitChatResponse, void> {
    assertContextPolicy(request, this.name);
    assertNativeContext(request.messages,request.maxOutputTokens,env.localLlmApi,env.localLlmNumCtx);
    return yield*computeStream({kind:"chat",provider:"local",model:modelFor(request),baseUrl:env.localLlmBaseUrl},
      {messages:request.messages,responseFormat:request.responseFormat},request.maxOutputTokens,()=>this.streamTransport(request));
  }
  private async *streamTransport(request:AfribitChatRequest):AsyncGenerator<string,AfribitChatResponse,void>{
    const startedAt = Date.now();
    const ollama = env.localLlmApi === "ollama";
    const response = await fetch(`${env.localLlmBaseUrl}${ollama ? "/api/chat" : "/v1/chat/completions"}`, {
      method: "POST",
      signal: request.signal instanceof AbortSignal ? request.signal : undefined,
      redirect: "error",
      headers: headers(),
      body: JSON.stringify(ollama ? ollamaBody(request, true) : openAIBody(request, true)),
    });
    if (!response.ok || !response.body) {
      throw new Error(`Local model stream failed (${response.status}): ${(await response.text().catch(() => "")).slice(0, 300)}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let model = modelFor(request);
    let finishReason: "stop" | "length" | "error" = "stop";
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;

          if (ollama) {
            // Ollama streams one JSON object per line.
            let chunk: OllamaChatChunk;
            try {
              chunk = JSON.parse(line) as OllamaChatChunk;
            } catch {
              continue;
            }
            if (chunk.error) throw new Error(`Local model error: ${chunk.error}`);
            model = chunk.model ?? model;
            const delta = chunk.message?.content;
            if (delta) {
              content += delta;
              yield delta;
            }
            if (chunk.done) {
              if (chunk.done_reason === "length") finishReason = "length";
              const prompt = chunk.prompt_eval_count ?? 0;
              const completion = chunk.eval_count ?? 0;
              usage = { promptTokens: prompt, completionTokens: completion, totalTokens: prompt + completion };
            }
          } else {
            // OpenAI-style server-sent events.
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            let chunk: OpenAIStreamChunk;
            try {
              chunk = JSON.parse(payload) as OpenAIStreamChunk;
            } catch {
              continue;
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
      }
    } finally {
      await reader.cancel().catch(()=>{});
      reader.releaseLock();
    }

    if (!content) throw new Error("Local model returned an empty stream");
    assertNativeCompletion(finishReason);
    return {
      requestId: request.requestId,
      content,
      provider: this.name,
      model,
      usage,
      latencyMs: Date.now() - startedAt,
      finishReason,
      estimatedCostUsd: 0,
    };
  }

  async health(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();
    try {
      const url = env.localLlmApi === "ollama" ? `${env.localLlmBaseUrl}/api/tags` : `${env.localLlmBaseUrl}/v1/models`;
      const response = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(5000) });
      return { healthy: response.ok, message: response.ok ? undefined : `status ${response.status}`, checkedAt };
    } catch (err) {
      return { healthy: false, message: err instanceof Error ? err.message : "unknown error", checkedAt };
    }
  }

  capabilities(): ProviderCapabilities {
    return {
      streaming: true,
      maxContextTokens: env.localLlmNumCtx,
      supportsJsonMode: true,
      // Nothing leaves the node's network, so there is no third party to retain data.
      zdrSupported: true,
    };
  }
}
