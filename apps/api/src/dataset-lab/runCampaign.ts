import { pool } from "../db/pool.js";
import { createGateway } from "../gateway/registry.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { buildL04Prompt, buildL05Prompt, PROMPT_VERSIONS } from "./promptTemplates.js";
import { generateCandidates, persistAcceptedCandidates, type GenerateCandidatesParams } from "./generate.js";
import { critiqueCandidate } from "./critique.js";

/**
 * Batch 002 (Architecture doc §22): expanded from the Batch 001 pilot
 * (3 concepts) to all available canonical concepts, with a real enforced
 * budget cap (doc §28 — "never allow an autonomous generation loop with an
 * unrestricted API key") and a sampled critic pass (doc §9/§10 — Terra
 * reviews a sample, not every row).
 *
 * Run with: pnpm --filter @afribit/api exec tsx src/dataset-lab/runCampaign.ts
 */

const CAMPAIGN_ID = "batch_2026_09_002";
const CANDIDATES_PER_CALL = 5;
const MAX_BUDGET_USD = 2.0;
const CRITIC_SAMPLE_RATE = 0.25; // doc §10 example: critique a sample, not everything

interface LayerCallResult {
  generated: number;
  inserted: number;
  cost: number;
  insertedIds: string[];
}

let runningCost = 0;

function budgetExceeded(): boolean {
  return runningCost >= MAX_BUDGET_USD;
}

async function runLayerCall(
  gateway: AfribitAIGateway,
  label: string,
  params: GenerateCandidatesParams,
  persistArgs: { style: "sheng" | "swahili" | "simple_en" | "mixed_ke"; intent: string | null; concept: string },
): Promise<LayerCallResult> {
  if (budgetExceeded()) {
    console.log(`${label}: SKIPPED — campaign budget ($${MAX_BUDGET_USD}) reached`);
    return { generated: 0, inserted: 0, cost: 0, insertedIds: [] };
  }
  try {
    const result = await generateCandidates(gateway, params);
    const persisted = await persistAcceptedCandidates({ generationId: result.generationId, texts: result.acceptedTexts, ...persistArgs });
    const cost = result.costUsd ?? 0;
    runningCost += cost;
    console.log(
      `${label}: ${result.parsedCount} generated, ${result.acceptedCount} passed checks, ${persisted.count} inserted, cost $${cost.toFixed(5)} (running total $${runningCost.toFixed(4)})`,
    );
    return { generated: result.parsedCount, inserted: persisted.count, cost, insertedIds: persisted.ids };
  } catch (err) {
    console.log(`${label}: FAILED — ${err instanceof Error ? err.message : String(err)}`);
    const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
    if (cause instanceof Error) console.log(`  cause: ${cause.message}`);
    return { generated: 0, inserted: 0, cost: 0, insertedIds: [] };
  }
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
    [CAMPAIGN_ID, `Batch 002 — L04 + L05, ${concepts.length} concepts`, PROMPT_VERSIONS.L04_SHENG_REWRITE, CANDIDATES_PER_CALL, MAX_BUDGET_USD],
  );

  const allInsertedIds: { id: string; text: string; canonicalFact: string }[] = [];
  let totalGenerated = 0;
  let totalAccepted = 0;

  for (const concept of concepts) {
    if (budgetExceeded()) {
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
    l04.insertedIds.forEach((id) => allInsertedIds.push({ id, text: "", canonicalFact: concept.canonical_answer }));

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

    totalGenerated += l04.generated + l05.generated;
    totalAccepted += l04.inserted + l05.inserted;
  }

  // Sampled critic pass — only on L04 (fact-grounded) candidates, since
  // factual_drift only makes sense against a canonical fact; L05 questions
  // have no fact to drift from.
  console.log(`\n=== Critic sampling (${(CRITIC_SAMPLE_RATE * 100).toFixed(0)}% of L04 candidates) ===`);
  const sampleSize = Math.ceil(allInsertedIds.length * CRITIC_SAMPLE_RATE);
  const sample = allInsertedIds.sort(() => Math.random() - 0.5).slice(0, sampleSize);

  let criticCost = 0;
  const verdicts: Record<string, number> = {};
  for (const item of sample) {
    if (budgetExceeded()) {
      console.log("Budget cap reached — stopping critic pass early");
      break;
    }
    const { rows } = await pool.query<{ utterance: string }>(`SELECT utterance FROM language_entries WHERE id = $1`, [item.id]);
    const text = rows[0]?.utterance;
    if (!text) continue;
    const result = await critiqueCandidate(gateway, {
      campaignId: CAMPAIGN_ID,
      languageEntryId: item.id,
      candidateText: text,
      canonicalFact: item.canonicalFact,
    });
    criticCost += result.costUsd ?? 0;
    runningCost += result.costUsd ?? 0;
    verdicts[result.verdict] = (verdicts[result.verdict] ?? 0) + 1;
    console.log(`  "${text.slice(0, 60)}..." -> ${result.verdict} (naturalness ${result.naturalnessScore}/5, factual_drift=${result.factualDrift})`);
  }

  await pool.query(`UPDATE dataset_campaigns SET status = 'completed', completed_at = now() WHERE id = $1`, [CAMPAIGN_ID]);

  console.log(`\n=== Batch 002 complete ===`);
  console.log(`Concepts processed: ${concepts.length}`);
  console.log(`Total candidates generated: ${totalGenerated}`);
  console.log(`Total accepted into language_entries: ${totalAccepted}`);
  console.log(`Critic sample size: ${sample.length}, cost: $${criticCost.toFixed(5)}`);
  console.log(`Critic verdicts:`, verdicts);
  console.log(`Total campaign cost: $${runningCost.toFixed(4)} (budget cap was $${MAX_BUDGET_USD})`);
  console.log(`Cost per accepted example: $${totalAccepted > 0 ? (runningCost / totalAccepted).toFixed(5) : "n/a"}`);

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.query(`UPDATE dataset_campaigns SET status = 'paused' WHERE id = $1`, [CAMPAIGN_ID]).catch(() => {});
  await pool.end().catch(() => {});
  process.exit(1);
});
