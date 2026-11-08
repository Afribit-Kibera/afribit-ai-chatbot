import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";
import { env } from "../config/env.js";
import { indexEntry } from "../knowledge/indexing.js";
import { getPack } from "../pack/active.js";
import { allowedTransitions, canTransition, isLive, isStatus, mayMakeLive, slug, statusAfterEdit, type CardStatus } from "./rules.js";

/** Database side of the review workflow. The rules themselves are in rules.ts. */

export class ReviewError extends Error {
  constructor(
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
  }
}

export interface CardRow {
  id: string;
  topic_id: string | null;
  title: string;
  domain: string;
  canonical_answer: string;
  beginner_answer: string;
  safety_notes: string[];
  status: CardStatus;
  version: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  updated_at: string;
}

const COLUMNS = `id, topic_id, title, domain, canonical_answer, beginner_answer, safety_notes, status, version, reviewed_by, reviewed_at, updated_at`;

function domains(): string[] {
  return getPack().domain.retrievalDomains;
}

export async function counts(): Promise<Record<string, number>> {
  const { rows } = await pool.query<{ status: string; n: string }>(`SELECT status, count(*) AS n FROM knowledge_entries WHERE community_pack_id IS NULL AND domain = ANY($1::text[]) GROUP BY status`, [domains()]);
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
}

export async function listCards(opts: { status?: string; q?: string; limit?: number }): Promise<CardRow[]> {
  const params: unknown[] = [domains()];
  let where = "community_pack_id IS NULL AND domain = ANY($1::text[])";
  if (opts.status) {
    if (!isStatus(opts.status)) throw new ReviewError(400, "unknown status");
    params.push(opts.status);
    where += ` AND status = $${params.length}`;
  }
  if (opts.q?.trim()) {
    params.push(`%${opts.q.trim().replace(/[%_]/g, "\\$&")}%`);
    where += ` AND (title ILIKE $${params.length} OR id ILIKE $${params.length} OR canonical_answer ILIKE $${params.length})`;
  }
  params.push(Math.min(Math.max(opts.limit ?? 200, 1), 500));
  const { rows } = await pool.query<CardRow>(`SELECT ${COLUMNS} FROM knowledge_entries WHERE ${where} ORDER BY updated_at DESC LIMIT $${params.length}`, params);
  return rows;
}

export async function listTopics(): Promise<{ id: string; title: string }[]> {
  const { rows } = await pool.query<{ id: string; title: string }>(`SELECT id, title FROM knowledge_topics WHERE domain = ANY($1::text[]) ORDER BY title`, [domains()]);
  return rows;
}

export async function getCard(id: string) {
  const { rows } = await pool.query<CardRow>(`SELECT ${COLUMNS} FROM knowledge_entries WHERE id = $1 AND community_pack_id IS NULL AND domain = ANY($2::text[])`, [id, domains()]);
  const card = rows[0];
  if (!card) throw new ReviewError(404, "Card not found");
  const [versions, log] = await Promise.all([
    pool.query(`SELECT version, snapshot, change_reason, created_by, created_at FROM knowledge_versions WHERE knowledge_id = $1 ORDER BY version DESC LIMIT 30`, [id]),
    pool.query(`SELECT actor, action, details, created_at FROM audit_logs WHERE entity_type = 'knowledge_entry' AND entity_id = $1 ORDER BY created_at DESC LIMIT 50`, [id]),
  ]);
  return { card, allowed: allowedTransitions(card.status), versions: versions.rows, log: log.rows };
}

async function snapshot(client: PoolClient, card: Pick<CardRow, "id" | "version" | "title" | "canonical_answer" | "beginner_answer" | "safety_notes" | "topic_id">, actor: string, reason: string | null): Promise<void> {
  await client.query(
    `INSERT INTO knowledge_versions (knowledge_id, version, snapshot, change_reason, created_by) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (knowledge_id, version) DO UPDATE SET snapshot = EXCLUDED.snapshot, change_reason = EXCLUDED.change_reason, created_by = EXCLUDED.created_by, created_at = now()`,
    [card.id, card.version, JSON.stringify({ title: card.title, canonical_answer: card.canonical_answer, beginner_answer: card.beginner_answer, safety_notes: card.safety_notes, topic_id: card.topic_id }), reason, actor],
  );
}

