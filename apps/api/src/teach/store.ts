import { pool } from "../db/pool.js";
import { decide, entryFlags, isSafetyTopic, PER_CONVERSATION_PER_DAY, type Decision, type SuggestionInput } from "./rules.js";

/**
 * "Say it your way" storage (docs/features/F-003-say-it-your-way.md). A suggestion is inert until a
 * reviewer approves it; approval writes one language_entries row whose use flags are the member's consent
 * AND the approval (rules.ts entryFlags), in the same transaction as the decision and its audit entry.
 */
export class TeachError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface QueueItem {
  id: string;
  createdAt: string;
  languageMode: string;
  reason: string | null;
  suggestion: string;
  questionText: string | null;
  answerText: string | null;
  consent: { answers: boolean; testing: boolean; training: boolean };
  safetyTopic: boolean;
  status: string;
  firstApproval: boolean;
  decidedAt: string | null;
  decisionNote: string | null;
}

export interface TeachQueue {
  items: QueueItem[];
  counts: { pending: number; raisedWeek: number; approvedWeek: number; rejectedWeek: number; cardFixWeek: number };
}

export interface TeachStore {
  currentRole(userId: string): Promise<string | null>;
  create(input: SuggestionInput & { packId: string; createdBy: string | null }): Promise<{ id: string; safetyTopic: boolean }>;
  queue(opts: { state: "pending" | "decided"; limit: number; packId: string; defaultPackId: string }): Promise<TeachQueue>;
  decide(opts: { id: string; actor: string; decision: Decision; text: string | null; note: string | null; packId: string; defaultPackId: string }): Promise<{ status: string; languageEntryId: string | null }>;
}

const PACK = `coalesce(t.pack_id, $2) = $1`;

interface Row {
  id: string;
  created_at: Date;
  language_mode: string;
  reason: string | null;
  suggestion: string;
  question_text: string | null;
  answer_text: string | null;
  consent_answers: boolean;
  consent_testing: boolean;
  consent_training: boolean;
  safety_topic: boolean;
  status: string;
  first_approval_by: string | null;
  decided_at: Date | null;
  decision_note: string | null;
}

function toItem(r: Row): QueueItem {
  return {
    id: r.id,
    createdAt: r.created_at.toISOString(),
    languageMode: r.language_mode,
    reason: r.reason,
    suggestion: r.suggestion,
    questionText: r.question_text,
    answerText: r.answer_text,
    consent: { answers: r.consent_answers, testing: r.consent_testing, training: r.consent_training },
    safetyTopic: r.safety_topic,
    status: r.status,
    firstApproval: Boolean(r.first_approval_by),
    decidedAt: r.decided_at ? r.decided_at.toISOString() : null,
    decisionNote: r.decision_note,
  };
}

