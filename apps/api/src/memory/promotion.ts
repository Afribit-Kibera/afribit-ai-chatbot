import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";
import { getPack } from "../pack/active.js";
import { MemoryError, memoryAudit, transaction } from "./db.js";

export async function canReview(client: Pick<PoolClient, "query">, user: string, pack: string): Promise<boolean> {
  const { rows } = await client.query(`SELECT 1 FROM users u WHERE u.id=$1 AND u.role IN ('reviewer','admin')
    AND (NOT COALESCE((SELECT members_only FROM community_access_policies WHERE pack_id=$2),false)
    OR EXISTS(SELECT 1 FROM community_memberships WHERE pack_id=$2 AND user_id=u.id AND revoked_at IS NULL))`, [user, pack]);
  return rows.length > 0;
}
export async function withdrawCopies(c: PoolClient, user: string, pack?: string, pendingOnly = false, memoryIds?: string[], submissionId?: string) {
  const { rows } = await c.query<{ id: string; knowledge_id: string | null }>(`SELECT id,knowledge_id FROM community_knowledge_submissions
    WHERE user_id=$1 AND ($2::text IS NULL OR pack_id=$2) AND status<>'withdrawn'
      AND (NOT $3::boolean OR status<>'approved') AND ($4::uuid[] IS NULL OR memory_id=ANY($4))
      AND ($5::uuid IS NULL OR id=$5) ORDER BY id FOR UPDATE`, [user, pack ?? null, pendingOnly, memoryIds ?? null, submissionId ?? null]);
  if (submissionId && !rows.length) throw new MemoryError(404, "Submission not found");
  for (const row of rows) {
    if (row.knowledge_id) {
      await c.query(`SELECT id FROM knowledge_entries WHERE id=$1 FOR UPDATE`, [row.knowledge_id]);
      await c.query(`DELETE FROM knowledge_chunks WHERE knowledge_id=$1`, [row.knowledge_id]);
      await c.query(`DELETE FROM knowledge_versions WHERE knowledge_id=$1`, [row.knowledge_id]);
      await c.query(`UPDATE knowledge_entries SET status='deprecated',title='Withdrawn community contribution',canonical_answer='',beginner_answer='',updated_at=now() WHERE id=$1`, [row.knowledge_id]);
    }
    await c.query(`UPDATE community_knowledge_submissions SET status='withdrawn',content='',first_approval_by=NULL,decided_at=now() WHERE id=$1`, [row.id]);
  }
}
export const promotionStore = {
  async submit(user: string, pack: string, id: string, version: number, consent: boolean) {
    if (consent !== true) throw new MemoryError(400, "Explicit permission to share this snapshot for community review is required");
    return transaction(async (c) => {
      const { rows } = await c.query<{ content: string; version: number }>(`SELECT content,version FROM personal_memory_items WHERE id=$1 AND user_id=$2 AND pack_id=$3 FOR UPDATE`, [id, user, pack]);
      if (!rows[0]) throw new MemoryError(404, "Note not found");
      if (rows[0].version !== version) throw new MemoryError(409, "This note changed; reload before sharing");
      const pending = await c.query(`SELECT 1 FROM community_knowledge_submissions WHERE memory_id=$1 AND status='pending'`, [id]);
      if (pending.rows.length) throw new MemoryError(409, "This note already has a pending review");
      const submitted = await c.query<{ id: string }>(`INSERT INTO community_knowledge_submissions (user_id,pack_id,memory_id,content) VALUES ($1,$2,$3,$4) RETURNING id`, [user, pack, id, rows[0].content]);
      await memoryAudit(c, user, "submit_memory_snapshot", pack, submitted.rows[0]!.id); return submitted.rows[0]!;
    });
  },
  async own(user: string, pack: string) {
    return (await pool.query(`SELECT id,content,status,knowledge_id,created_at FROM community_knowledge_submissions WHERE user_id=$1 AND pack_id=$2 ORDER BY created_at DESC LIMIT 100`, [user, pack])).rows;
  },
  async queue(user: string, pack: string) {
    if (!await canReview(pool, user, pack)) throw new MemoryError(403, "Current community reviewer access required");
    return (await pool.query(`SELECT id,content,status,first_approval_by,user_id AS submitted_by FROM community_knowledge_submissions WHERE pack_id=$1 AND status='pending' ORDER BY created_at LIMIT 100`, [pack])).rows;
  },
  async withdraw(user: string, pack: string, id: string) {
    await transaction(async (c) => { await withdrawCopies(c, user, pack, false, undefined, id); await memoryAudit(c, user, "withdraw_memory_snapshot", pack, id); });
  },
  async decide(user: string, pack: string, id: string, decision: "approve" | "reject") {
    if (decision !== "approve" && decision !== "reject") throw new MemoryError(400, "Choose approve or reject");
    return transaction(async (c) => {
      if (!await canReview(c, user, pack)) throw new MemoryError(403, "Current community reviewer access required");
      const { rows } = await c.query<{ user_id: string | null; first_approval_by: string | null; content: string; status: string }>(`SELECT user_id,first_approval_by,content,status FROM community_knowledge_submissions WHERE id=$1 AND pack_id=$2 FOR UPDATE`, [id, pack]);
      const row = rows[0]; if (!row) throw new MemoryError(404, "Submission not found");
      if (row.status !== "pending") throw new MemoryError(409, "This submission has already been decided");
      if (row.user_id === user) throw new MemoryError(403, "A submitter cannot review their own contribution");
      let status = "pending";
      if (decision === "reject") {
        status = "rejected";
        await c.query(`UPDATE community_knowledge_submissions SET status='rejected',decided_at=now() WHERE id=$1`, [id]);
      } else if (row.first_approval_by === user) throw new MemoryError(409, "Two distinct reviewers are required");
      else if (!row.first_approval_by || !await canReview(c, row.first_approval_by, pack)) {
        await c.query(`UPDATE community_knowledge_submissions SET first_approval_by=$2 WHERE id=$1`, [id, user]);
      } else {
        status = "approved";
        const knowledgeId = `community.${pack}.${randomUUID()}`;
        await c.query(`INSERT INTO knowledge_entries (id,title,domain,community_pack_id,canonical_answer,beginner_answer,status,reviewed_by,reviewed_at)
          VALUES ($1,'Reviewed community contribution',$2,$3,$4,$4,'approved',$5,now())`, [knowledgeId, getPack().domain.retrievalDomains[0], pack, row.content, user]);
        await c.query(`INSERT INTO knowledge_chunks (knowledge_id,chunk_text) VALUES ($1,$2)`, [knowledgeId, row.content]);
        await c.query(`UPDATE community_knowledge_submissions SET status='approved',knowledge_id=$2,decided_at=now() WHERE id=$1`, [id, knowledgeId]);
      }
      await memoryAudit(c, user, `review_snapshot_${decision}`, pack, id); return { status };
    });
  },
};
