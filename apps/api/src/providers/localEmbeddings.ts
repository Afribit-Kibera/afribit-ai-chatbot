import { env } from "../config/env.js";

/**
 * Embeddings from a community node's own model server (Ollama, or any OpenAI-compatible server
 * such as llama.cpp's llama-server or vLLM). Nothing leaves the node's network, which is what
 * lets semantic search work in `node` mode with no cloud call.
 *
 * Same split as localProvider.ts: Ollama's native /api/embed, or the OpenAI-compatible
 * /v1/embeddings, chosen with LOCAL_LLM_API.
 */

const BATCH = 16;

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (env.localLlmApiKey) h.Authorization = `Bearer ${env.localLlmApiKey}`;
  return h;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const ollama = env.localLlmApi === "ollama";
  const response = await fetch(`${env.localLlmBaseUrl}${ollama ? "/api/embed" : "/v1/embeddings"}`, {
    method: "POST",
    headers: headers(),
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify(
      ollama
        ? { model: env.localEmbeddingModel, input: texts, options: { num_gpu: env.localEmbeddingNumGpu } }
        : { model: env.localEmbeddingModel, input: texts },
    ),
  });
  if (!response.ok) {
    throw new Error(`Local embeddings request failed (${response.status}): ${(await response.text().catch(() => "")).slice(0, 300)}`);
  }
  const data = (await response.json()) as { embeddings?: number[][]; data?: { embedding: number[]; index?: number }[]; error?: string };
  if (data.error) throw new Error(`Local embeddings error: ${data.error}`);

  const vectors = ollama ? data.embeddings : data.data?.slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((d) => d.embedding);
  if (!vectors || vectors.length !== texts.length) {
    throw new Error(`Local embeddings returned ${vectors?.length ?? 0} vectors for ${texts.length} inputs`);
  }
  if (vectors.some((v) => !Array.isArray(v) || v.length === 0)) throw new Error("Local embeddings returned an empty vector");
  return vectors;
}

export async function embedLocalTexts(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    out.push(...(await embedBatch(texts.slice(i, i + BATCH))));
  }
  return out;
}
