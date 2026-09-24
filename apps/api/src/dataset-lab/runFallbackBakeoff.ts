import { randomUUID } from "node:crypto";
import { pool } from "../db/pool.js";
import { createGateway } from "../gateway/registry.js";
import { buildPrompt } from "../prompt/promptBuilder.js";
import { COMMUNICATION_STYLE_GUIDE } from "../prompt/communicationStyleGuide.js";
import { COMMUNICATION_EVAL_CASES } from "./communicationEvalCases.js";
import { communicationRubricSchema, isValidCommunicationRubricResult, type CommunicationRubricResult, type RubricLevel } from "./schemas.js";

/**
 * Empirical fallback-model bake-off (docs/COMMUNICATION_STYLE_EVAL.md
 * Finding 5): fallback_chat's old model (meta-llama/llama-3.1-8b-instruct)
 * was caught producing near-incoherent Kiswahili and a 3-line repetition
 * loop under real load. Rather than guess a replacement, this called each
 * candidate profile DIRECTLY (as if it were the primary, not via the
 * gateway's fallback path) against the exact same COMMUNICATION_EVAL_CASES
 * used for the main eval, scored every response with the same rubric
 * judge, and printed a ranked comparison.
 *
 * Result (2026-09-23): openai/gpt-4o-mini won clearly (1.75/2 avg score,
 * 0/4 hard failures) vs. the old model's 1.00/2 with 2/4 hard failures
 * and an outright error on one case. fallback_chat in
 * config/model-profiles.json now points at it. Full ranked results:
 * chat_evaluations WHERE campaign_id='fallback_bakeoff_2026_09_23'.
 *
 * NOTE: the `bakeoff_*` candidate profiles this script calls have been
 * removed from model-profiles.json now that a winner is picked (keeping
 * unused routing config around isn't worth it) -- this file is kept as a
 * record of the method and the CANDIDATES list, not as a script that
 * still runs as-is. To re-run a future bake-off (e.g. new model releases,
 * or re-litigating this choice), re-add `bakeoff_*` entries to
 * model-profiles.json for whatever candidates you want to compare, update
 * CANDIDATES below to match, and use a fresh CAMPAIGN_ID.
 *
 * Historical run command: pnpm --filter @afribit/api exec tsx src/dataset-lab/runFallbackBakeoff.ts
 */

const CAMPAIGN_ID = "fallback_bakeoff_2026_09_23";

const CANDIDATES = [
  { profile: "fallback_chat", label: "meta-llama/llama-3.1-8b-instruct (current)" },
  { profile: "bakeoff_gemini_flash_lite", label: "google/gemini-2.5-flash-lite" },
  { profile: "bakeoff_claude_haiku", label: "anthropic/claude-haiku-4.5" },
  { profile: "bakeoff_gpt4o_mini", label: "openai/gpt-4o-mini" },
  { profile: "bakeoff_deepseek_v3", label: "deepseek/deepseek-chat-v3.1" },
];

const LEVEL_SCORE: Record<RubricLevel, number> = { needs_practice: 0, developing: 1, ready: 2 };

async function ensureCampaign(): Promise<void> {
  await pool.query(
    `INSERT INTO dataset_campaigns (id, name, layer, language, model_role, model_profile, prompt_version, status)
     VALUES ($1, $2, 'FALLBACK_BAKEOFF', NULL, 'judge', 'dataset_critic', 'communication-rubric-v1', 'running')
     ON CONFLICT (id) DO UPDATE SET status = 'running'`,
    [CAMPAIGN_ID, `Fallback model bake-off — ${CANDIDATES.length} candidates x ${COMMUNICATION_EVAL_CASES.length} cases`],
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
          `ROLE\nYou are a quality judge for Afribit AI, a Bitcoin/communication education chatbot for Kibera/Nairobi. You are shown a real user message and the chatbot's ACTUAL RESPONSE. Score the response, not the question, against the rubric below -- adapted directly from the Afribit communication-skills manual's own chapter-24 scoring rubric.\n\n${COMMUNICATION_STYLE_GUIDE}\n\nReturn only the required structured JSON.`,
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
    // fall through -- parsed stays null
  }
  return { result: parsed, costUsd: result.estimatedCostUsd };
}

interface CandidateStats {
  label: string;
  profile: string;
  avgScore: number;
  hardFailures: number;
  unsafeFlags: number;
  schemaFailures: number;
  errors: number;
  avgLatencyMs: number;
  totalCostUsd: number;
}

