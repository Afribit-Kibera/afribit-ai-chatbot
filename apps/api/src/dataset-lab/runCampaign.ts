import { pool } from "../db/pool.js";
import { createGateway } from "../gateway/registry.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { getCampaignSpend } from "./budget.js";
import { buildL04Prompt, buildL05Prompt, PROMPT_VERSIONS } from "./promptTemplates.js";
import { generateCandidates, persistAcceptedCandidates, type GenerateCandidatesParams } from "./generate.js";
import { critiqueCandidate, critiqueQuestion } from "./critique.js";
import { judgeCandidate } from "./judge.js";

/**
 * Batch 003 (Architecture doc §22): same generator->critic->judge->human
 * pipeline as Batch 002, expanded per the product owner's explicit request
 * to push volume and get full use out of the live API budget --
 * CANDIDATES_PER_CALL raised 5->8, critic coverage raised 25%->100% and
 * extended to L05 (previously L04-only), and the judge (Sol) role -- wired
 * up but never invoked in Batch 001/002 -- now adjudicates anything the
 * critic doesn't call "natural". Also adds retry-with-backoff, since
 * Batch 002's notes recorded heavy rate-limiting on the shared Luna tier
 * that a real generation run has to tolerate, not just log around.
 *
 * Run with: pnpm --filter @afribit/api exec tsx src/dataset-lab/runCampaign.ts
 */

const CAMPAIGN_ID = "batch_2026_09_003";
const CANDIDATES_PER_CALL = 8;
const MAX_BUDGET_USD = 10.0;
const RETRY_DELAYS_MS = [1000, 3000, 8000]; // 3 retries, exponential-ish backoff

interface LayerCallResult {
  generated: number;
  inserted: number;
  cost: number;
  insertedIds: string[];
}

async function budgetExceeded(): Promise<boolean> {
  return (await getCampaignSpend(CAMPAIGN_ID)) >= MAX_BUDGET_USD;
}

function isRetryable(err: unknown): boolean {
  // GatewayError wraps the real provider failure in `.cause` (see
  // gateway/gateway.ts) -- the rate-limit/HTTP-status detail this needs to
  // match on lives there, not in GatewayError's own generic top-level
  // message ("Primary model failed and no fallback is configured").
  const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
  const msg = [err, cause]
    .filter((e): e is Error => e instanceof Error)
    .map((e) => e.message)
    .join(" | ");
  return /\((429|500|502|503|504|529)\)/.test(msg) || /rate.?limit/i.test(msg) || /timed out/i.test(msg);
}

/**
 * Retries the whole generate-and-persist step on transient failures
 * (rate limits, gateway timeouts) AND on the known "schema-valid-but-empty
 * examples" failure mode the architecture doc flagged for L04 -- neither
 * is worth failing a whole concept over when a retry is cheap.
 */
async function runLayerCall(
  gateway: AfribitAIGateway,
  label: string,
  params: GenerateCandidatesParams,
  persistArgs: { style: "sheng" | "swahili" | "simple_en" | "mixed_ke"; intent: string | null; concept: string },
): Promise<LayerCallResult> {
  if (await budgetExceeded()) {
    console.log(`${label}: SKIPPED — campaign budget ($${MAX_BUDGET_USD}) reached`);
    return { generated: 0, inserted: 0, cost: 0, insertedIds: [] };
  }

  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length + 1; attempt++) {
    try {
      const result = await generateCandidates(gateway, params);
      if (result.parsedCount === 0 && attempt <= RETRY_DELAYS_MS.length) {
        console.log(`${label}: attempt ${attempt} parsed 0 examples — retrying`);
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
        continue;
      }
      const persisted = await persistAcceptedCandidates({ generationId: result.generationId, texts: result.acceptedTexts, ...persistArgs });
      const cost = result.costUsd ?? 0;
      console.log(
        `${label}: ${result.parsedCount} generated, ${result.acceptedCount} passed checks, ${persisted.count} inserted, cost $${cost.toFixed(5)}`,
      );
      return { generated: result.parsedCount, inserted: persisted.count, cost, insertedIds: persisted.ids };
    } catch (err) {
      const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
      const msg = err instanceof Error ? err.message : String(err);
      if (isRetryable(err) && attempt <= RETRY_DELAYS_MS.length) {
        console.log(`${label}: attempt ${attempt} failed (${msg.slice(0, 120)}) — retrying in ${RETRY_DELAYS_MS[attempt - 1]}ms`);
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
        continue;
      }
      console.log(`${label}: FAILED — ${msg}`);
      if (cause instanceof Error) console.log(`  cause: ${cause.message}`);
      return { generated: 0, inserted: 0, cost: 0, insertedIds: [] };
    }
  }
  return { generated: 0, inserted: 0, cost: 0, insertedIds: [] };
}

