import { pool } from "../db/pool.js";
import { checkRoleChange, type Resolution, type Role } from "./rules.js";
import { getDailyAggregates, getPilotStats, type DailyRow, type PilotStats, type StatsOptions } from "./stats.js";

/**
 * Database side of the pilot console: the answer review queue and the team list. The rules (what a
 * valid resolution is, who may be demoted) are in rules.ts; the HTTP routes are in routes/pilot.ts and
 * talk to this through the PilotStore interface so they can be tested without a database.
 */

export class PilotError extends Error {
  constructor(
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
  }
}

export interface QueueItem {
  feedbackId: string;
  messageId: string;
  createdAt: string;
  source: string | null;
  languageMode: string;
  rating: "not_helpful";
  reason: string | null;
  comment: string | null;
  question: string | null;
  answer: string;
  answerFlag: string | null;
  retrievalConfidence: number | null;
  /** Cards handed to the model for this answer (null: not recorded, e.g. an answer from before migration 015). */
  retrieved: { id: string; title: string | null }[] | null;
  resolved: null | { at: string; by: string | null; resolution: Resolution; note: string | null };
}

export interface FlaggedItem {
  messageId: string;
  kind: string;
  at: string;
  source: string | null;
  question: string | null;
  answer: string;
  /** For ungrounded answers: the names or figures that were nowhere in the prompt. */
  words: string[];
  retrieved: { id: string; title: string | null }[] | null;
}

export interface QueueResult {
  state: "open" | "resolved";
  counts: { open: number; resolved: number };
  items: QueueItem[];
  /** Read-only context: answers the safety system flagged. Not resolvable here. */
  flagged: FlaggedItem[];
}

export interface TeamUser {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
  createdAt: string;
}

export interface PilotStore {
  /** The role in the database right now (a token's role can be older than a role change). */
  currentRole(userId: string): Promise<Role | null>;
  stats(opts: StatsOptions): Promise<PilotStats>;
  daily(opts: { days: number; packId: string; defaultPackId: string }): Promise<DailyRow[]>;
  queue(opts: { state: "open" | "resolved"; limit: number; packId: string; defaultPackId: string }): Promise<QueueResult>;
  resolve(input: { feedbackId: string; actorId: string; resolution: Resolution; note: string | null; packId: string; defaultPackId: string }): Promise<QueueItem>;
  listUsers(opts: { q: string | null; limit: number; offset: number }): Promise<{ users: TeamUser[]; total: number }>;
  setRole(input: { actorId: string; targetId: string; role: unknown }): Promise<{ user: TeamUser; unchanged: boolean }>;
}

const PACK = `($1::text IS NULL OR coalesce(s.pack_id, $2::text) = $1::text)`;
const QUESTION = `(SELECT u.content FROM chat_messages u WHERE u.session_id = m.session_id AND u.role = 'user' AND u.created_at <= m.created_at ORDER BY u.created_at DESC LIMIT 1)`;

type Cards = Map<string, string | null>;
async function cardTitles(ids: string[]): Promise<Cards> {
  const map: Cards = new Map();
  if (ids.length === 0) return map;
  const { rows } = await pool.query<{ id: string; title: string }>(`SELECT id, title FROM knowledge_entries WHERE id = ANY($1::text[])`, [ids]);
  for (const r of rows) map.set(r.id, r.title);
  return map;
}
const retrievedOf = (ids: string[] | null, titles: Cards) => (ids ? ids.map((id) => ({ id, title: titles.get(id) ?? null })) : null);

interface QueueRow {
  feedback_id: string;
  message_id: string;
  created_at: Date;
  source: string | null;
  language_mode: string;
  reason: string | null;
  comment: string | null;
  question: string | null;
  answer: string;
  safety_flag: string | null;
  retrieval_confidence: number | null;
  retrieved_ids: string[] | null;
  reviewed_at: Date | null;
  reviewed_by_name: string | null;
  resolution: Resolution | null;
  reviewer_note: string | null;
}

const QUEUE_SELECT = `
  SELECT f.id AS feedback_id, f.message_id, f.created_at, s.source, s.language_mode, f.reason, f.comment,
         -- F-002: text the learner shared with the report wins; with CHAT_RETENTION=none it is the only text.
         coalesce(nullif(f.question_text, ''), CASE WHEN s.user_id IS NULL THEN nullif(${QUESTION}, '') END) AS question,
         coalesce(nullif(f.answer_text, ''), CASE WHEN s.user_id IS NULL THEN nullif(m.content, '') END, '') AS answer, m.safety_flag, m.retrieval_confidence, m.retrieved_ids,
         f.reviewed_at, coalesce(ru.display_name, ru.email) AS reviewed_by_name, f.resolution, f.reviewer_note
  FROM message_feedback f
  JOIN chat_messages m ON m.id = f.message_id
  JOIN chat_sessions s ON s.id = m.session_id
  LEFT JOIN users ru ON ru.id = f.reviewed_by`;

