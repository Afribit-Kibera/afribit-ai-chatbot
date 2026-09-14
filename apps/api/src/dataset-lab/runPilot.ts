import { pool } from "../db/pool.js";
import { createGateway } from "../gateway/registry.js";
import type { AfribitAIGateway } from "../gateway/gateway.js";
import { buildL04Prompt, buildL05Prompt, PROMPT_VERSIONS } from "./promptTemplates.js";
import { generateCandidates, persistAcceptedCandidates, type GenerateCandidatesParams } from "./generate.js";

interface LayerCallResult {
  generated: number;
  inserted: number;
  cost: number;
}

/**
 * One generator call, tolerant of failure — a single flaky/refused request
 * should not abort an entire campaign (doc's "budget controls" / "emergency
 * stop" spirit: fail the one call, keep going, surface it in the report).
 */
async function runLayerCall(
  gateway: AfribitAIGateway,
  label: string,
  params: GenerateCandidatesParams,
  persistArgs: { style: "sheng" | "swahili" | "simple_en" | "mixed_ke"; intent: string | null; concept: string },
): Promise<LayerCallResult> {
  try {
    const result = await generateCandidates(gateway, params);
    const inserted = await persistAcceptedCandidates({ generationId: result.generationId, texts: result.acceptedTexts, ...persistArgs });
    console.log(
      `${label}: ${result.parsedCount} generated, ${result.acceptedCount} passed checks, ${inserted} inserted, cost $${(result.costUsd ?? 0).toFixed(5)}`,
    );
    result.acceptedTexts.forEach((t) => console.log(`  - ${t}`));
    return { generated: result.parsedCount, inserted, cost: result.costUsd ?? 0 };
  } catch (err) {
    console.log(`${label}: FAILED — ${err instanceof Error ? err.message : String(err)}`);
    const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
    if (cause instanceof Error) {
      console.log(`  cause: ${cause.message}`);
      const innerCause = (cause as { cause?: unknown }).cause;
      if (innerCause instanceof Error) console.log(`  inner cause: ${innerCause.message}`);
    }
    return { generated: 0, inserted: 0, cost: 0 };
  }
}

/**
 * Batch 001 pilot (Architecture doc §21), deliberately narrow per the doc's
 * own repeated advice — "run a small sample before a large campaign,"
 * "start with only 10 concepts." This runs 3 concepts x 2 layers (L04
 * Sheng rewrite, L05 user utterances) x 5 candidates = 30 generation
 * targets, using the existing OPENROUTER_API_KEY (no dedicated budgeted
 * key per doc §33 step 1-2 — the user explicitly chose to use the existing
 * key for this first pass). At Luna pricing this should cost well under
 * $0.05 total.
 *
 * Run with: pnpm --filter @afribit/api exec tsx src/dataset-lab/runPilot.ts
 */

const CAMPAIGN_ID = "pilot_2026_09_001";
const PILOT_CONCEPTS = [
  "btc.basics.what_is_bitcoin",
  "btc.basics.what_are_sats",
  "btc.wallets.what_is_a_wallet",
];
const CANDIDATES_PER_CALL = 5;

async function main() {
  const gateway = createGateway();

  const { rows: concepts } = await pool.query<{ id: string; title: string; canonical_answer: string }>(
    `SELECT id, title, canonical_answer FROM knowledge_entries WHERE id = ANY($1)`,
    [PILOT_CONCEPTS],
  );
  if (concepts.length === 0) {
    throw new Error("No matching knowledge_entries found — did you run `pnpm db:seed`?");
  }

  await pool.query(
    `INSERT INTO dataset_campaigns (id, name, layer, language, model_role, model_profile, prompt_version, examples_per_concept, max_budget_usd, status)
     VALUES ($1, 'Batch 001 pilot — L04 + L05, 3 concepts', 'L04_L05_PILOT', 'sheng', 'generator', 'dataset_generator', $2, $3, 0.20, 'running')
     ON CONFLICT (id) DO UPDATE SET status = 'running'`,
    [CAMPAIGN_ID, PROMPT_VERSIONS.L04_SHENG_REWRITE, CANDIDATES_PER_CALL],
  );

  let totalGenerated = 0;
  let totalAccepted = 0;
  let totalCost = 0;

  for (const concept of concepts) {
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
    totalCost += l04.cost + l05.cost;
  }

  await pool.query(`UPDATE dataset_campaigns SET status = 'completed', completed_at = now() WHERE id = $1`, [CAMPAIGN_ID]);

  console.log(`\n=== Batch 001 pilot complete ===`);
  console.log(`Concepts: ${concepts.length}`);
  console.log(`Total candidates generated: ${totalGenerated}`);
  console.log(`Total accepted into language_entries: ${totalAccepted}`);
  console.log(`Total cost: $${totalCost.toFixed(5)}`);

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.query(`UPDATE dataset_campaigns SET status = 'paused' WHERE id = $1`, [CAMPAIGN_ID]).catch(() => {});
  await pool.end().catch(() => {});
  process.exit(1);
});
