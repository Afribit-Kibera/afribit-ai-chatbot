import { pool } from "../db/pool.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { COMMUNICATION_STYLE_GUIDE } from "../prompt/communicationStyleGuide.js";
import { SHENG_STYLE_GUIDE } from "../prompt/shengStyleGuide.js";
import { critiqueSchema, isValidCritiqueResult } from "./schemas.js";

// v1.1 (2026-09-17): added SHENG_STYLE_GUIDE so "natural" is judged against
// concrete, corrected Sheng vocabulary/particles rather than the critic's
// own unguided notion of naturalness -- the live chat prompt and the
// generation prompts (promptTemplates.ts) now follow the same standard.
//
// v1.3 (2026-09-23): added COMMUNICATION_STYLE_GUIDE too, matching
// promptTemplates.ts's v1.4 -- same reasoning (docs/COMMUNICATION_STYLE_EVAL.md):
// its register ladder and safety floor are candidate-naturalness signals
// this critic should hold candidates to, same as the live chat prompt and
// the generator now do.
//
// v1.4 (2026-09-24): expanded CHECK FOR after a product-owner critique found
// the old single "unnatural literal translation" bullet wasn't specific
// enough -- a candidate composed in formal Kiswahili Sanifu structure with a
// few Sheng words swapped in can read as "natural-ish" on a vague check but
// fails a real speaker's ear immediately. The new bullets name the concrete
// tells directly (see SHENG_STYLE_GUIDE's AVOID list and the six-dimension
// framing) so the critic checks for what a real reviewer would notice.
export const PROMPT_VERSION_CRITIC = "critic-naturalness-v1.4";

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
          `ROLE\nYou are a language-quality critic for Afribit AI, a Bitcoin education chatbot. You review a candidate Sheng/Kiswahili phrasing against the canonical fact it's supposed to convey.\n\nCHECK FOR\n- Does this sound TRANSLATED from Kiswahili Sanifu -- formal sentence structure (relative-clause verb forms like "anayeweza," connectives like "Kwa hivyo," nominalized abstractions) with a few Sheng words swapped in? This is the single most common and most serious defect, even when individual vocabulary looks correct. Literal English-into-Kiswahili substitution (e.g. "Ukiwant...") is the same underlying problem.\n- Are the sentences too long or do they chain multiple ideas with formal connectives instead of short conversational clauses?\n- Are common English/technical words being translated unnecessarily (mtandaoni, benki, anwani, usalama, muamala) instead of left in English?\n- Is slang being forced -- "Bro"/"msee" inserted as a tic rather than because it fits, or invented neighbourhood-specific slang?\n- Would someone in Nairobi actually say this sentence out loud, in this order, with this grammar?\n- Did the phrasing change or soften a Bitcoin fact to sound more natural (e.g. an absolute "impossible to reverse" claim, a blanket "easy/fast/secure" promise, describing Bitcoin as identical to M-Pesa, a wallet "holding" coins)? Naturalness never excuses a factual change.\n- Does the candidate end with (or represent) one genuine comprehension question, not a vague filler ("niambie ukiwa na swali") or nothing at all?\n- Any unsafe Bitcoin guidance (e.g. implying guaranteed profit, requesting secrets).\n\n${SHENG_STYLE_GUIDE}\n\n${COMMUNICATION_STYLE_GUIDE}\n\nReturn only the required structured JSON.`,
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

export interface CritiqueQuestionParams {
  campaignId: string;
  languageEntryId: string;
  candidateText: string;
  concept: string;
}

/**
 * Critic pass for L05 candidates (user-style questions rather than
 * fact rewrites). `factual_drift` doesn't apply the way it does for L04 --
 * there's no canonical statement to drift from -- so the prompt asks the
 * model to set it only if the question itself implies a wrong premise
 * about the concept, and the naturalness score is what actually matters.
 */
export async function critiqueQuestion(gateway: AfribitAIGateway, params: CritiqueQuestionParams): Promise<CritiqueOutcome> {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  const response = await gateway.chat({
    requestId,
    messages: [
      {
        role: "system",
        content:
          `ROLE\nYou are a language-quality critic for Afribit AI, a Bitcoin education chatbot. You review a candidate Sheng/Kiswahili QUESTION -- not a statement -- meant to sound like something a real beginner would ask.\n\nCHECK FOR\n- Whether the phrasing sounds like a natural question a Nairobi/Kibera Sheng speaker would actually type -- not a stiff translation, not formal Sanifu sentence structure with Sheng words swapped in, not literal English-into-Kiswahili substitution.\n- Whether common English/technical words were translated unnecessarily instead of left in English.\n- Whether the question implies a wrong premise about the concept (set factual_drift true only in that case; otherwise false).\n- Any unsafe framing (e.g. soliciting secrets, implying guaranteed profit).\n\n${SHENG_STYLE_GUIDE}\n\n${COMMUNICATION_STYLE_GUIDE}\n\nReturn only the required structured JSON.`,
      },
      {
        role: "user",
        content: `CONCEPT\n${params.concept}\n\nCANDIDATE QUESTION\n${params.candidateText}\n\nEvaluate this candidate.`,
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
    // fall through -- parsed stays null, recorded as schema_invalid below
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
      `${PROMPT_VERSION_CRITIC}-question`,
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
