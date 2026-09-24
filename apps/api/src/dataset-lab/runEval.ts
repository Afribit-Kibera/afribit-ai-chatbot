import { pool } from "../db/pool.js";
import { selectModelProfile } from "../chat/chatService.js";
import { createGateway } from "../gateway/registry.js";
import { retrieveKnowledge } from "../knowledge/retrieval.js";
import { buildPrompt } from "../prompt/promptBuilder.js";
import { COMMUNICATION_STYLE_GUIDE } from "../prompt/communicationStyleGuide.js";
import { SHENG_STYLE_GUIDE } from "../prompt/shengStyleGuide.js";
import { getCampaignSpend } from "./budget.js";
import { critiqueSchema, isValidCritiqueResult } from "./schemas.js";

/**
 * "Test our dataset with our own AI": takes the L05 candidate questions a
 * generation campaign produced and runs them through the exact same
 * retrieval + prompt-assembly + gateway path apps/api/src/routes/chat.ts
 * uses for real users (selectModelProfile(), same as chatService.ts) -- so this measures
 * how the actual product handles Sheng input, not just whether the
 * dataset-lab generator produced plausible-looking text.
 *
 * Deliberately does NOT call chatService.sendMessage()/insert into
 * chat_sessions/chat_messages -- eval traffic must never mix with real
 * user conversations or skew product analytics (see chat_evaluations in
 * db/migrations/005_judge_and_chat_eval.sql).
 *
 * Shares its budget ceiling with runCampaign.ts via getCampaignSpend() --
 * generation + critic + judge + this eval pass all draw from one cap.
 *
 * Run with: pnpm --filter @afribit/api exec tsx src/dataset-lab/runEval.ts [campaignId]
 */

const CAMPAIGN_ID = process.argv[2] ?? "batch_2026_09_003";
const MAX_BUDGET_USD = 10.0;
const RETRY_DELAYS_MS = [1000, 3000, 8000];
const PACING_DELAY_MS = 400; // spread calls out instead of firing 105 back-to-back into a shared rate limit

interface EvalRow {
  id: string;
  question: string;
  concept_knowledge_id: string;
  canonical_answer: string;
}

async function budgetExceeded(): Promise<boolean> {
  return (await getCampaignSpend(CAMPAIGN_ID)) >= MAX_BUDGET_USD;
}

function isRetryable(err: unknown): boolean {
  const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
  const msg = [err, cause]
    .filter((e): e is Error => e instanceof Error)
    .map((e) => e.message)
    .join(" | ");
  return /\((429|500|502|503|504|529)\)/.test(msg) || /rate.?limit/i.test(msg) || /timed out/i.test(msg);
}