function toItem(r: QueueRow, titles: Cards): QueueItem {
  return {
    feedbackId: r.feedback_id,
    messageId: r.message_id,
    createdAt: r.created_at.toISOString(),
    source: r.source,
    languageMode: r.language_mode,
    rating: "not_helpful",
    reason: r.reason,
    comment: r.comment,
    question: r.question,
    answer: r.answer,
    answerFlag: r.safety_flag,
    retrievalConfidence: r.retrieval_confidence,
    retrieved: retrievedOf(r.retrieved_ids, titles),
    resolved: r.reviewed_at && r.resolution ? { at: r.reviewed_at.toISOString(), by: r.reviewed_by_name, resolution: r.resolution, note: r.reviewer_note } : null,
  };
}

async function queue(opts: { state: "open" | "resolved"; limit: number; packId: string; defaultPackId: string }): Promise<QueueResult> {
  const p = [opts.packId, opts.defaultPackId];
  const open = opts.state === "open";
  const { rows } = await pool.query<QueueRow>(
    `${QUEUE_SELECT}
     WHERE f.rating = 'not_helpful' AND f.reviewed_at IS ${open ? "NULL" : "NOT NULL"} AND ${PACK}
     ORDER BY ${open ? "f.created_at ASC" : "f.reviewed_at DESC"} LIMIT $3`,
    [...p, opts.limit],
  );
  const { rows: c } = await pool.query<{ open: string; resolved: string }>(
    `SELECT count(*) FILTER (WHERE f.reviewed_at IS NULL) AS open, count(*) FILTER (WHERE f.reviewed_at IS NOT NULL) AS resolved
     FROM message_feedback f JOIN chat_messages m ON m.id = f.message_id JOIN chat_sessions s ON s.id = m.session_id
     WHERE f.rating = 'not_helpful' AND ${PACK}`,
    p,
  );

  // Answers the safety system flagged: withheld by the output check, or carrying names or figures that were not in the prompt.
  const { rows: flaggedRows } = await pool.query<{
    message_id: string;
    kind: string;
    at: Date;
    details: { words?: string[] } | null;
    source: string | null;
    question: string | null;
    answer: string;
    retrieved_ids: string[] | null;
  }>(
    `WITH hits AS (
       SELECT m.id AS message_id, m.safety_flag AS kind, m.created_at AS at, NULL::jsonb AS details
       FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id
       WHERE m.role = 'assistant' AND (m.safety_flag LIKE 'output_safety_%' OR m.safety_flag = 'ungrounded_answer') AND ${PACK}
       UNION ALL
       SELECT a.id, e.kind, e.created_at, e.details
       FROM safety_events e
       JOIN chat_sessions s ON s.id = e.session_id
       JOIN LATERAL (SELECT x.id FROM chat_messages x WHERE x.session_id = e.session_id AND x.role = 'assistant' AND x.created_at >= e.created_at ORDER BY x.created_at LIMIT 1) a ON true
       WHERE e.kind = 'ungrounded_answer' AND ${PACK}
     )
     SELECT DISTINCT ON (h.message_id) h.message_id, h.kind, h.at,
       CASE WHEN s.user_id IS NULL THEN h.details END AS details, s.source,
       CASE WHEN s.user_id IS NULL THEN ${QUESTION} END AS question,
       CASE WHEN s.user_id IS NULL THEN m.content ELSE '' END AS answer, m.retrieved_ids
     FROM hits h JOIN chat_messages m ON m.id = h.message_id JOIN chat_sessions s ON s.id = m.session_id
     ORDER BY h.message_id, (h.details IS NULL)`,
    p,
  );
  flaggedRows.sort((a, b) => b.at.getTime() - a.at.getTime());
  const flaggedRecent = flaggedRows.slice(0, 25);

  const titles = await cardTitles([...new Set([...rows.flatMap((r) => r.retrieved_ids ?? []), ...flaggedRecent.flatMap((r) => r.retrieved_ids ?? [])])]);
  return {
    state: opts.state,
    counts: { open: Number(c[0]?.open ?? 0), resolved: Number(c[0]?.resolved ?? 0) },
    items: rows.map((r) => toItem(r, titles)),
    flagged: flaggedRecent.map((r) => ({
      messageId: r.message_id,
      kind: r.kind,
      at: r.at.toISOString(),
      source: r.source,
      question: r.question,
      answer: r.answer,
      words: Array.isArray(r.details?.words) ? r.details.words.slice(0, 12).map(String) : [],
      retrieved: retrievedOf(r.retrieved_ids, titles),
    })),
  };
}

