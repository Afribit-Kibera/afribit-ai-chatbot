import { env } from "../config/env.js";
import { embedLocalTexts } from "./localEmbeddings.js";
import { embedTexts as embedHostedTexts } from "./openRouterEmbeddings.js";

/**
 * One place that knows where embeddings come from (a hosted model or the node's own), so
 * retrieval and the backfill never care. Mirrors the chat gateway's rule: the rest of the app
 * does not know which provider is active.
 */

/**
 * The id stored with every vector. Hosted and local copies of the same model get different ids
 * ("baai/bge-m3" versus "local:bge-m3"): they are close but not identical vectors, and a deployment
 * must only ever compare a question against vectors made by the same thing.
 */
export function activeEmbeddingModel(): string {
  return env.embeddingProvider === "local" ? `local:${env.localEmbeddingModel}` : env.embeddingModel;
}

/**
 * Whether semantic search may run at all. A local provider always may. A hosted provider sends the
 * customer's question to a third party, so in `node` mode it needs an explicit opt-in.
 */
export function semanticSearchEnabled(): boolean {
  return env.embeddingProvider === "local" || env.cloudEmbeddingsAllowed;
}

async function embed(texts: string[]): Promise<number[][]> {
  return env.embeddingProvider === "local" ? embedLocalTexts(texts) : embedHostedTexts(texts);
}

/** Embed knowledge cards (documents). */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  return embed(texts.map((t) => env.embeddingDocPrefix + t));
}

/** Embed a customer's question. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embed([env.embeddingQueryPrefix + text]);
  if (!vector) throw new Error("Embeddings returned no vector");
  return vector;
}
