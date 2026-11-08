import { pool } from "../db/pool.js";
import type { GapRow, GapStatus } from "./rules.js";

/**
 * The gap list's storage (docs/features/F-004-gap-list.md). Events hold a topic, a day, a language, the nearest
 * card and a rounded confidence; never question text, and no link to a conversation, message or user.
 */
export class GapError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface GapStore {
  currentRole(userId: string): Promise<string | null>;
  /** Open topics for the labeller to reuse, most asked about in the last 30 days first. */
  openTopics(packId: string, limit: number): Promise<string[]>;
  record(input: { packId: string; label: string | null; languageMode: string | null; nearestCard: string | null; confidence: number | null }): Promise<void>;
  rows(input: { packId: string; days: number }): Promise<GapRow[]>;
  decide(input: { id: string; packId: string; actor: string; status: GapStatus; cardId: string | null; note: string | null }): Promise<{ id: string; status: GapStatus }>;
}

interface Row {
  topic_id: string | null;
  label: string | null;
  status: GapStatus | null;
  card_id: string | null;
  card_title: string | null;
  note: string | null;
  language_mode: string | null;
  nearest_card: string | null;
  nearest_title: string | null;
  count: number;
  first_day: string;
  last_day: string;
}

export const gapStore: GapStore = {
  async currentRole(userId) {
    const { rows } = await pool.query<{ role: string }>(`SELECT role FROM users WHERE id = $1`, [userId]);
    return rows[0]?.role ?? null;
  },

  async openTopics(packId, limit) {
    const { rows } = await pool.query<{ label: string }>(
      `SELECT t.label FROM gap_topics t
       LEFT JOIN gap_events e ON e.topic_id = t.id AND e.day > CURRENT_DATE - 30
       WHERE t.pack_id = $1 AND t.status = 'open'
       GROUP BY t.id, t.label ORDER BY count(e.id) DESC, t.label LIMIT $2`,
      [packId, limit],
    );
    return rows.map((r) => r.label);
  },

  async record(input) {
    let topicId: string | null = null;
    if (input.label) {
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO gap_topics (pack_id, label) VALUES ($1, $2)
         ON CONFLICT (pack_id, (lower(label))) DO UPDATE SET label = gap_topics.label
         RETURNING id`,
        [input.packId, input.label],
      );
      topicId = rows[0]?.id ?? null;
    }
    // A nearest card that no longer exists is stored as unknown rather than failing the insert.
    await pool.query(
      `INSERT INTO gap_events (pack_id, topic_id, language_mode, nearest_card, confidence)
       VALUES ($1, $2, $3, (SELECT id FROM knowledge_entries WHERE id = $4), $5)`,
      [input.packId, topicId, input.languageMode, input.nearestCard, input.confidence],
    );
  },

  async rows(input) {
    const { rows } = await pool.query<Row>(
      `SELECT e.topic_id, t.label, t.status, t.card_id, kc.title AS card_title, t.note, e.language_mode,
              e.nearest_card, kn.title AS nearest_title, count(*)::int AS count,
              min(e.day)::text AS first_day, max(e.day)::text AS last_day
       FROM gap_events e
       LEFT JOIN gap_topics t ON t.id = e.topic_id
       LEFT JOIN knowledge_entries kn ON kn.id = e.nearest_card
       LEFT JOIN knowledge_entries kc ON kc.id = t.card_id
       WHERE e.pack_id = $1 AND e.day > CURRENT_DATE - $2::int
       GROUP BY e.topic_id, t.label, t.status, t.card_id, kc.title, t.note, e.language_mode, e.nearest_card, kn.title`,
      [input.packId, input.days],
    );
    return rows.map((r) => ({
      topicId: r.topic_id,
      label: r.label,
      status: r.status,
      cardId: r.card_id,
      cardTitle: r.card_title,
      note: r.note,
      languageMode: r.language_mode,
      nearestCard: r.nearest_card,
      nearestTitle: r.nearest_title,
      count: r.count,
      firstDay: r.first_day,
      lastDay: r.last_day,
    }));
  },

  async decide(input) {
    if (input.cardId) {
      const { rows } = await pool.query(`SELECT 1 FROM knowledge_entries WHERE id = $1`, [input.cardId]);
      if (!rows.length) throw new GapError(400, "No knowledge card has that id");
    }
    const { rows } = await pool.query<{ id: string; status: GapStatus }>(
      `UPDATE gap_topics SET status = $3, card_id = $4, note = $5, decided_by = $6, decided_at = now()
       WHERE id = $1 AND pack_id = $2 RETURNING id, status`,
      [input.id, input.packId, input.status, input.cardId, input.note, input.actor],
    );
    if (!rows[0]) throw new GapError(404, "Topic not found");
    await pool.query(`INSERT INTO audit_logs (actor, action, entity_type, entity_id, details) VALUES ($1, 'decide_gap', 'gap_topic', $2, $3)`, [
      input.actor,
      input.id,
      JSON.stringify({ status: input.status, cardId: input.cardId }),
    ]);
    return rows[0];
  },
};
