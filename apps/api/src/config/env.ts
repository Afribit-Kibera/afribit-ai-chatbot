import { config as loadDotenv } from "dotenv";
import { parseOrigins } from "./cors.js";
import { parseModelLocationSetting } from "../privacy/location.js";
import { parseRetention } from "../privacy/retention.js";
import { parseRegistration } from "../auth/invitations.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

// pnpm runs workspace scripts with cwd set to the package directory
// (apps/api), not the repo root — so `dotenv/config`'s default cwd-relative
// lookup silently finds nothing and OPENROUTER_API_KEY et al. are always
// undefined. Resolve the root .env explicitly instead.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.join(__dirname, "..", "..", "..", "..", ".env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Where chat inference runs.
 *  - "cloud":  hosted models via OpenRouter (default; how the public demo runs).
 *  - "node":   a community node's own model server only. Nothing leaves the
 *              community: no cloud chat, no cloud embeddings. If the node is
 *              down the API answers straight from the reviewed knowledge cards.
 *  - "hybrid": node first, then cloud if the node fails. This sends the user's
 *              question outside the community, so it is an explicit opt-in.
 */
export type InferenceMode = "cloud" | "node" | "hybrid";
const INFERENCE_MODES: readonly InferenceMode[] = ["cloud", "node", "hybrid"];

function parseInferenceMode(value: string | undefined): InferenceMode {
  const mode = (value ?? "cloud") as InferenceMode;
  if (!INFERENCE_MODES.includes(mode)) {
    throw new Error(`INFERENCE_MODE must be one of ${INFERENCE_MODES.join(", ")} (got "${value}")`);
  }
  return mode;
}