async function main() {
  const gateway = createGateway();
  await ensureCampaign();

  const results: CandidateStats[] = [];

  for (const candidate of CANDIDATES) {
    console.log(`\n${"#".repeat(80)}\nCANDIDATE: ${candidate.label}  (profile: ${candidate.profile})\n${"#".repeat(80)}`);

    let scoreSum = 0;
    let scoreCount = 0;
    let hardFailures = 0;
    let unsafeFlags = 0;
    let schemaFailures = 0;
    let errors = 0;
    let latencySum = 0;
    let costSum = 0;

    for (const tc of COMMUNICATION_EVAL_CASES) {
      const promptMessages = buildPrompt({
        languageMode: tc.languageMode,
        explanationLevel: "normal",
        retrieval: tc.retrieval,
        conversationHistory: [],
        userMessage: tc.userMessage,
      });

      let content = "";
      let latencyMs = 0;
      let chatCost = 0;
      let model = candidate.profile;
      try {
        const requestId = randomUUID();
        const chat = await gateway.chat({
          requestId,
          messages: promptMessages,
          languageMode: tc.languageMode,
          explanationLevel: "normal",
          modelProfile: candidate.profile,
          maxOutputTokens: 800,
          temperature: 0.3,
          privacyProfile: "strict",
        });
        content = chat.content;
        latencyMs = chat.latencyMs;
        chatCost = chat.estimatedCostUsd ?? 0;
        model = chat.model;
      } catch (err) {
        errors++;
        console.log(`  [${tc.id}] ERROR: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      latencySum += latencyMs;
      costSum += chatCost;

      const canonicalFact = tc.retrieval[0]?.authoritativeContent ?? "";
      // A judge-call timeout must not crash the whole bake-off and lose
      // every remaining candidate's results (confirmed happening live in
      // runCommunicationEval.ts, 2026-09-23 -- same gap existed here).
      let rubric: CommunicationRubricResult | null = null;
      let judgeCost: number | null = null;
      try {
        const scored = await scoreAgainstRubric(gateway, {
          userMessage: tc.userMessage,
          response: content,
          canonicalFact,
        });
        rubric = scored.result;
        judgeCost = scored.costUsd;
      } catch (err) {
        console.log(`  [${tc.id}] judge call failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      costSum += judgeCost ?? 0;

      if (!rubric) {
        schemaFailures++;
        console.log(`  [${tc.id}] judge schema_invalid or failed -- response was: ${content.slice(0, 120)}...`);
        continue;
      }

      const levels: RubricLevel[] = [rubric.clarity, rubric.listening, rubric.register, rubric.action, rubric.safety];
      const caseScore = levels.reduce((sum, l) => sum + LEVEL_SCORE[l], 0) / levels.length;
      scoreSum += caseScore;
      scoreCount++;
      if (levels.some((l) => l === "needs_practice")) hardFailures++;
      if (rubric.unsafe_content) unsafeFlags++;

      await pool.query(
        `INSERT INTO chat_evaluations
          (campaign_id, question, chat_response, model_profile, provider, model,
           used_fallback, latency_ms, critic_verdict, critic_notes, cost_usd)
         VALUES ($1,$2,$3,$4,'openrouter',$5,false,$6,$7,$8,$9)`,
        [
          CAMPAIGN_ID,
          `[${candidate.profile}/${tc.id}] ${tc.userMessage}`,
          content,
          candidate.profile,
          model,
          latencyMs,
          rubric.unsafe_content ? "unsafe" : levels.some((l) => l === "needs_practice") ? "awkward" : "natural",
          JSON.stringify(rubric),
          chatCost + (judgeCost ?? 0),
        ],
      );

      console.log(
        `  [${tc.id}] score=${caseScore.toFixed(2)}/2 clarity=${rubric.clarity} listening=${rubric.listening} register=${rubric.register} action=${rubric.action} safety=${rubric.safety} unsafe=${rubric.unsafe_content} latency=${latencyMs}ms`,
      );
    }

    results.push({
      label: candidate.label,
      profile: candidate.profile,
      avgScore: scoreCount > 0 ? scoreSum / scoreCount : 0,
      hardFailures,
      unsafeFlags,
      schemaFailures,
      errors,
      avgLatencyMs: scoreCount + schemaFailures > 0 ? latencySum / (scoreCount + schemaFailures) : 0,
      totalCostUsd: costSum,
    });
  }

  await pool.query(`UPDATE dataset_campaigns SET status = 'completed', completed_at = now() WHERE id = $1`, [CAMPAIGN_ID]);

  console.log(`\n\n${"=".repeat(100)}\nBAKE-OFF RESULTS (ranked by avg rubric score, 0-2 scale across clarity/listening/register/action/safety)\n${"=".repeat(100)}`);
  const ranked = [...results].sort((a, b) => b.avgScore - a.avgScore || a.hardFailures - b.hardFailures);
  for (const r of ranked) {
    console.log(
      `${r.avgScore.toFixed(2)}/2  hard_fails=${r.hardFailures}/4  unsafe=${r.unsafeFlags}  schema_fail=${r.schemaFailures}  errors=${r.errors}  avg_latency=${r.avgLatencyMs.toFixed(0)}ms  cost=$${r.totalCostUsd.toFixed(5)}  -- ${r.label} (${r.profile})`,
    );
  }
  console.log(`\nResults stored in chat_evaluations under campaign_id='${CAMPAIGN_ID}'.`);

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.query(`UPDATE dataset_campaigns SET status = 'paused' WHERE id = $1`, [CAMPAIGN_ID]).catch(() => {});
  await pool.end().catch(() => {});
  process.exit(1);
});