async function audit(client: PoolClient, actor: string, action: string, id: string, details: unknown): Promise<void> {
  await client.query(`INSERT INTO audit_logs (actor, action, entity_type, entity_id, details) VALUES ($1, $2, 'knowledge_entry', $3, $4)`, [actor, action, id, JSON.stringify(details)]);
}

export interface CardInput {
  title?: string;
  canonicalAnswer?: string;
  beginnerAnswer?: string;
  safetyNotes?: string[];
  topicId?: string | null;
  changeReason?: string;
}

function clean(input: CardInput): CardInput {
  const out: CardInput = { ...input };
  if (out.title !== undefined) out.title = out.title.trim();
  if (out.canonicalAnswer !== undefined) out.canonicalAnswer = out.canonicalAnswer.trim();
  if (out.beginnerAnswer !== undefined) out.beginnerAnswer = out.beginnerAnswer.trim();
  if (out.safetyNotes !== undefined) out.safetyNotes = out.safetyNotes.map((s) => s.trim()).filter(Boolean);
  for (const [k, v] of Object.entries({ title: out.title, canonicalAnswer: out.canonicalAnswer, beginnerAnswer: out.beginnerAnswer })) {
    if (v !== undefined && v.length === 0) throw new ReviewError(400, `${k} cannot be empty`);
  }
  return out;
}

async function checkTopic(topicId: string | null | undefined): Promise<void> {
  if (!topicId) return;
  const { rowCount } = await pool.query(`SELECT 1 FROM knowledge_topics WHERE id = $1 AND domain = ANY($2::text[])`, [topicId, domains()]);
  if (!rowCount) throw new ReviewError(400, "Unknown topic");
}