const inferenceMode = parseInferenceMode(process.env.INFERENCE_MODE);

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "postgres://afribit:afribit@localhost:5432/afribit",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterBaseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  /** PRD §18.4 — embedding provider, abstracted the same way chat inference is. Vectors are stored per model in knowledge_embeddings_v2 (migration 010), any dimension. */
  embeddingModel: process.env.EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
  /**
   * Where embeddings (card vectors and the vector for each question) come from.
   *  - "openrouter": a hosted model (EMBEDDING_MODEL). The default for cloud and hybrid.
   *  - "local": the node's own model server (LOCAL_EMBEDDING_MODEL). The default in node mode, so semantic
   *    search keeps working with no cloud call. In our benchmark bge-m3 found the right card in the top 3
   *    for 40 of 40 raw Sheng/Kiswahili questions, against 35 of 40 for the OpenAI model.
   * Vectors are stored per model (migration 010), so switching is a setting plus a re-embed, not a migration.
   */
  embeddingProvider: ((process.env.EMBEDDING_PROVIDER || (inferenceMode === "node" ? "local" : "openrouter")) === "local" ? "local" : "openrouter") as "local" | "openrouter",
  localEmbeddingModel: process.env.LOCAL_EMBEDDING_MODEL || "bge-m3",
  /**
   * F-006 — a separate server for embeddings. Empty (the default): the chat model's server
   * (LOCAL_LLM_BASE_URL, its API style and key). An Afribit Local box sends questions to Afribit's GPU server
   * but sets this to its own Ollama, so search, and the card-only answers when that server is unreachable,
   * never depend on it. A separate server gets its own key, never the chat server's.
   */
  localEmbeddingBaseUrl: (process.env.LOCAL_EMBEDDING_BASE_URL ?? "").replace(/\/+$/, ""),
  localEmbeddingApi: (process.env.LOCAL_EMBEDDING_API ?? "ollama") === "openai" ? ("openai" as const) : ("ollama" as const),
  localEmbeddingApiKey: process.env.LOCAL_EMBEDDING_API_KEY ?? "",
  /** Embeddings run on the CPU by default (0 GPU layers): bge-m3 takes ~40 ms per question there, and it leaves the GPU's memory to the chat model. */
  localEmbeddingNumGpu: process.env.LOCAL_EMBEDDING_NUM_GPU === undefined || process.env.LOCAL_EMBEDDING_NUM_GPU === "" ? 0 : Number(process.env.LOCAL_EMBEDDING_NUM_GPU),
  /** Some embedding models want a task prefix on questions and on documents (bge-m3 needs none). */
  embeddingQueryPrefix: process.env.EMBEDDING_QUERY_PREFIX ?? "",
  embeddingDocPrefix: process.env.EMBEDDING_DOC_PREFIX ?? "",
  inferenceMode,
  /**
   * Which prompt the chat model gets. "full" is the original long prompt (4,000-5,500 tokens);
   * "compact" is the waiter prompt (~900 tokens), which scored higher on both the language
   * rubric and factual accuracy in our evaluation (docs/evaluation/methodology.md).
   * Stays "full" until community reviewers have compared them blind.
   */
  promptMode: (process.env.PROMPT_MODE ?? "full") === "compact" ? ("compact" as const) : ("full" as const),
  /**
   * Let a small "waiter" model rewrite the user's message into a clean English search question
   * before retrieval. Raised the right-card-in-top-3 rate from 33/40 to 40/40 in testing, at the
   * cost of one short extra model call. The user's own words are still what the answer is written
   * for. Off by default.
   */
  /** When true, the person who last edited a knowledge card cannot be the one to make it live (approved/published). Recommended once a community has two or more reviewers. */
  reviewTwoPerson: process.env.REVIEW_TWO_PERSON === "true",
  waiterQueryRewrite: process.env.WAITER_QUERY_REWRITE === "true",
  /**
   * "single" (default): one model answers from the cards. "restaurant": waiter writes a neutral ticket, a
   * hosted chef cooks from that ticket plus the cards (never seeing the customer's words), the waiter serves
   * it in the customer's language. Needs a hosted chef, so it is ignored in node mode. Off until community
   * reviewers have compared it blind.
   */
  chatPipeline: process.env.CHAT_PIPELINE === "restaurant" ? ("restaurant" as const) : ("single" as const),
  /** Cloud mode only: which model profile answers ("default_chat" = Llama 3.3 70B, "compact_chat_cloud" = Gemma 3 12B). */
  cloudChatProfile: process.env.CLOUD_CHAT_PROFILE ?? "default_chat",
  /** Base URL of the node's model server: Ollama (default port 11434), or an OpenAI-compatible server (vLLM, llama.cpp, Open WebUI). */
  localLlmBaseUrl: (process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434").replace(/\/+$/, ""),
  /** "ollama" = native /api/chat (lets us set the context window); "openai" = /v1/chat/completions. */
  localLlmApi: (process.env.LOCAL_LLM_API ?? "ollama") === "openai" ? ("openai" as const) : ("ollama" as const),
  /** Overrides the model name from the profile, so a node can swap models without editing JSON. */
  localLlmModel: process.env.LOCAL_LLM_MODEL ?? "",
  localLlmApiKey: process.env.LOCAL_LLM_API_KEY ?? "",
  /** Ollama defaults to a small context and silently truncates; our prompts run to ~5.5k tokens. */
  localLlmNumCtx: Number(process.env.LOCAL_LLM_NUM_CTX ?? 8192),
  /**
   * Cap how many model layers go on the GPU (Ollama only). Ollama's automatic split can
   * run out of GPU memory on small cards (seen on a 4 GB GTX 980 with a 12B model);
   * setting a low number, or 0 for CPU-only, fixes that. Empty = let Ollama decide.
   */
  localLlmNumGpu: process.env.LOCAL_LLM_NUM_GPU === undefined || process.env.LOCAL_LLM_NUM_GPU === "" ? undefined : Number(process.env.LOCAL_LLM_NUM_GPU),
  /** Qwen3-style models "think" first, which costs minutes on modest hardware. */
  localLlmDisableThinking: (process.env.LOCAL_LLM_DISABLE_THINKING ?? "true") === "true",
  /**
   * Semantic search embeds the user's question. In node mode that call would go to
   * OpenRouter, so it is off unless explicitly allowed; retrieval then uses
   * full-text search only (lower recall, nothing leaves the community).
   */
  cloudEmbeddingsAllowed: inferenceMode !== "node" || process.env.NODE_ALLOW_CLOUD_EMBEDDINGS === "true",
  /** PRD §17.2 — required for OpenRouter's zero-data-retention routing. */
  openRouterZdrOnly: (process.env.OPENROUTER_ZDR_ONLY ?? "true") === "true",
  /** PRD §35 — disabled by default in production. */
  promptLoggingEnabled: (process.env.PROMPT_LOGGING_ENABLED ?? "false") === "true",
  /**
   * Website origins allowed to call the API. A single origin, or several separated by commas
   * (for example the product site and its www form). Exact matches only -- never "*".
   */
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN || "http://localhost:5173"),
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:hello@afribit.ai",
  // 2026-09-24 — auth (production-readiness push, see README's former "No
  // authentication anywhere" gap). A hardcoded dev-only fallback so local
  // setup keeps working with zero config (matches every other env var's
  // pattern here), but this MUST be a real secret in production --
  // enforced below in assertProductionEnv(). Anyone who knows this default
  // could forge admin JWTs against a server that still uses it.
  jwtSecret: process.env.JWT_SECRET ?? "afribit-dev-only-insecure-secret-do-not-use-in-production",
  /**
   * F-001 — where the language model runs, as the operator states it: "auto" (default), "community" or
   * "afribit". "auto" claims "community" only for a model server on this machine or a sibling container;
   * an Afribit Local box must set "afribit" (privacy/location.ts).
   */
  modelLocationSetting: parseModelLocationSetting(process.env.MODEL_LOCATION),
  /**
   * F-002 — how long chat text is kept: "none", "<N>d" or "keep". Default 30 days (agreed 8 Oct 2026);
   * the pilot node sets "none" (deploy/community-node/.env.example).
   */
  chatRetention: parseRetention(process.env.CHAT_RETENTION),
  /**
   * F-012 — who may create an account: "invite" (default; a single-use code from an administrator),
   * "closed" or "open" (development only; the server warns elsewhere). Members need no account.
   */
  registration: parseRegistration(process.env.REGISTRATION),
  /**
   * F-004 — the gap list. A question is a gap when the best card's MEANING-match score (embedding cosine) is under
   * this. Default 0.65, calibrated for bge-m3 on 8 Oct 2026 (uncovered questions 0.42–0.65, covered 0.67–0.79);
   * re-calibrate if the embedding model changes. GAP_LABELS=off keeps unlabelled counts and makes no labelling call.
   */
  gapThreshold: Number.isFinite(Number(process.env.GAP_THRESHOLD)) && process.env.GAP_THRESHOLD ? Number(process.env.GAP_THRESHOLD) : 0.65,
  gapLabels: (process.env.GAP_LABELS ?? "on").toLowerCase() !== "off",
};

export function assertProductionEnv(): void {
  if (env.nodeEnv === "production") {
    required("DATABASE_URL");
    // A pure community node runs without any cloud account.
    if (env.inferenceMode !== "node") required("OPENROUTER_API_KEY");
    required("JWT_SECRET");
  }
}
