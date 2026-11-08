import { pool } from "../db/pool.js";
import { generateCode, hashCode, type InviteRole } from "./invitations.js";

/**
 * Invitations (docs/features/F-012-invitation-only-accounts.md). Using one creates the account with the
 * invitation's role and marks it used, in one transaction, so a code can never be used twice.
 */
export interface InvitationSummary {
  id: string;
  role: InviteRole;
  note: string | null;
  createdAt: string;
  expiresAt: string;
  state: "open" | "used" | "expired" | "revoked";
  usedBy: string | null;
  usedAt: string | null;
}

export interface InvitationStore {
  currentRole(userId: string): Promise<string | null>;
  emailTaken(email: string): Promise<boolean>;
  /** REGISTRATION=open only (development): a contributor, as before F-012. */
  registerOpen(input: { email: string; passwordHash: string; displayName: string | null }): Promise<{ id: string; role: string }>;
  create(input: { role: InviteRole; note: string | null; days: number; createdBy: string | null }): Promise<{ id: string; code: string; expiresAt: string }>;
  list(limit: number): Promise<InvitationSummary[]>;
  revoke(id: string, actor: string): Promise<boolean>;
  /** Creates the account if the code is valid; null when it is unknown, used, expired or revoked. */
  register(input: { code: string; email: string; passwordHash: string; displayName: string | null }): Promise<{ id: string; role: string } | null>;
}

interface Row {
  id: string;
  role: InviteRole;
  note: string | null;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
  revoked_at: Date | null;
  used_by_email: string | null;
}

export const invitationStore: InvitationStore = {
  async currentRole(userId) {
    const { rows } = await pool.query<{ role: string }>(`SELECT role FROM users WHERE id = $1`, [userId]);
    return rows[0]?.role ?? null;
  },

  async emailTaken(email) {
    const { rows } = await pool.query(`SELECT 1 FROM users WHERE email = $1`, [email]);
    return rows.length > 0;
  },

  async registerOpen(input) {
    const { rows } = await pool.query<{ id: string; role: string }>(
      `INSERT INTO users (email, password_hash, display_name, role, created_via) VALUES ($1, $2, $3, 'contributor', 'registered') RETURNING id, role`,
      [input.email, input.passwordHash, input.displayName],
    );
    return rows[0]!;
  },

  async create(input) {
    const code = generateCode();
    const { rows } = await pool.query<{ id: string; expires_at: Date }>(
      `INSERT INTO invitations (code_hash, role, note, created_by, expires_at)
       VALUES ($1, $2, $3, $4, now() + make_interval(days => $5::int)) RETURNING id, expires_at`,
      [hashCode(code), input.role, input.note, input.createdBy, input.days],
    );
    await pool.query(`INSERT INTO audit_logs (actor, action, entity_type, entity_id, details) VALUES ($1, 'create_invitation', 'invitation', $2, $3)`, [
      input.createdBy ?? "operator",
      rows[0]!.id,
      JSON.stringify({ role: input.role, days: input.days }),
    ]);
    return { id: rows[0]!.id, code, expiresAt: rows[0]!.expires_at.toISOString() };
  },

  async list(limit) {
    const { rows } = await pool.query<Row>(
      `SELECT i.id, i.role, i.note, i.created_at, i.expires_at, i.used_at, i.revoked_at, u.email AS used_by_email
       FROM invitations i LEFT JOIN users u ON u.id = i.used_by
       ORDER BY i.created_at DESC LIMIT $1`,
      [limit],
    );
    const now = Date.now();
    return rows.map((r) => ({
      id: r.id,
      role: r.role,
      note: r.note,
      createdAt: r.created_at.toISOString(),
      expiresAt: r.expires_at.toISOString(),
      state: r.used_at ? "used" : r.revoked_at ? "revoked" : r.expires_at.getTime() <= now ? "expired" : "open",
      usedBy: r.used_by_email,
      usedAt: r.used_at ? r.used_at.toISOString() : null,
    }));
  },

  async revoke(id, actor) {
    const { rowCount } = await pool.query(`UPDATE invitations SET revoked_at = now() WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL`, [id]);
    if (rowCount) await pool.query(`INSERT INTO audit_logs (actor, action, entity_type, entity_id) VALUES ($1, 'revoke_invitation', 'invitation', $2)`, [actor, id]);
    return Boolean(rowCount);
  },

  async register(input) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<{ id: string; role: string }>(
        `SELECT id, role FROM invitations
         WHERE code_hash = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now()
         FOR UPDATE`,
        [hashCode(input.code)],
      );
      const invitation = rows[0];
      if (!invitation) {
        await client.query("ROLLBACK");
        return null;
      }
      const { rows: user } = await client.query<{ id: string; role: string }>(
        `INSERT INTO users (email, password_hash, display_name, role, created_via) VALUES ($1, $2, $3, $4, 'registered') RETURNING id, role`,
        [input.email, input.passwordHash, input.displayName, invitation.role],
      );
      await client.query(`UPDATE invitations SET used_by = $2, used_at = now() WHERE id = $1`, [invitation.id, user[0]!.id]);
      await client.query(`INSERT INTO audit_logs (actor, action, entity_type, entity_id, details) VALUES ($1, 'use_invitation', 'invitation', $2, $3)`, [
        user[0]!.id,
        invitation.id,
        JSON.stringify({ role: invitation.role }),
      ]);
      await client.query("COMMIT");
      return user[0]!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};
