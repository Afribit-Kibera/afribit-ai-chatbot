import type { FastifyInstance } from "fastify";
import { getPack, getRegistry } from "../pack/active.js";
import { isKnownMode, modeErrorMessage } from "../pack/modes.js";
import { pool } from "../db/pool.js";

interface SubmitBody {
  utterance?: string;
  meaning?: string;
  intent?: string;
  style?: string;
  sourceContext?: string;
}

interface ReviewBody {
  decision?: "approve" | "reject" | "needs_changes";
  notes?: string;
}

interface VoteBody {
  naturalness?: number;
}

/**
 * ADR 0005 -- Microtasks is the human-feedback/community-language layer.
 * The DB schema for this already existed since 001_init.sql
 * (language_entries/language_reviews/language_votes) but nothing ever
 * read or wrote it over HTTP; every row in this codebase so far came from
 * internal seed scripts. This is the first real contribution surface.
 *
 * Everything here requires requireAuth (any signed-in contributor) --
 * not anonymous, unlike the main chat flow. Accountability matters
 * specifically for this pipeline: docs/adr/0005 and
 * docs/LANGUAGE_CORPUS.md are both explicit that unreviewed community
 * submissions can never auto-promote themselves into production content,
 * and that only means something if "who submitted/reviewed this" is a
 * real, verified identity, not a free-text field anyone can put anything
 * in (the same class of gap docs/SECURITY_AUDIT_2026-09-23.md's Vuln 2
 * found in the notifications code).
 *
 * Promotion to a production-usable status (approved/allowed_for_rag) is
 * DELIBERATELY NOT done here, even by an admin action in this file --
 * see the module comment on why review submission and promotion are two
 * separate steps, matching knowledge_entries' own existing
 * submit-then-separately-/publish pattern in routes/knowledge.ts.
 * Promoting language_entries is left as an explicit follow-up (would need
 * its own admin review-queue UI/tooling to do responsibly, not a bare
 * endpoint) rather than built speculatively here.
 */
export function registerMicrotaskRoutes(app: FastifyInstance): void {
  // A contributor's own open queue: their own drafts plus a page of
  // other unreviewed community submissions to review. Deliberately does
  // NOT include Afribit's own first-party manual content (source_type=
  // 'afribit_authored') or bootstrap/synthetic data -- this queue is for
  // the actual community contribution loop, not everything with
  // status='draft' in the table.
  app.get("/api/v1/microtasks/queue", { preHandler: app.requireAuth }, async (request, reply) => {
    const { rows } = await pool.query(
      `SELECT id, utterance, meaning, intent, style, source_context, created_at, contributor_key
       FROM language_entries
       WHERE status = 'draft'
         AND source_type = 'afribit_microtask'
         AND (contributor_key IS DISTINCT FROM $1)
         AND COALESCE(pack_id, $2) = $3
       ORDER BY created_at ASC
       LIMIT 25`,
      [request.user.id, getRegistry().default.id, getPack().id],
    );
    return reply.send({ queue: rows });
  });

  app.get("/api/v1/microtasks/mine", { preHandler: app.requireAuth }, async (request, reply) => {
    const { rows } = await pool.query(
      `SELECT id, utterance, meaning, intent, style, status, created_at
       FROM language_entries
       WHERE contributor_key = $1
         AND COALESCE(pack_id, $2) = $3
       ORDER BY created_at DESC
       LIMIT 50`,
      [request.user.id, getRegistry().default.id, getPack().id],
    );
    return reply.send({ submissions: rows });
  });

  app.post<{ Body: SubmitBody }>("/api/v1/microtasks/language-entries", { preHandler: app.requireAuth }, async (request, reply) => {
    const { utterance, meaning, intent, style, sourceContext } = request.body ?? {};
    if (!utterance?.trim() || !style) {
      return reply.status(400).send({ error: "utterance and style are required" });
    }
    if (!isKnownMode(style)) {
      return reply.status(400).send({ error: modeErrorMessage("style") });
    }

    // Conservative-by-default on every provenance flag, matching
    // db/migrations/002_language_provenance.sql's rule: a submission
    // being recorded is not permission to use it for anything yet.
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO language_entries
        (utterance, meaning, intent, style, source_context, status, freshness,
         corpus_layer, source, source_type, human_authored, synthetic,
         afribit_reviewed, quality_tier, allowed_for_rag, allowed_for_training,
         allowed_for_evaluation, contributor_key, pack_id)
       VALUES ($1, $2, $3, $4, $5, 'draft', 'context_specific',
               'L2_community_collected', 'afribit_microtasks', 'afribit_microtask', true, false,
               false, 'unrated', false, false,
               false, $6, $7)
       RETURNING id`,
      [utterance.trim(), meaning?.trim() ?? null, intent?.trim() ?? null, style, sourceContext?.trim() ?? null, request.user.id, getPack().id],
    );

    return reply.status(201).send({ ok: true, id: rows[0]?.id });
  });

  app.post<{ Params: { id: string }; Body: ReviewBody }>(
    "/api/v1/microtasks/language-entries/:id/review",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const { decision, notes } = request.body ?? {};
      if (!decision || !["approve", "reject", "needs_changes"].includes(decision)) {
        return reply.status(400).send({ error: "decision must be one of approve, reject, needs_changes" });
      }

      const { rows: entryRows } = await pool.query<{ contributor_key: string | null }>(
        `SELECT contributor_key FROM language_entries WHERE id = $1`,
        [request.params.id],
      );
      if (entryRows.length === 0) {
        return reply.status(404).send({ error: "language entry not found" });
      }
      // Self-review would defeat the entire point of a second-opinion
      // review pipeline -- same reasoning as never letting one AI model
      // certify its own output (docs/adr/0005 rule 2), applied to a human
      // reviewing their own submission.
      if (entryRows[0]?.contributor_key === request.user.id) {
        return reply.status(403).send({ error: "You cannot review your own submission" });
      }

      await pool.query(
        `INSERT INTO language_reviews (language_entry_id, reviewer_id, decision, notes)
         VALUES ($1, $2, $3, $4)`,
        [request.params.id, request.user.id, decision, notes?.trim() ?? null],
      );
      await pool.query(`UPDATE language_entries SET review_count = review_count + 1 WHERE id = $1`, [request.params.id]);

      return reply.status(201).send({ ok: true });
    },
  );

  app.post<{ Params: { id: string }; Body: VoteBody }>(
    "/api/v1/microtasks/language-entries/:id/vote",
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const naturalness = request.body?.naturalness;
      if (typeof naturalness !== "number" || naturalness < 1 || naturalness > 5 || !Number.isInteger(naturalness)) {
        return reply.status(400).send({ error: "naturalness must be an integer between 1 and 5" });
      }

      const { rows: entryRows } = await pool.query(`SELECT id FROM language_entries WHERE id = $1`, [request.params.id]);
      if (entryRows.length === 0) {
        return reply.status(404).send({ error: "language entry not found" });
      }

      await pool.query(
        `INSERT INTO language_votes (language_entry_id, voter_key, naturalness) VALUES ($1, $2, $3)`,
        [request.params.id, request.user.id, naturalness],
      );

      return reply.status(201).send({ ok: true });
    },
  );
}
