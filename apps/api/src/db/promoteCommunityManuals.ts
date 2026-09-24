import { pool } from "./pool.js";

/**
 * Promotes the two community-reviewed manuals (Bitcoin Basics,
 * Communication Skills) from draft/needs_language_review to approved,
 * following the product owner's report that both were presented to and
 * validated by the community as their first approved version
 * (2026-09-23). This is a human-review decision recorded in code, not an
 * AI self-certification of its own content -- see docs/adr/0005 and
 * docs/COMMUNICATION_STYLE_EVAL.md's "AI must never certify its own
 * synthetic output as authentic" rule, which applies equally to skipping
 * a real human review step.
 *
 * knowledge_entries: needs_language_review -> published (PRD §11.3 --
 * only approved/published are ever used as retrieval context; this is
 * genuinely the same admin action POST /api/v1/admin/knowledge/:id/publish
 * performs, just applied in bulk to a reviewed batch instead of one at a
 * time).
 *
 * language_entries: draft/L2_community_collected/allowed_for_rag=false ->
 * approved/L3_afribit_reviewed/allowed_for_rag=true, afribit_reviewed=true.
 * allowed_for_evaluation also flips true (lower risk, useful for future
 * eval work). allowed_for_training is deliberately LEFT FALSE -- training/
 * fine-tuning is a separate, bigger commitment (redistribution, model
 * weights) the community-review report didn't address, so it stays gated
 * pending an explicit separate decision, per docs/LANGUAGE_CORPUS.md's
 * conservative-by-default rule (each allowed_for_* flag needs its own
 * explicit yes, not a blanket "reviewed = everything unlocked").
 *
 * Run with: pnpm --filter @afribit/api exec tsx src/db/promoteCommunityManuals.ts
 */

const REVIEWED_BY = "community_review_2026_09_23";

async function main(): Promise<void> {
  const ke = await pool.query(
    `UPDATE knowledge_entries
     SET status = 'published', reviewed_by = $1, reviewed_at = now(), valid_from = now(), updated_at = now()
     WHERE status = 'needs_language_review' AND (id LIKE 'btcman.%' OR id LIKE 'commman.%')
     RETURNING id`,
    [REVIEWED_BY],
  );

  for (const row of ke.rows as { id: string }[]) {
    await pool.query(
      `INSERT INTO audit_logs (actor, action, entity_type, entity_id) VALUES ($1, 'publish', 'knowledge_entry', $2)`,
      [REVIEWED_BY, row.id],
    );
  }

  const le = await pool.query(
    `UPDATE language_entries
     SET status = 'approved', corpus_layer = 'L3_afribit_reviewed', afribit_reviewed = true,
         allowed_for_rag = true, allowed_for_evaluation = true, last_validated_at = now()
     WHERE source_context LIKE 'afribit_manual:%' AND corpus_layer = 'L2_community_collected'
     RETURNING id`,
  );

  console.log(`Promoted ${ke.rowCount} knowledge_entries to 'published' (reviewed_by='${REVIEWED_BY}').`);
  console.log(`Promoted ${le.rowCount} language_entries to 'approved' / L3_afribit_reviewed / allowed_for_rag=true.`);
  console.log(`allowed_for_training left FALSE on all rows -- separate decision, not covered by this promotion.`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
