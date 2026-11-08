import { env } from "../config/env.js";
import { assertEmbeddingPolicy } from "../privacy/contextPolicy.js";
import { computeCall } from "../compute/admission.js";

/**
 * PRD §18.4 — embedding provider, abstracted the same way chat inference is
 * (this file is the only thing that knows OpenRouter's embeddings API
 * shape, same rule as openRouterProvider.ts for chat). Separate from
 * InferenceProvider/AfribitAIGateway: embeddings aren't a chat completion,
 * and forcing them through that interface (temperature, maxOutputTokens,
 * streaming, etc. all being meaningless here) would be a worse fit than a
 * small parallel module.
 *
 * OpenRouter proxies OpenAI-shaped /embeddings for models like
 * openai/text-embedding-3-small (confirmed live: 1536 dimensions, matching
 * knowledge_embeddings.embedding in 001_init.sql with no migration change
 * needed, at ~$0.02/1M tokens).
 */

interface OpenRouterEmbeddingResponse {
  data: { embedding: number[] }[];
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  assertEmbeddingPolicy("openrouter",env.openRouterBaseUrl);
  return computeCall({kind:"embeddings",provider:"openrouter",model:env.embeddingModel,baseUrl:env.openRouterBaseUrl},{texts},0,()=>embedTransport(texts));
}
async function embedTransport(texts:string[]):Promise<number[][]>{
  if (!env.openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const response = await fetch(`${env.openRouterBaseUrl}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://afribit.africa",
      "X-Title": "Afribit AI",
    },
    body: JSON.stringify({ model: env.embeddingModel, input: texts }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`OpenRouter embeddings request failed (${response.status}): ${errorText.slice(0, 500)}`);
  }

  const data = (await response.json()) as OpenRouterEmbeddingResponse;
  return data.data.map((d) => d.embedding);
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  if (!embedding) throw new Error("OpenRouter embeddings returned no result");
  return embedding;
}
