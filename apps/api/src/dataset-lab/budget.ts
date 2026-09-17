import { pool } from "../db/pool.js";

/**
 * One budget ceiling per campaign, shared across every phase that spends
 * against it (generator, critic, judge, and the live chat eval in
 * runEval.ts) even though those phases run as separate script invocations.
 * Reads the running total back from the DB rather than trusting in-memory
 * state, so re-running a phase after an earlier one exits never blows past
 * the cap.
 */
export async function getCampaignSpend(campaignId: string): Promise<number> {
  const [generations, evaluations] = await Promise.all([
    pool.query<{ total: string | null }>(
      `SELECT SUM(cost_usd)::float AS total FROM dataset_generations WHERE campaign_id = $1`,
      [campaignId],
    ),
    pool.query<{ total: string | null }>(
      `SELECT SUM(cost_usd)::float AS total FROM chat_evaluations WHERE campaign_id = $1`,
      [campaignId],
    ),
  ]);
  return Number(generations.rows[0]?.total ?? 0) + Number(evaluations.rows[0]?.total ?? 0);
}
