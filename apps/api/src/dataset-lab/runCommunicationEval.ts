import { randomUUID } from "node:crypto";
import { pool } from "../db/pool.js";
import { selectModelProfile } from "../chat/chatService.js";
import { createGateway } from "../gateway/registry.js";
import { buildPrompt } from "../prompt/promptBuilder.js";
import { COMMUNICATION_STYLE_GUIDE } from "../prompt/communicationStyleGuide.js";
import { COMMUNICATION_EVAL_CASES, type CommunicationEvalCase } from "./communicationEvalCases.js";
import { communicationRubricSchema, isValidCommunicationRubricResult, type CommunicationRubricResult } from "./schemas.js";

/**
 * Live counterpart to promptGoldenCases.ts: calls the REAL gateway (real
 * model, real cost) against the same COMMUNICATION_EVAL_CASES, then scores
 * each response with a judge model against Communication Skills chapter
 * 24's own rubric (communicationRubricSchema) rather than checking prompt
 * text for known strings. This is what confirms the prompt-design fixes
 * in docs/COMMUNICATION_STYLE_EVAL.md hold with actual generation, not
 * just in the manually-drafted responses that first pass critiqued.
 *
 * Persists to chat_evaluations under its own dataset_campaigns row
 * (model_role='judge' -- this campaign's output is rubric judgments, not
 * generated training candidates) so results are queryable/auditable the
 * same way runEval.ts's campaign-based evals are, without mixing into
 * real user chat_sessions/chat_messages.
 *
 * Run with: pnpm --filter @afribit/api exec tsx src/dataset-lab/runCommunicationEval.ts
 */

const CAMPAIGN_ID = "communication_eval_2026_09_23";
const HARD_FAIL_LEVEL = new Set<string>(["needs_practice"]);
// runEval.ts added this same delay after finding that firing many chat
// calls back-to-back with no pacing pushes default_chat into rate
// limiting on the shared OpenRouter tier -- confirmed recurring here too
// (2026-09-23, 10-case expanded run): 4/10 cases hit "Request timed out
// after 15000ms" on the primary model and silently fell back, all in
// this unpaced script; see docs/COMMUNICATION_STYLE_EVAL.md.
const PACING_DELAY_MS = 400;

async function ensureCampaign(): Promise<void> {
  await pool.query(
    `INSERT INTO dataset_campaigns (id, name, layer, language, model_role, model_profile, prompt_version, status)
     VALUES ($1, $2, 'COMMUNICATION_EVAL', NULL, 'judge', 'dataset_critic', 'communication-rubric-v1', 'running')
     ON CONFLICT (id) DO UPDATE SET status = 'running'`,
    [CAMPAIGN_ID, `Communication style eval — ${COMMUNICATION_EVAL_CASES.length} hand-curated cases scored against ch24 rubric`],
  );
}

async function scoreAgainstRubric(
  gateway: ReturnType<typeof createGateway>,
  params: { userMessage: string; response: string; canonicalFact: string },
): Promise<{ result: CommunicationRubricResult | null; costUsd: number | null }> {
  const requestId = randomUUID();
  const result = await gateway.chat({
    requestId,
    messages: [
      {
        role: "system",
        content:
          `ROLE\nYou are a quality judge for Afribit AI, a Bitcoin/communication education chatbot for Kibera/Nairobi. You are shown a real user message and the chatbot's ACTUAL RESPONSE. Score the response, not the question, against the rubric below -- adapted directly from the Afribit communication-skills manual's own chapter-24 scoring rubric for a communication skill (originally written to score a learner; here it scores the chatbot's response).\n\n${COMMUNICATION_STYLE_GUIDE}\n\nReturn only the required structured JSON.`,
      },
      {
        role: "user",
        content: `USER MESSAGE\n${params.userMessage}\n\nGROUNDING FACT SUPPLIED TO THE CHATBOT\n${params.canonicalFact}\n\nCHATBOT'S ACTUAL RESPONSE\n${params.response}\n\nScore the response.`,
      },
    ],
    languageMode: "mixed_ke",
    explanationLevel: "normal",
    modelProfile: "dataset_critic",
    maxOutputTokens: 400,
    temperature: 0.2,
    privacyProfile: "strict",
    responseFormat: { name: "communication_rubric_result", schema: communicationRubricSchema },
  });

  let parsed: CommunicationRubricResult | null = null;
  try {
    const json = JSON.parse(result.content);
    if (isValidCommunicationRubricResult(json)) parsed = json;
  } catch {
    // fall through -- parsed stays null, recorded as schema_invalid below
  }

  return { result: parsed, costUsd: result.estimatedCostUsd };
}