async function resolve(input: { feedbackId: string; actorId: string; resolution: Resolution; note: string | null; packId: string; defaultPackId: string }): Promise<QueueItem> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: found } = await client.query<{ rating: string; reviewed_at: Date | null; pack: string }>(
      `SELECT f.rating, f.reviewed_at, coalesce(s.pack_id, $2::text) AS pack
       FROM message_feedback f JOIN chat_messages m ON m.id = f.message_id JOIN chat_sessions s ON s.id = m.session_id
       WHERE f.id = $1 FOR UPDATE OF f`,
      [input.feedbackId, input.defaultPackId],
    );
    const f = found[0];
    // A report from another pack is not this pack's to resolve; say "not found" rather than reveal it exists.
    if (!f || f.pack !== input.packId) throw new PilotError(404, "No such report");
    if (f.rating !== "not_helpful") throw new PilotError(409, "Only reported or not-helpful answers are in the queue");
    if (f.reviewed_at) throw new PilotError(409, "This report is already resolved");
    await client.query(`UPDATE message_feedback SET reviewed_by = $2, reviewed_at = now(), resolution = $3, reviewer_note = $4 WHERE id = $1`, [input.feedbackId, input.actorId, input.resolution, input.note]);
    await client.query(`INSERT INTO audit_logs (actor, action, entity_type, entity_id, details) VALUES ($1, 'resolve_feedback', 'message_feedback', $2, $3)`, [
      input.actorId,
      input.feedbackId,
      JSON.stringify({ resolution: input.resolution, note: input.note }),
    ]);
    const { rows } = await client.query<QueueRow>(`${QUEUE_SELECT} WHERE f.id = $1`, [input.feedbackId]);
    await client.query("COMMIT");
    const row = rows[0]!;
    return toItem(row, await cardTitles(row.retrieved_ids ?? []));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  created_at: Date;
}
const toUser = (r: UserRow): TeamUser => ({ id: r.id, email: r.email, displayName: r.display_name, role: r.role, createdAt: r.created_at.toISOString() });

async function listUsers(opts: { q: string | null; limit: number; offset: number }): Promise<{ users: TeamUser[]; total: number }> {
  const like = opts.q ? `%${opts.q.replace(/[\\%_]/g, "\\$&")}%` : null;
  const where = `created_via = 'registered' AND ($1::text IS NULL OR email ILIKE $1 OR display_name ILIKE $1)`;
  const { rows } = await pool.query<UserRow>(`SELECT id, email, display_name, role, created_at FROM users WHERE ${where} ORDER BY created_at DESC, id LIMIT $2 OFFSET $3`, [like, opts.limit, opts.offset]);
  const { rows: total } = await pool.query<{ n: string }>(`SELECT count(*) AS n FROM users WHERE ${where}`, [like]);
  return { users: rows.map(toUser), total: Number(total[0]?.n ?? 0) };
}

async function setRole(input: { actorId: string; targetId: string; role: unknown }): Promise<{ user: TeamUser; unchanged: boolean }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Lock every admin row first, so two admins demoting each other at once cannot both pass the last-admin check.
    const { rows: admins } = await client.query(`SELECT id FROM users WHERE role = 'admin' ORDER BY id FOR UPDATE`);
    const { rows } = await client.query<UserRow>(`SELECT id, email, display_name, role, created_at FROM users WHERE id = $1 AND created_via = 'registered' FOR UPDATE`, [input.targetId]);
    const target = rows[0];
    if (!target) throw new PilotError(404, "No such team member");
    const verdict = checkRoleChange({ actorId: input.actorId, target: { id: target.id, role: target.role }, newRole: input.role, adminCount: admins.length });
    if (!verdict.ok) throw new PilotError(verdict.status, verdict.error);
    if (verdict.unchanged) {
      await client.query("COMMIT");
      return { user: toUser(target), unchanged: true };
    }
    const { rows: updated } = await client.query<UserRow>(`UPDATE users SET role = $2 WHERE id = $1 RETURNING id, email, display_name, role, created_at`, [target.id, input.role]);
    await client.query(`INSERT INTO audit_logs (actor, action, entity_type, entity_id, details) VALUES ($1, 'change_role', 'user', $2, $3)`, [
      input.actorId,
      target.id,
      JSON.stringify({ from: target.role, to: input.role, email: target.email }),
    ]);
    await client.query("COMMIT");
    return { user: toUser(updated[0]!), unchanged: false };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export const pilotStore: PilotStore = {
  async currentRole(userId) {
    const { rows } = await pool.query<{ role: Role }>(`SELECT role FROM users WHERE id = $1`, [userId]);
    return rows[0]?.role ?? null;
  },
  stats: getPilotStats,
  daily: getDailyAggregates,
  queue,
  resolve,
  listUsers,
  setRole,
};
