import { pool } from "../db/pool.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { critiqueSchema, isValidCritiqueResult } from "./schemas.js";

export const PROMPT_VERSION_CRITIC = "critic-naturalness-v1.0";

export interface CritiqueParams {
  campaignId: string;
  languageEntryId: string;
  candidateText: string;
  canonicalFact: string;
}

export interface CritiqueOutcome {
  verdict: string;
  naturalnessScore: number;
  factualDrift: boolean;
  costUsd: number | null;
}

/**
 * Doc §3.2/§9/§10 — Terra as critic, used selectively (sampled), not on
 * every generator output. Records the critique but does NOT change the
 * language_entries row's `status` or `afribit_reviewed` — an AI critic
 * score is a signal for human reviewers, never a substitute for one (doc
 * §38 rule 2: "Never allow one model to certify another model's content
 * as Gold").
 */
export async function critiqueCandidate(gateway: AfribitAIGateway, params: CritiqueParams): Promise<CritiqueOutcome> {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  const response = await gateway.chat({
    requestId,
    messages: [
      {
        role: "system",
        content:
          "ROLE\nYou are a language-quality critic for Afribit AI, a Bitcoin education chatbot. You review a candidate Sheng/Kiswahili phrasing against the canonical fact it's supposed to convey.\n\nCHECK FOR\n- Unnatural literal translation or overly formal Kiswahili where casual Sheng was expected.\n- Whether the canonical fact's meaning (including any numbers) survived intact.\n- Any unsafe Bitcoin guidance (e.g. implying guaranteed profit, requesting secrets).\n\nReturn only the required structured JSON.",
      },
      {
        role: "user",
        content: `CANONICAL FACT\n${params.canonicalFact}\n\nCANDIDATE TEXT\n${params.candidateText}\n\nEvaluate this candidate.`,
      },
    ],
    languageMode: "sheng",
    explanationLevel: "normal",
    modelProfile: "dataset_critic",
    maxOutputTokens: 300,
    temperature: 0.2,
    privacyProfile: "strict",
    responseFormat: { name: "critique_result", schema: critiqueSchema },
  });

  let parsed: { verdict: string; naturalness_score: number; factual_drift: boolean } | null = null;
  try {
    const json = JSON.parse(response.content);
    if (isValidCritiqueResult(json)) parsed = json;
  } catch {
    // fall through — parsed stays null, recorded as schema_invalid below
  }

  await pool.query(
    `INSERT INTO dataset_generations
      (campaign_id, model_role, provider, model, prompt_version, raw_request, raw_response,
       parsed_candidate_count, accepted_candidate_count, input_tokens, output_tokens, cost_usd, latency_ms, status)
     VALUES ($1,'critic',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      params.campaignId,
      response.provider,
      response.model,
      PROMPT_VERSION_CRITIC,
      JSON.stringify({ languageEntryId: params.languageEntryId }),
      response.content,
      parsed ? 1 : 0,
      parsed ? 1 : 0,
      response.usage.promptTokens,
      response.usage.completionTokens,
      response.estimatedCostUsd,
      Date.now() - startedAt,
      parsed ? "ok" : "schema_invalid",
    ],
  );

  if (parsed) {
    await pool.query(
      `UPDATE language_entries
       SET naturalness_score = $2, review_count = review_count + 1, critic_verdict = $3, critic_factual_drift = $4
       WHERE id = $1`,
      [params.languageEntryId, parsed.naturalness_score, parsed.verdict, parsed.factual_drift],
    );
  }

  return {
    verdict: parsed?.verdict ?? "unknown",
    naturalnessScore: parsed?.naturalness_score ?? 0,
    factualDrift: parsed?.factual_drift ?? false,
    costUsd: response.estimatedCostUsd,
  };
}
