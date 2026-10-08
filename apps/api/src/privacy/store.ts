import { pool } from "../db/pool.js";
import { REPORT_TEXT_DAYS_AFTER_RESOLUTION } from "./retention.js";

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
  /** Delete these conversations (ids already validated). Returns how many existed. */
  deleteSessions(ids: string[]): Promise<number>;
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
  async deleteSessions(ids) {
    if (ids.length === 0) return 0;
    // F-003: a "say it your way" suggestion stays (it was given with consent), but the conversation text
    // shared with it goes with the conversation.
    await pool.query(`UPDATE teach_suggestions SET question_text = NULL, answer_text = NULL WHERE session_id = ANY($1::uuid[])`, [ids]);
    const { rowCount } = await pool.query(`DELETE FROM chat_sessions WHERE id = ANY($1::uuid[])`, [ids]);
    await audit("anonymous", "delete_conversations", { requested: ids.length, deleted: rowCount ?? 0 });
    return rowCount ?? 0;
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
      await client.query(`UPDATE teach_suggestions SET question_text = NULL, answer_text = NULL WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_id = $1)`, [userId]);
      if (contributions === "delete") await client.query(`DELETE FROM teach_suggestions WHERE created_by = $1 AND status <> 'approved'`, [userId]);
      const conv = await client.query(`DELETE FROM chat_sessions WHERE user_id = $1`, [userId]);
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
