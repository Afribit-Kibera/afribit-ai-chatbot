import { config as loadDotenv } from "dotenv";
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

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "postgres://afribit:afribit@localhost:5432/afribit",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterBaseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  /** PRD §18.4 — embedding provider, abstracted the same way chat inference is. 1536 dims matches knowledge_embeddings.embedding (001_init.sql). */
  embeddingModel: process.env.EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
  /** PRD §17.2 — required for OpenRouter's zero-data-retention routing. */
  openRouterZdrOnly: (process.env.OPENROUTER_ZDR_ONLY ?? "true") === "true",
  /** PRD §35 — disabled by default in production. */
  promptLoggingEnabled: (process.env.PROMPT_LOGGING_ENABLED ?? "false") === "true",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
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
};

export function assertProductionEnv(): void {
  if (env.nodeEnv === "production") {
    required("DATABASE_URL");
    required("OPENROUTER_API_KEY");
    required("JWT_SECRET");
  }
}