async function main() {
  const gateway = createGateway();
  await ensureCampaign();

  console.log(`Running ${COMMUNICATION_EVAL_CASES.length} live communication-style eval cases against the real gateway...\n`);

  let totalCostUsd = 0;
  let hardFailures = 0;
  let unsafeFlags = 0;

  for (const tc of COMMUNICATION_EVAL_CASES) {
    const promptMessages = buildPrompt({
      languageMode: tc.languageMode,
      explanationLevel: "normal",
      retrieval: tc.retrieval,
      conversationHistory: [],
      userMessage: tc.userMessage,
    });

    // A single transient timeout (chat or judge) must not lose every
    // remaining case's results -- same reasoning as runEval.ts's
    // withRetry/try-catch around scoreResponse(). Confirmed live
    // (2026-09-23): the judge call itself timed out mid-run and, before
    // this fix, the uncaught GatewayError crashed the whole script.
    let chat: Awaited<ReturnType<typeof gateway.chat>>;
    try {
      const requestId = randomUUID();
      chat = await gateway.chat({
        requestId,
        messages: promptMessages,
        languageMode: tc.languageMode,
        explanationLevel: "normal",
        modelProfile: selectModelProfile(tc.languageMode, "normal"),
        maxOutputTokens: 800,
        temperature: 0.3,
        privacyProfile: "strict",
      });
    } catch (err) {
      console.log(`\n[${tc.id}] SKIPPED -- chat call failed: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    totalCostUsd += chat.estimatedCostUsd ?? 0;

    const canonicalFact = tc.retrieval[0]?.authoritativeContent ?? "";
    let rubric: CommunicationRubricResult | null = null;
    let judgeCost: number | null = null;
    try {
      const scored = await scoreAgainstRubric(gateway, {
        userMessage: tc.userMessage,
        response: chat.content,
        canonicalFact,
      });
      rubric = scored.result;
      judgeCost = scored.costUsd;
    } catch (err) {
      console.log(`  [${tc.id}] judge call failed, recording chat response without a score: ${err instanceof Error ? err.message : String(err)}`);
    }
    totalCostUsd += judgeCost ?? 0;

    const conceptId = tc.retrieval[0]?.conceptId ?? null;
    const hardFail = rubric ? Object.entries(rubric).some(([k, v]) => k !== "notes" && k !== "unsafe_content" && HARD_FAIL_LEVEL.has(v as string)) : true;
    if (hardFail) hardFailures++;
    if (rubric?.unsafe_content) unsafeFlags++;

    await pool.query(
      `INSERT INTO chat_evaluations
        (campaign_id, concept_knowledge_id, question, chat_response, model_profile, provider, model,
         retrieval_confidence, used_fallback, latency_ms, critic_verdict, critic_naturalness_score, critic_factual_drift, critic_notes, cost_usd)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        CAMPAIGN_ID,
        conceptId,
        `[${tc.id}] ${tc.userMessage}`,
        chat.content,
        selectModelProfile(tc.languageMode, "normal"),
        chat.provider,
        chat.model,
        tc.retrieval[0]?.confidence ?? null,
        false,
        chat.latencyMs,
        rubric?.unsafe_content ? "unsafe" : hardFail ? "awkward" : "natural",
        null,
        null,
        rubric ? JSON.stringify(rubric) : "schema_invalid",
        (chat.estimatedCostUsd ?? 0) + (judgeCost ?? 0),
      ],
    );

    console.log(`\n${"=".repeat(80)}\nCASE ${tc.id} (mode=${tc.languageMode}, model=${chat.model})`);
    console.log(`USER: ${tc.userMessage}`);
    console.log(`\nRESPONSE:\n${chat.content}`);
    if (rubric) {
      console.log(
        `\nRUBRIC: clarity=${rubric.clarity} listening=${rubric.listening} register=${rubric.register} action=${rubric.action} safety=${rubric.safety} unsafe_content=${rubric.unsafe_content}`,
      );
      console.log(`NOTES: ${rubric.notes}`);
      console.log(hardFail ? "  RESULT: FAIL (needs_practice on at least one dimension)" : "  RESULT: PASS");
    } else {
      console.log("  RESULT: FAIL (judge response failed schema validation)");
    }

    await new Promise((r) => setTimeout(r, PACING_DELAY_MS));
  }

  await pool.query(`UPDATE dataset_campaigns SET status = 'completed', completed_at = now() WHERE id = $1`, [CAMPAIGN_ID]);

  console.log(`\n${"=".repeat(80)}`);
  console.log(`Eval complete: ${COMMUNICATION_EVAL_CASES.length} cases, ${hardFailures} hard failure(s), ${unsafeFlags} unsafe_content flag(s).`);
  console.log(`Total cost: $${totalCostUsd.toFixed(6)}`);
  console.log(`Results stored in chat_evaluations under campaign_id='${CAMPAIGN_ID}'.`);

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.query(`UPDATE dataset_campaigns SET status = 'paused' WHERE id = $1`, [CAMPAIGN_ID]).catch(() => {});
  await pool.end().catch(() => {});
  process.exit(1);
});