async function main() {
  const gateway = createGateway();

  const { rows: concepts } = await pool.query<{ id: string; title: string; canonical_answer: string }>(
    `SELECT id, title, canonical_answer FROM knowledge_entries WHERE status = 'published' ORDER BY id`,
  );
  if (concepts.length === 0) throw new Error("No published knowledge_entries found — run `pnpm db:seed` first.");

  await pool.query(
    `INSERT INTO dataset_campaigns (id, name, layer, language, model_role, model_profile, prompt_version, examples_per_concept, max_budget_usd, status)
     VALUES ($1, $2, 'L04_L05_BATCH', 'sheng', 'generator', 'dataset_generator', $3, $4, $5, 'running')
     ON CONFLICT (id) DO UPDATE SET status = 'running'`,
    [CAMPAIGN_ID, `Batch 003 — L04 + L05, ${concepts.length} concepts, full critic + judge escalation`, PROMPT_VERSIONS.L04_SHENG_REWRITE, CANDIDATES_PER_CALL, MAX_BUDGET_USD],
  );

  let totalGenerated = 0;
  let totalAccepted = 0;
  let totalGenCost = 0;
  let totalCriticCost = 0;
  let totalJudgeCost = 0;
  const criticVerdicts: Record<string, number> = {};
  const judgeVerdicts: Record<string, number> = {};
  let judgeCalls = 0;

  /**
   * Critic every accepted candidate (100% coverage), then escalate to the
   * judge if the critic didn't call it "natural". A single rate-limit/
   * timeout here must never crash the whole campaign -- generation for
   * every other concept already succeeded and paid real API cost; losing
   * that to an uncaught exception over one missed review would be worse
   * than just skipping this one review and moving on.
   */
  async function reviewCandidate(id: string, text: string, concept: string, canonicalFact: string | null): Promise<void> {
    if (await budgetExceeded()) return;
    try {
      const critic = canonicalFact
        ? await critiqueCandidate(gateway, { campaignId: CAMPAIGN_ID, languageEntryId: id, candidateText: text, canonicalFact })
        : await critiqueQuestion(gateway, { campaignId: CAMPAIGN_ID, languageEntryId: id, candidateText: text, concept });
      totalCriticCost += critic.costUsd ?? 0;
      criticVerdicts[critic.verdict] = (criticVerdicts[critic.verdict] ?? 0) + 1;
      console.log(`    critic: "${text.slice(0, 55)}..." -> ${critic.verdict} (naturalness ${critic.naturalnessScore}/5, factual_drift=${critic.factualDrift})`);

      if (critic.verdict !== "natural" || critic.factualDrift) {
        if (await budgetExceeded()) return;
        judgeCalls++;
        const judge = await judgeCandidate(gateway, {
          campaignId: CAMPAIGN_ID,
          languageEntryId: id,
          candidateText: text,
          concept,
          canonicalFact,
          criticVerdict: critic.verdict,
          criticFactualDrift: critic.factualDrift,
        });
        totalJudgeCost += judge.costUsd ?? 0;
        judgeVerdicts[judge.verdict] = (judgeVerdicts[judge.verdict] ?? 0) + 1;
        console.log(`    judge (escalated): -> ${judge.verdict} (naturalness ${judge.naturalnessScore}/5, factual_drift=${judge.factualDrift})`);
      }
    } catch (err) {
      console.log(`    review SKIPPED for "${text.slice(0, 40)}..." — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  for (const concept of concepts) {
    if (await budgetExceeded()) {
      console.log(`\nBudget cap ($${MAX_BUDGET_USD}) reached — stopping before ${concept.id}`);
      break;
    }
    console.log(`\n=== ${concept.id} ===`);
    const intent = concept.id.replace(/^btc\./, "").replace(/\./g, "_");

    const l04 = await runLayerCall(
      gateway,
      "L04 sheng rewrite",
      {
        campaignId: CAMPAIGN_ID,
        conceptKnowledgeId: concept.id,
        modelProfile: "dataset_generator",
        modelRole: "generator",
        promptVersion: PROMPT_VERSIONS.L04_SHENG_REWRITE,
        messages: buildL04Prompt({ canonicalFact: concept.canonical_answer, concept: concept.title, count: CANDIDATES_PER_CALL }),
        canonicalFactForNumberCheck: concept.canonical_answer,
      },
      { style: "sheng", intent: null, concept: concept.title },
    );
    totalGenCost += l04.cost;
    for (const insertedId of l04.insertedIds) {
      // texts aren't returned from persistAcceptedCandidates — re-fetch for the critic pass.
      const { rows } = await pool.query<{ utterance: string }>(`SELECT utterance FROM language_entries WHERE id = $1`, [insertedId]);
      if (rows[0]) await reviewCandidate(insertedId, rows[0].utterance, concept.title, concept.canonical_answer);
    }

    const l05 = await runLayerCall(
      gateway,
      "L05 user utterances",
      {
        campaignId: CAMPAIGN_ID,
        conceptKnowledgeId: concept.id,
        modelProfile: "dataset_generator",
        modelRole: "generator",
        promptVersion: PROMPT_VERSIONS.L05_USER_UTTERANCES,
        messages: buildL05Prompt({ canonicalFact: concept.canonical_answer, concept: concept.title, intent, count: CANDIDATES_PER_CALL }),
      },
      { style: "sheng", intent, concept: concept.title },
    );
    totalGenCost += l05.cost;
    for (const insertedId of l05.insertedIds) {
      const { rows } = await pool.query<{ utterance: string }>(`SELECT utterance FROM language_entries WHERE id = $1`, [insertedId]);
      if (rows[0]) await reviewCandidate(insertedId, rows[0].utterance, concept.title, null);
    }

    totalGenerated += l04.generated + l05.generated;
    totalAccepted += l04.inserted + l05.inserted;
  }

  await pool.query(`UPDATE dataset_campaigns SET status = 'completed', completed_at = now() WHERE id = $1`, [CAMPAIGN_ID]);

  const runningCost = await getCampaignSpend(CAMPAIGN_ID);
  console.log(`\n=== Batch 003 complete ===`);
  console.log(`Concepts processed: ${concepts.length}`);
  console.log(`Total candidates generated: ${totalGenerated}`);
  console.log(`Total accepted into language_entries: ${totalAccepted}`);
  console.log(`Critic verdicts (100% coverage):`, criticVerdicts);
  console.log(`Judge calls (escalated, non-natural critic verdicts): ${judgeCalls}`, judgeVerdicts);
  console.log(`Generation cost: $${totalGenCost.toFixed(4)} | Critic cost: $${totalCriticCost.toFixed(4)} | Judge cost: $${totalJudgeCost.toFixed(4)}`);
  console.log(`Total campaign cost so far: $${runningCost.toFixed(4)} (budget cap $${MAX_BUDGET_USD})`);
  console.log(`Cost per accepted example: $${totalAccepted > 0 ? (runningCost / totalAccepted).toFixed(5) : "n/a"}`);

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.query(`UPDATE dataset_campaigns SET status = 'paused' WHERE id = $1`, [CAMPAIGN_ID]).catch(() => {});
  await pool.end().catch(() => {});
  process.exit(1);
});
