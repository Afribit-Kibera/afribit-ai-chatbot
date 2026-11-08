import { pool } from "../db/pool.js";
import { REPORT_TEXT_DAYS_AFTER_RESOLUTION } from "./retention.js";
import { getPack, getRegistry } from "../pack/active.js";
import { hashGuestToken, type SessionActor } from "../chat/access.js";
import { withdrawCopies } from "../memory/promotion.js";

/**
 * Deleting and expiring people's data (docs/features/F-002-privacy-settings.md). Every write here is
 * recorded in audit_logs as counts only, never content. Foreign keys do the rest: deleting a conversation
 * cascades to its messages and their feedback; safety events and model runs keep their row with the link
 * set to null (db/migrations/001_init.sql).
 */
export class PrivacyError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface SweepResult {
  messagesEmptied: number;
  reportsCleared: number;
}

export interface PrivacyStore {
  /** Delete only permitted conversations in this pack; supplied IDs alone grant no authority. */
  deleteSessions(ids: string[], actor: SessionActor, guestTokens?: Record<string, string>): Promise<number>;
  /** Delete every conversation linked to this account. */
  deleteUserConversations(userId: string): Promise<number>;
  /** Delete the account, its conversations and preferences. Contributions are kept without the name, or deleted. */
  deleteAccount(userId: string, contributions: "keep" | "delete"): Promise<{ conversations: number; contributions: number }>;
  /** Empty message text older than `days` (null: leave messages alone) and clear text on long-resolved reports. */
  sweep(days: number | null): Promise<SweepResult>;
}

async function audit(actor: string, action: string, details: Record<string, number | string>): Promise<void> {
  await pool.query(`INSERT INTO audit_logs (actor, action, entity_type, details) VALUES ($1, $2, 'privacy', $3)`, [actor, action, JSON.stringify(details)]);
}

export const privacyStore: PrivacyStore = {
  async deleteSessions(ids, actor, guestTokens = {}) {
    if (ids.length === 0) return 0;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<{ id: string }>(
        `SELECT s.id FROM chat_sessions s
         JOIN unnest($1::uuid[], $3::text[]) AS requested(id, token_hash) ON requested.id = s.id
         WHERE (s.user_id = $2::uuid OR (s.user_id IS NULL AND s.guest_access_hash = requested.token_hash
                AND s.guest_access_expires_at > now()))
           AND (s.pack_id = $4 OR (s.pack_id IS NULL AND $4 = $5)) ORDER BY s.id FOR UPDATE OF s`,
        [ids, actor.userId, ids.map((id) => hashGuestToken(guestTokens[id] ?? actor.guestToken)), getPack().id, getRegistry().default.id],
      );
      const permitted = rows.map((r) => r.id);
      await client.query(`UPDATE teach_suggestions SET question_text = NULL, answer_text = NULL WHERE session_id = ANY($1::uuid[])`, [permitted]);
      const { rowCount } = await client.query(`DELETE FROM chat_sessions WHERE id = ANY($1::uuid[])`, [permitted]);
      await client.query(`INSERT INTO audit_logs (actor, action, entity_type, details) VALUES ($1, 'delete_conversations', 'privacy', $2)`,
        [actor.userId ?? "guest", JSON.stringify({ requested: ids.length, deleted: rowCount ?? 0 })]);
      await client.query("COMMIT");
      return rowCount ?? 0;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally { client.release(); }
  },

  async deleteUserConversations(userId) {
    await pool.query(`UPDATE teach_suggestions SET question_text = NULL, answer_text = NULL WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_id = $1)`, [userId]);
    const { rowCount } = await pool.query(`DELETE FROM chat_sessions WHERE user_id = $1`, [userId]);
    await audit(userId, "delete_my_conversations", { deleted: rowCount ?? 0 });
    return rowCount ?? 0;
  },

  async deleteAccount(userId, contributions) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<{ role: string }>(`SELECT role FROM users WHERE id = $1 FOR UPDATE`, [userId]);
      if (rows.length === 0) throw new PrivacyError(404, "Account not found");
      if (rows[0]!.role === "admin") {
        const { rows: admins } = await client.query<{ n: string }>(`SELECT count(*) AS n FROM users WHERE role = 'admin'`);
        if (Number(admins[0]?.n ?? 0) <= 1) throw new PrivacyError(409, "This is the last administrator; make someone else an administrator before deleting this account.");
      }
      // Do not cascade away the ownership map while plaintext source material still exists upstream.
      const studies=await client.query<{id:string}>(`SELECT id FROM study_notebooks WHERE user_id=$1 LIMIT 1`,[userId]);
      if(studies.rows.length)throw new PrivacyError(409,'Delete your source notebooks before deleting this account. This keeps their source material from being orphaned.');
      if(contributions==='delete')await client.query(`DELETE FROM studio_drafts d WHERE d.created_by=$1 AND NOT EXISTS(SELECT 1 FROM learning_releases r WHERE r.draft_id=d.id)`,[userId]);
      await client.query(`UPDATE teach_suggestions SET question_text = NULL, answer_text = NULL WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_id = $1)`, [userId]);
      if (contributions === "delete") await client.query(`DELETE FROM teach_suggestions WHERE created_by = $1 AND status <> 'approved'`, [userId]);
      const conv = await client.query(`DELETE FROM chat_sessions WHERE user_id = $1`, [userId]);
      await withdrawCopies(client,userId,undefined,contributions === "keep");
      const contrib =
        contributions === "delete"
          ? await client.query(`DELETE FROM language_entries WHERE contributor_key = $1`, [userId])
          : await client.query(`UPDATE language_entries SET contributor_key = NULL WHERE contributor_key = $1`, [userId]);
      await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
      await client.query(`INSERT INTO audit_logs (actor, action, entity_type, details) VALUES ('deleted-account', 'delete_account', 'privacy', $1)`, [
        JSON.stringify({ conversations: conv.rowCount ?? 0, contributions: contrib.rowCount ?? 0, contributionsChoice: contributions }),
      ]);
      await client.query("COMMIT");
      return { conversations: conv.rowCount ?? 0, contributions: contrib.rowCount ?? 0 };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async sweep(days) {
    let messagesEmptied = 0;
    if (days !== null) {
      // A conversation with an open report keeps its text until a reviewer resolves the report.
      const { rowCount } = await pool.query(
        `UPDATE chat_messages m SET content = '', content_deleted_at = now()
         WHERE m.content_deleted_at IS NULL AND m.content <> ''
           AND m.created_at < now() - make_interval(days => $1::int)
           AND NOT EXISTS (
             SELECT 1 FROM message_feedback f JOIN chat_messages fm ON fm.id = f.message_id
             WHERE fm.session_id = m.session_id AND f.rating = 'not_helpful' AND f.reviewed_at IS NULL)`,
        [days],
      );
      messagesEmptied = rowCount ?? 0;
    }
    const { rowCount: reports } = await pool.query(
      `UPDATE message_feedback SET comment = NULL, question_text = NULL, answer_text = NULL
       WHERE reviewed_at IS NOT NULL AND reviewed_at < now() - make_interval(days => $1::int)
         AND (comment IS NOT NULL OR question_text IS NOT NULL OR answer_text IS NOT NULL)`,
      [REPORT_TEXT_DAYS_AFTER_RESOLUTION],
    );
    const result = { messagesEmptied, reportsCleared: reports ?? 0 };
    if (result.messagesEmptied || result.reportsCleared) await audit("retention-sweep", "expire_text", { ...result });
    return result;
  },
};