export async function createCard(actor: string, rawInput: CardInput): Promise<CardRow> {
  const input = clean(rawInput);
  if (!input.title || !input.canonicalAnswer || !input.beginnerAnswer) throw new ReviewError(400, "title, canonicalAnswer and beginnerAnswer are required");
  await checkTopic(input.topicId);
  const domain = domains()[0] as string;
  const prefix = input.topicId ? `${input.topicId}.${slug(input.title)}` : `${domain}.${slug(input.title)}`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let id = `${prefix}.001`;
    for (let n = 2; (await client.query(`SELECT 1 FROM knowledge_entries WHERE id = $1`, [id])).rowCount; n++) id = `${prefix}.${String(n).padStart(3, "0")}`;
    const { rows } = await client.query<CardRow>(
      `INSERT INTO knowledge_entries (id, topic_id, title, domain, canonical_answer, beginner_answer, safety_notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'draft') RETURNING ${COLUMNS}`,
      [id, input.topicId ?? null, input.title, domain, input.canonicalAnswer, input.beginnerAnswer, JSON.stringify(input.safetyNotes ?? [])],
    );
    const card = rows[0] as CardRow;
    await snapshot(client, card, actor, input.changeReason ?? "created");
    await audit(client, actor, "create", card.id, {});
    await client.query("COMMIT");
    return card;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function editCard(actor: string, id: string, rawInput: CardInput): Promise<{ card: CardRow; sentBack: boolean }> {
  const input = clean(rawInput);
  await checkTopic(input.topicId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<CardRow>(`SELECT ${COLUMNS} FROM knowledge_entries WHERE id = $1 AND community_pack_id IS NULL AND domain = ANY($2::text[]) FOR UPDATE`, [id, domains()]);
    const current = rows[0];
    if (!current) throw new ReviewError(404, "Card not found");
    const next = {
      title: input.title ?? current.title,
      canonical_answer: input.canonicalAnswer ?? current.canonical_answer,
      beginner_answer: input.beginnerAnswer ?? current.beginner_answer,
      safety_notes: input.safetyNotes ?? current.safety_notes,
      topic_id: input.topicId === undefined ? current.topic_id : input.topicId,
    };
    const changed = next.title !== current.title || next.canonical_answer !== current.canonical_answer || next.beginner_answer !== current.beginner_answer || next.topic_id !== current.topic_id || JSON.stringify(next.safety_notes) !== JSON.stringify(current.safety_notes);
    if (!changed) {
      await client.query("ROLLBACK");
      return { card: current, sentBack: false };
    }
    const status = statusAfterEdit(current.status);
    const sentBack = status !== current.status;
    const { rows: updated } = await client.query<CardRow>(
      `UPDATE knowledge_entries SET title = $2, canonical_answer = $3, beginner_answer = $4, safety_notes = $5::jsonb, topic_id = $6, status = $7,
              reviewed_by = CASE WHEN $8 THEN NULL ELSE reviewed_by END, reviewed_at = CASE WHEN $8 THEN NULL ELSE reviewed_at END,
              version = version + 1, updated_at = now()
       WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, next.title, next.canonical_answer, next.beginner_answer, JSON.stringify(next.safety_notes), next.topic_id, status, sentBack],
    );
    const card = updated[0] as CardRow;
    await snapshot(client, card, actor, input.changeReason ?? null);
    await audit(client, actor, "edit", id, { reason: input.changeReason ?? null, sentBackForReview: sentBack, from: current.status });
    await client.query("COMMIT");
    return { card, sentBack };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function transitionCard(actor: string, id: string, to: string, note: string | null): Promise<{ card: CardRow; indexWarning: string | null }> {
  if (!isStatus(to)) throw new ReviewError(400, "unknown status");
  const client = await pool.connect();
  let card: CardRow;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<CardRow>(`SELECT ${COLUMNS} FROM knowledge_entries WHERE id = $1 AND community_pack_id IS NULL AND domain = ANY($2::text[]) FOR UPDATE`, [id, domains()]);
    const current = rows[0];
    if (!current) throw new ReviewError(404, "Card not found");
    if (!canTransition(current.status, to)) throw new ReviewError(409, `A card in "${current.status}" cannot move to "${to}". Allowed: ${allowedTransitions(current.status).join(", ")}`);
    const last = await client.query<{ created_by: string | null }>(`SELECT created_by FROM knowledge_versions WHERE knowledge_id = $1 ORDER BY version DESC LIMIT 1`, [id]);
    if (!mayMakeLive({ to, actor, lastEditor: last.rows[0]?.created_by ?? null, twoPerson: env.reviewTwoPerson })) {
      throw new ReviewError(403, "A card must be made live by someone other than the person who last edited it (REVIEW_TWO_PERSON is on)");
    }
    const live = isLive(to);
    const { rows: updated } = await client.query<CardRow>(
      `UPDATE knowledge_entries SET status = $2,
              reviewed_by = CASE WHEN $3 THEN $4 ELSE reviewed_by END, reviewed_at = CASE WHEN $3 THEN now() ELSE reviewed_at END,
              valid_from = CASE WHEN $3 AND valid_from IS NULL THEN now() ELSE valid_from END, updated_at = now()
       WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, to, live, actor],
    );
    card = updated[0] as CardRow;
    await audit(client, actor, `status:${to}`, id, { from: current.status, to, note });
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // A card that just became live must be searchable now. Failure does not undo the review decision.
  let indexWarning: string | null = null;
  if (isLive(card.status)) {
    try {
      await indexEntry(id);
    } catch (err) {
      indexWarning = `The card is live but could not be added to semantic search (${err instanceof Error ? err.message : String(err)}). It can still be found by keyword. An operator can run knowledge:embed.`;
    }
  }
  return { card, indexWarning };
}
