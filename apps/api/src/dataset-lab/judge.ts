import { pool } from "../db/pool.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { COMMUNICATION_STYLE_GUIDE } from "../prompt/communicationStyleGuide.js";
import { SHENG_STYLE_GUIDE } from "../prompt/shengStyleGuide.js";
import { critiqueSchema, isValidCritiqueResult } from "./schemas.js";

// v1.1 (2026-09-17): added SHENG_STYLE_GUIDE, same reasoning as
// critique.ts's PROMPT_VERSION_CRITIC bump -- the judge's "independent"
// opinion should still be calibrated against the same corrected Sheng
// standard as everything else, not a different unguided notion of it.
//
// v1.3 (2026-09-23): added COMMUNICATION_STYLE_GUIDE, matching critique.ts's
// v1.3 and promptTemplates.ts's v1.4 (docs/COMMUNICATION_STYLE_EVAL.md) --
// same calibration argument extends to register/safety, not just Sheng
// vocabulary correctness.
export const PROMPT_VERSION_JUDGE = "judge-adjudication-v1.3";

export interface JudgeParams {
  campaignId: string;
  languageEntryId: string;
  candidateText: string;
  concept: string;
  canonicalFact: string | null;
  criticVerdict: string;
  criticFactualDrift: boolean;
}

export interface JudgeOutcome {
  verdict: string;
  naturalnessScore: number;
  factualDrift: boolean;
  costUsd: number | null;
}

/**
 * Doc §3.2/§9 -- Sol as judge, invoked sparingly: only when the critic
 * (Terra) already flagged a candidate as something other than "natural",
 * or flagged factual drift. A second, independent model opinion on a case
 * a first model already found questionable -- still advisory only, still
 * never touches language_entries.status/afribit_reviewed (doc §38 rule 2:
 * "Never allow one model to certify another model's content as Gold").
 */
export async function judgeCandidate(gateway: AfribitAIGateway, params: JudgeParams): Promise<JudgeOutcome> {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  const response = await gateway.chat({
    requestId,
    messages: [
      {
        role: "system",
        content:
          `ROLE\nYou are a second-opinion adjudicator for Afribit AI's dataset pipeline. A first critic model already reviewed this Sheng/Kiswahili candidate and flagged it as questionable. You are the tie-breaker -- give your own independent assessment, not a rubber stamp of the first critic's call.\n\nCHECK FOR\n- Whether the phrasing is natural for a Nairobi/Kibera Sheng speaker.\n- Whether the canonical fact's meaning (including any numbers) survived intact, if a canonical fact is supplied.\n- Any unsafe Bitcoin guidance.\n\n${SHENG_STYLE_GUIDE}\n\n${COMMUNICATION_STYLE_GUIDE}\n\nReturn only the required structured JSON.`,
      },
      {
        role: "user",
        content: `CONCEPT\n${params.concept}\n\n${
          params.canonicalFact ? `CANONICAL FACT\n${params.canonicalFact}\n\n` : ""
        }CANDIDATE TEXT\n${params.candidateText}\n\nFIRST CRITIC'S VERDICT\n${params.criticVerdict} (factual_drift=${params.criticFactualDrift})\n\nGive your own independent evaluation.`,
      },
    ],
    languageMode: "sheng",
    explanationLevel: "normal",
    modelProfile: "dataset_judge",
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
    // fall through -- parsed stays null, recorded as schema_invalid below
  }

  await pool.query(
    `INSERT INTO dataset_generations
      (campaign_id, model_role, provider, model, prompt_version, raw_request, raw_response,
       parsed_candidate_count, accepted_candidate_count, input_tokens, output_tokens, cost_usd, latency_ms, status)
     VALUES ($1,'judge',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      params.campaignId,
      response.provider,
      response.model,
      PROMPT_VERSION_JUDGE,
      JSON.stringify({ languageEntryId: params.languageEntryId, criticVerdict: params.criticVerdict }),
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
       SET judge_verdict = $2, judge_naturalness_score = $3, judge_factual_drift = $4
       WHERE id = $1`,
      [params.languageEntryId, parsed.verdict, parsed.naturalness_score, parsed.factual_drift],
    );
  }

  return {
    verdict: parsed?.verdict ?? "unknown",
    naturalnessScore: parsed?.naturalness_score ?? 0,
    factualDrift: parsed?.factual_drift ?? false,
    costUsd: response.estimatedCostUsd,
  };
}
