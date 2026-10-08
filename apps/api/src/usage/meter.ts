import { pool } from "../db/pool.js";
import type { UsageEvent } from "../gateway/gateway.js";

/**
 * Writes one model_runs row per model call. Installed by the server only, so evaluation scripts and
 * tests that build their own gateway do not write to the database.
 */
export async function recordUsage(e: UsageEvent): Promise<void> {
  await pool.query(
    `INSERT INTO model_runs (request_id, profile, provider, model, latency_ms, prompt_tokens, completion_tokens, estimated_cost_usd, status, error_message, pack_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [e.requestId, e.profile, e.provider, e.model, e.latencyMs, e.promptTokens, e.completionTokens, e.estimatedCostUsd, e.status, e.errorMessage, e.packId],
  );
}