export const teachStore: TeachStore = {
  async currentRole(userId) {
    const { rows } = await pool.query<{ role: string }>(`SELECT role FROM users WHERE id = $1`, [userId]);
    return rows[0]?.role ?? null;
  },

  async create(input) {
    if (input.sessionId) {
      const { rows } = await pool.query<{ n: string }>(
        `SELECT count(*) AS n FROM teach_suggestions WHERE session_id = $1 AND created_at > now() - interval '1 day'`,
        [input.sessionId],
      );
      if (Number(rows[0]?.n ?? 0) >= PER_CONVERSATION_PER_DAY) throw new TeachError(429, "Thank you! You have sent the most suggestions we take from one conversation today.");
    }
    const safetyTopic = isSafetyTopic(input.suggestion, input.questionText, input.answerText);
    // Unknown conversation or message ids become NULL instead of failing.
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO teach_suggestions
         (pack_id, session_id, message_id, question_text, answer_text, suggestion, language_mode, reason,
          consent_answers, consent_testing, consent_training, safety_topic, created_by)
       VALUES ($1, (SELECT id FROM chat_sessions WHERE id = $2::uuid), (SELECT id FROM chat_messages WHERE id = $3::uuid),
               $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        input.packId,
        input.sessionId,
        input.messageId,
        input.questionText,
        input.answerText,
        input.suggestion,
        input.languageMode,
        input.reason,
        input.consent.answers,
        input.consent.testing,
        input.consent.training,
        safetyTopic,
        input.createdBy,
      ],
    );
    return { id: rows[0]!.id, safetyTopic };
  },

  async queue(opts) {
    const p = [opts.packId, opts.defaultPackId];
    const pending = opts.state === "pending";
    const { rows } = await pool.query<Row>(
      `SELECT t.id, t.created_at, t.language_mode, t.reason, t.suggestion, t.question_text, t.answer_text,
              t.consent_answers, t.consent_testing, t.consent_training, t.safety_topic, t.status,
              t.first_approval_by, t.decided_at, t.decision_note
       FROM teach_suggestions t
       WHERE ${PACK} AND ${pending ? "t.status = 'pending'" : "t.status <> 'pending'"}
       ORDER BY ${pending ? "t.created_at" : "t.decided_at"} DESC
       LIMIT $3`,
      [...p, opts.limit],
    );
    const { rows: c } = await pool.query<{ pending: string; raised: string; approved: string; rejected: string; card_fix: string }>(
      `SELECT count(*) FILTER (WHERE t.status = 'pending') AS pending,
              count(*) FILTER (WHERE t.created_at > now() - interval '7 days') AS raised,
              count(*) FILTER (WHERE t.status = 'approved' AND t.decided_at > now() - interval '7 days') AS approved,
              count(*) FILTER (WHERE t.status = 'rejected' AND t.decided_at > now() - interval '7 days') AS rejected,
              count(*) FILTER (WHERE t.status = 'card_fix' AND t.decided_at > now() - interval '7 days') AS card_fix
       FROM teach_suggestions t WHERE ${PACK}`,
      p,
    );
    const n = (v: string | undefined) => Number(v ?? 0);
    return {
      items: rows.map(toItem),
      counts: { pending: n(c[0]?.pending), raisedWeek: n(c[0]?.raised), approvedWeek: n(c[0]?.approved), rejectedWeek: n(c[0]?.rejected), cardFixWeek: n(c[0]?.card_fix) },
    };
  },

  async decide(opts) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<Row & { pack_id: string | null; created_by: string | null }>(
        `SELECT t.* FROM teach_suggestions t WHERE t.id = $3 AND ${PACK} FOR UPDATE`,
        [opts.packId, opts.defaultPackId, opts.id],
      );
      const row = rows[0];
      if (!row) throw new TeachError(404, "Suggestion not found");
      const outcome = decide({ status: row.status, safetyTopic: row.safety_topic, createdBy: row.created_by, firstApprovalBy: row.first_approval_by, actor: opts.actor, decision: opts.decision });
      if (outcome.kind === "refused") throw new TeachError(outcome.status, outcome.error);

      let languageEntryId: string | null = null;
      let status = row.status;
      if (outcome.kind === "first_approval") {
        await client.query(`UPDATE teach_suggestions SET first_approval_by = $2 WHERE id = $1`, [opts.id, opts.actor]);
      } else if (outcome.kind === "approved") {
        const flags = entryFlags({ answers: row.consent_answers, testing: row.consent_testing, training: row.consent_training });
        const { rows: entry } = await client.query<{ id: string }>(
          `INSERT INTO language_entries
             (utterance, meaning, style, source_context, status, freshness, corpus_layer, source, source_type,
              human_authored, synthetic, afribit_reviewed, quality_tier, allowed_for_rag, allowed_for_evaluation,
              allowed_for_training, pack_id, last_validated_at, contributor_key)
           VALUES ($1, $2, $3, 'teach_mode suggestion', 'approved', 'current', 'L2_community_collected', 'teach_mode',
                   'afribit_microtask', true, false, true, 'unrated', $4, $5, $6, $7, now(), $8)
           RETURNING id`,
          // contributor_key: a signed-in suggester's id, so deleting their account treats it like their other contributions.
          [opts.text?.trim() || row.suggestion, row.question_text, row.language_mode, flags.allowed_for_rag, flags.allowed_for_evaluation, flags.allowed_for_training, row.pack_id, row.created_by],
        );
        languageEntryId = entry[0]!.id;
        status = "approved";
      } else {
        status = outcome.kind === "rejected" ? "rejected" : "card_fix";
      }
      if (outcome.kind !== "first_approval") {
        await client.query(
          `UPDATE teach_suggestions SET status = $2, decided_by = $3, decided_at = now(), decision_note = $4, language_entry_id = $5 WHERE id = $1`,
          [opts.id, status, opts.actor, opts.note, languageEntryId],
        );
      }
      await client.query(`INSERT INTO audit_logs (actor, action, entity_type, entity_id, details) VALUES ($1, 'decide_suggestion', 'teach_suggestion', $2, $3)`, [
        opts.actor,
        opts.id,
        JSON.stringify({ decision: opts.decision, outcome: outcome.kind, edited: Boolean(opts.text?.trim() && opts.text.trim() !== row.suggestion) }),
      ]);
      await client.query("COMMIT");
      return { status: outcome.kind === "first_approval" ? "pending" : status, languageEntryId };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};