/**
 * The first eval run fired 105 chat calls back-to-back with no pacing and
 * hit a rate-limit burst that took out both default_chat and its fallback
 * simultaneously, inflating the fallback rate with an infra artifact
 * unrelated to retrieval/generation quality (see
 * docs/AFRIBIT_AI_SYNTHETIC_DATASET_ARCHITECTURE.md, Batch 003 update).
 * Retrying transient failures here keeps genuine product signal (does the
 * chat actually answer well) separate from "did we get rate-limited."
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (isRetryable(err) && attempt <= RETRY_DELAYS_MS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
        continue;
      }
      throw err;
    }
  }
  throw new Error("unreachable");
}

/** Scores the CHAT RESPONSE (not the training candidate) against the concept's canonical fact and the question's register. */
async function scoreResponse(
  gateway: ReturnType<typeof createGateway>,
  params: { question: string; response: string; canonicalFact: string },
): Promise<{ verdict: string | null; naturalnessScore: number | null; factualDrift: boolean | null; notes: string | null; costUsd: number | null }> {
  const requestId = crypto.randomUUID();
  const result = await gateway.chat({
    requestId,
    messages: [
      {
        role: "system",
        content:
          `ROLE\nYou are a quality critic for Afribit AI, a Bitcoin education chatbot for Kibera/Nairobi. You are shown a real Sheng-language question a user asked the chatbot and the chatbot's ACTUAL RESPONSE. Evaluate the response, not the question.\n\nCHECK FOR\n- Whether the response's register matches the question (natural Sheng/mixed code-switching per the standard below, not a stiff formal-Kiswahili or generic-English answer to a casual Sheng question, and not literal English-into-Kiswahili substitution).\n- Whether the response's factual content matches the supplied canonical fact (set factual_drift true if it contradicts or loses the fact).\n- Any unsafe Bitcoin guidance (guaranteed returns, requesting secrets, etc).\n\n${SHENG_STYLE_GUIDE}\n\n${COMMUNICATION_STYLE_GUIDE}\n\nReturn only the required structured JSON.`,
      },
      {
        role: "user",
        content: `USER QUESTION (Sheng)\n${params.question}\n\nCANONICAL FACT\n${params.canonicalFact}\n\nCHATBOT'S ACTUAL RESPONSE\n${params.response}\n\nEvaluate the response.`,
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

  let parsed: { verdict: string; naturalness_score: number; factual_drift: boolean; notes: string } | null = null;
  try {
    const json = JSON.parse(result.content);
    if (isValidCritiqueResult(json)) parsed = json;
  } catch {
    // fall through -- parsed stays null, recorded as a NULL verdict below
    // rather than a fabricated "unknown" string (chat_evaluations.critic_verdict
    // has the same natural/awkward/unnatural/unsafe CHECK constraint as
    // language_entries.critic_verdict, which only NULL satisfies here).
  }

  return {
    verdict: parsed?.verdict ?? null,
    naturalnessScore: parsed?.naturalness_score ?? null,
    factualDrift: parsed?.factual_drift ?? null,
    notes: parsed?.notes ?? null,
    costUsd: result.estimatedCostUsd,
  };
}

async function main() {
  const gateway = createGateway();

  const { rows } = await pool.query<EvalRow>(
    `SELECT le.id, le.utterance AS question, ke.id AS concept_knowledge_id, ke.canonical_answer
     FROM language_entries le
     JOIN dataset_generations dg ON dg.id = le.generation_id
     JOIN knowledge_entries ke ON ke.id = dg.concept_knowledge_id
     WHERE dg.campaign_id = $1 AND le.intent IS NOT NULL
     ORDER BY le.created_at`,
    [CAMPAIGN_ID],
  );

  if (rows.length === 0) {
    console.log(`No L05 questions found for campaign ${CAMPAIGN_ID} (nothing to evaluate).`);
    await pool.end();
    return;
  }

  console.log(`Evaluating ${rows.length} generated Sheng questions from ${CAMPAIGN_ID} against the live chat pipeline...\n`);

  let evaluated = 0;
  let fallbackCount = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;
  const responseVerdicts: Record<string, number> = {};
  let responseFactualDriftCount = 0;

  for (const row of rows) {
    if (await budgetExceeded()) {
      console.log(`Budget cap ($${MAX_BUDGET_USD}) reached — stopping eval early (${evaluated}/${rows.length} done)`);
      break;
    }

    const retrieval = await retrieveKnowledge(row.question);
    const promptMessages = buildPrompt({
      languageMode: "sheng",
      explanationLevel: "normal",
      retrieval,
      conversationHistory: [],
      userMessage: row.question,
    });

    let content: string;
    let usedFallback = false;
    let provider = "none";
    let model = "none";
    let latencyMs: number | null = null;
    try {
      const requestId = crypto.randomUUID();
      const chat = await withRetry(() =>
        gateway.chat({
          requestId,
          messages: promptMessages,
          languageMode: "sheng",
          explanationLevel: "normal",
          modelProfile: selectModelProfile("sheng", "normal"),
          maxOutputTokens: 800, // matches chatService.ts -- the profile's own ceiling, not this, is what actually governs each model
          temperature: 0.3,
          privacyProfile: "strict",
        }),
      );
      content = chat.content;
      provider = chat.provider;
      model = chat.model;
      latencyMs = chat.latencyMs;
    } catch (err) {
      usedFallback = true;
      content =
        retrieval[0]?.authoritativeContent ??
        "I'm having trouble reaching the AI service right now, and I don't have a saved answer for this question.";
      console.log(`  [fallback] ${row.question.slice(0, 60)}... -> ${err instanceof Error ? err.message : String(err)}`);
    }

    const confidence = retrieval[0]?.confidence ?? null;
    if (confidence !== null) {
      confidenceSum += confidence;
      confidenceCount++;
    }
    if (usedFallback) fallbackCount++;

    // A rate-limit/timeout on the scoring call must not crash the whole
    // eval -- same reasoning as reviewCandidate() in runCampaign.ts. Record
    // the eval row with null critic fields rather than losing the chat
    // response (and the real API cost of producing it) entirely.
    let score: Awaited<ReturnType<typeof scoreResponse>> = {
      verdict: null,
      naturalnessScore: null,
      factualDrift: null,
      notes: null,
      costUsd: null,
    };
    try {
      score = await withRetry(() => scoreResponse(gateway, { question: row.question, response: content, canonicalFact: row.canonical_answer }));
    } catch (err) {
      console.log(`  [scoring skipped] ${row.question.slice(0, 50)}... -> ${err instanceof Error ? err.message : String(err)}`);
    }
    const verdictKey = score.verdict ?? "schema_invalid";
    responseVerdicts[verdictKey] = (responseVerdicts[verdictKey] ?? 0) + 1;
    if (score.factualDrift) responseFactualDriftCount++;

    await pool.query(
      `INSERT INTO chat_evaluations
        (campaign_id, language_entry_id, concept_knowledge_id, question, chat_response, model_profile, provider, model,
         retrieval_confidence, used_fallback, latency_ms, critic_verdict, critic_naturalness_score, critic_factual_drift, critic_notes, cost_usd)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        CAMPAIGN_ID,
        row.id,
        row.concept_knowledge_id,
        row.question,
        content,
        selectModelProfile("sheng", "normal"),
        provider,
        model,
        confidence,
        usedFallback,
        latencyMs,
        score.verdict,
        score.naturalnessScore,
        score.factualDrift,
        score.notes,
        score.costUsd,
      ],
    );

    evaluated++;
    console.log(
      `  "${row.question.slice(0, 50)}..." -> confidence=${confidence?.toFixed(2) ?? "n/a"} fallback=${usedFallback} response_verdict=${verdictKey} (${score.naturalnessScore ?? "n/a"}/5) drift=${score.factualDrift ?? "n/a"}`,
    );

    await new Promise((r) => setTimeout(r, PACING_DELAY_MS));
  }

  const finalCost = await getCampaignSpend(CAMPAIGN_ID);
  console.log(`\n=== Eval complete: ${evaluated}/${rows.length} questions ===`);
  console.log(`Retrieval: avg confidence ${confidenceCount > 0 ? (confidenceSum / confidenceCount).toFixed(3) : "n/a"}, fallback rate ${((fallbackCount / evaluated) * 100).toFixed(1)}%`);
  console.log(`Response verdicts:`, responseVerdicts);
  console.log(`Responses with factual drift: ${responseFactualDriftCount}/${evaluated}`);
  console.log(`Total campaign spend (generation+critic+judge+eval): $${finalCost.toFixed(4)}`);

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
});
