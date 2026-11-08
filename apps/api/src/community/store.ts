import { randomBytes } from "node:crypto";
import { pool } from "../db/pool.js";
import { hashCode } from "../auth/invitations.js";

export class CommunityAccessError extends Error {
  constructor(public statusCode: number, message = "Community membership required") { super(message); }
}

export const communityStore = {
  async state(packId: string, userId: string | null) {
    const { rows } = await pool.query<{ members_only: boolean; member: boolean; authenticated: boolean }>(
      `SELECT COALESCE((SELECT members_only FROM community_access_policies WHERE pack_id=$1),false) AS members_only,
       EXISTS(SELECT 1 FROM community_memberships WHERE pack_id=$1 AND user_id=$2 AND revoked_at IS NULL) AS member,
       EXISTS(SELECT 1 FROM users WHERE id=$2) AS authenticated`, [packId, userId]);
    const row = rows[0]!;
    return { packId, membersOnly: row.members_only, member: row.member, authenticated: row.authenticated };
  },
  async requireAccess(packId: string, userId: string | null) {
    const state = await this.state(packId, userId);
    if (state.membersOnly && !state.member) throw new CommunityAccessError(state.authenticated ? 403 : 401);
  },
  async requireAdmin(userId: string) {
    const { rows } = await pool.query(`SELECT 1 FROM users WHERE id=$1 AND role='admin'`, [userId]);
    if (!rows.length) throw new CommunityAccessError(403, "Admin access required");
  },
  async setPolicy(packId: string, membersOnly: boolean, actor: string) {
    await pool.query(`WITH changed AS (
      INSERT INTO community_access_policies (pack_id,members_only) VALUES ($1,$2)
      ON CONFLICT (pack_id) DO UPDATE SET members_only=$2, updated_at=now() RETURNING pack_id)
      INSERT INTO audit_logs (actor,action,entity_type,details)
      SELECT $3,'community_access_policy','community',jsonb_build_object('packId',pack_id,'membersOnly',$2::boolean) FROM changed`, [packId, membersOnly, actor]);
  },
  async invite(packId: string, actor: string) {
    const code = `AFM-${randomBytes(18).toString("hex")}`;
    const { rows } = await pool.query<{ id: string; expires_at: Date }>(
      `WITH invitation AS (INSERT INTO community_invitations (pack_id,code_hash,created_by,expires_at)
       VALUES ($1,$2,$3,now()+interval '7 days') RETURNING id,expires_at),
       logged AS (INSERT INTO audit_logs (actor,action,entity_type,entity_id,details)
       SELECT $3,'community_invitation_created','community_invitation',id,jsonb_build_object('packId',$1::text) FROM invitation)
       SELECT * FROM invitation`, [packId, hashCode(code), actor]);
    return { id: rows[0]!.id, code, expiresAt: rows[0]!.expires_at.toISOString() };
  },
  async revoke(packId: string, userId: string, actor: string) {
    await pool.query(`WITH changed AS (UPDATE community_memberships SET revoked_at=now() WHERE pack_id=$1 AND user_id=$2 AND revoked_at IS NULL RETURNING user_id)
      INSERT INTO audit_logs (actor,action,entity_type,details)
      SELECT $3,'community_membership_revoked','community',jsonb_build_object('packId',$1::text,'userId',user_id) FROM changed`, [packId, userId, actor]);
  },
  async revokeInvite(packId: string, id: string, actor: string) {
    await pool.query(`WITH changed AS (UPDATE community_invitations SET revoked_at=now()
      WHERE id=$1 AND pack_id=$2 AND used_at IS NULL AND revoked_at IS NULL RETURNING id)
      INSERT INTO audit_logs (actor,action,entity_type,entity_id,details)
      SELECT $3,'community_invitation_revoked','community_invitation',id,jsonb_build_object('packId',$2::text) FROM changed`, [id,packId,actor]);
  },
  async redeem(packId: string, code: string, account: { userId: string } | { email: string; passwordHash: string; displayName: string | null }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query<{ id: string }>(`SELECT id FROM community_invitations WHERE pack_id=$1 AND code_hash=$2
        AND used_at IS NULL AND revoked_at IS NULL AND expires_at>now() FOR UPDATE`, [packId, hashCode(code)]);
      if (!rows[0]) throw new CommunityAccessError(409, "Could not join. Check the community invitation or ask for a new one.");
      let userId: string;
      if ("userId" in account) userId = account.userId;
      else {
        const created = await client.query<{ id: string }>(`INSERT INTO users (email,password_hash,display_name,role,created_via)
          VALUES ($1,$2,$3,'learner','registered') RETURNING id`, [account.email, account.passwordHash, account.displayName]);
        userId = created.rows[0]!.id;
      }
      await client.query(`INSERT INTO community_memberships (pack_id,user_id) VALUES ($1,$2)
        ON CONFLICT (pack_id,user_id) DO UPDATE SET revoked_at=NULL,joined_at=now()`, [packId, userId]);
      await client.query(`UPDATE community_invitations SET used_by=$2,used_at=now() WHERE id=$1`, [rows[0].id, userId]);
      await client.query(`INSERT INTO audit_logs (actor,action,entity_type,details) VALUES ($1,'community_joined','community',$2)`, [userId, JSON.stringify({ packId })]);
      await client.query("COMMIT");
      return { id: userId, role: "learner" as const };
    } catch (err) {
      await client.query("ROLLBACK");
      if ((err as { code?: string }).code === "23505") throw new CommunityAccessError(409, "Could not join. Check the community invitation or ask for a new one.");
      throw err;
    } finally { client.release(); }
  },
};
