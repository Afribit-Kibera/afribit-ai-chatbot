import type { AfribitChatMessage } from "@afribit/shared";
import { pool } from "../db/pool.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { candidateBatchSchema, isValidCandidateBatch, type CandidateBatch } from "./schemas.js";
import { runQualityChecks, preservesCanonicalNumbers } from "./qualityChecks.js";

export interface GenerateCandidatesParams {
  campaignId: string;
  conceptKnowledgeId: string | null;
  modelProfile: "dataset_generator" | "dataset_critic" | "dataset_judge";
  modelRole: "generator" | "critic" | "judge";
  promptVersion: string;
  messages: AfribitChatMessage[];
  /** L04 needs numeric-fact preservation against this text; L05 (questions) doesn't. */
  canonicalFactForNumberCheck?: string;
}

export interface GenerateCandidatesResult {
  generationId: string;
  parsedCount: number;
  acceptedCount: number;
  acceptedTexts: string[];
  costUsd: number | null;
}

/**
 * One Dataset Lab generation call: prompts the configured model for a
 * structured candidate batch, validates it, runs deterministic quality
 * checks (doc §17), and records everything — raw response included,
 * regardless of outcome (doc §18: never discard raw provider output).
 */
export async function generateCandidates(
  gateway: AfribitAIGateway,
  params: GenerateCandidatesParams,
): Promise<GenerateCandidatesResult> {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  const response = await gateway.chat({
    requestId,
    messages: params.messages,
    languageMode: "sheng",
    explanationLevel: "normal",
    modelProfile: params.modelProfile,
    maxOutputTokens: 1500,
    temperature: 0.9,
    privacyProfile: "strict",
    responseFormat: { name: "candidate_batch", schema: candidateBatchSchema },
  });

  let parsed: CandidateBatch | null = null;
  let parseError: string | null = null;
  try {
    const json = JSON.parse(response.content);
    if (isValidCandidateBatch(json)) parsed = json;
    else parseError = "shape_mismatch";
  } catch (err) {
    parseError = err instanceof Error ? err.message : "json_parse_error";
  }

  const accepted: string[] = [];
  if (parsed) {
    for (const example of parsed.examples) {
      const check = await runQualityChecks(example);
      if (!check.accepted) continue;
      if (params.canonicalFactForNumberCheck && !preservesCanonicalNumbers(params.canonicalFactForNumberCheck, example.text)) {
        continue;
      }
      accepted.push(example.text);
    }
  }

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO dataset_generations
      (campaign_id, concept_knowledge_id, model_role, provider, model, prompt_version,
       raw_request, raw_response, parsed_candidate_count, accepted_candidate_count,
       input_tokens, output_tokens, cost_usd, latency_ms, status, error_message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING id`,
    [
      params.campaignId,
      params.conceptKnowledgeId,
      params.modelRole,
      response.provider,
      response.model,
      params.promptVersion,
      JSON.stringify({ messages: params.messages, modelProfile: params.modelProfile }),
      response.content,
      parsed?.examples.length ?? 0,
      accepted.length,
      response.usage.promptTokens,
      response.usage.completionTokens,
      response.estimatedCostUsd,
      Date.now() - startedAt,
      parsed ? "ok" : "schema_invalid",
      parseError,
    ],
  );
  const generationId = rows[0]?.id;
  if (!generationId) throw new Error("Failed to record dataset_generations row");

  return {
    generationId,
    parsedCount: parsed?.examples.length ?? 0,
    acceptedCount: accepted.length,
    acceptedTexts: accepted,
    costUsd: response.estimatedCostUsd,
  };
}

/**
 * Persists accepted candidate texts into language_entries as
 * L1_synthetic_bootstrap — unreviewed, never allowed_for_rag/training,
 * per docs/LANGUAGE_CORPUS.md and the Architecture doc's own rule:
 * "AI must never be allowed to certify its own synthetic output as
 * authentic community language."
 */
export async function persistAcceptedCandidates(params: {
  generationId: string;
  texts: string[];
  style: "sheng" | "swahili" | "simple_en" | "mixed_ke";
  intent: string | null;
  concept: string;
}): Promise<{ count: number; ids: string[] }> {
  const ids: string[] = [];
  for (const text of params.texts) {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO language_entries (
         utterance, intent, meaning, style, source_context,
         status, freshness, corpus_layer, source, source_type, license,
         human_authored, synthetic, afribit_reviewed, quality_tier,
         allowed_for_rag, allowed_for_training, allowed_for_evaluation, generation_id
       ) VALUES ($1,$2,$3,$4,$5,'draft','current','L1_synthetic_bootstrap','afribit_dataset_lab','synthetic_generated',NULL,
         FALSE, TRUE, FALSE, 'unrated', FALSE, FALSE, TRUE, $6)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [text, params.intent, params.concept, params.style, `dataset_lab:${params.generationId}`, params.generationId],
    );
    if (result.rows[0]) ids.push(result.rows[0].id);
  }
  return { count: ids.length, ids };
}
