import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";
import { detectSecret } from "../safety/secretDetector.js";
import { MemoryError, memoryAudit, transaction } from "./db.js";
import { withdrawCopies } from "./promotion.js";

export interface MemoryItem { id: string; content: string; allow_remote: boolean; version: number }
const columns = "id,content,allow_remote,version";
export function validateNote(content: unknown, allowRemote: unknown): asserts content is string {
  if (typeof content !== "string" || !content.trim() || content.trim().length > 500 || typeof allowRemote !== "boolean")
    throw new MemoryError(400, "A note of 1–500 characters and an explicit remote permission are required");
  if (detectSecret(content).detected) throw new MemoryError(400, "Remove sensitive keys, passwords or recovery information before saving");
}
async function lockSettings(client: PoolClient, user: string, pack: string) {
  await client.query(`INSERT INTO personal_memory_settings (user_id,pack_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [user, pack]);
  return (await client.query<{ enabled: boolean }>(`SELECT enabled FROM personal_memory_settings WHERE user_id=$1 AND pack_id=$2 FOR UPDATE`, [user, pack])).rows[0]!;
}
export const memoryStore = {
  async list(user: string, pack: string) {
    const settings = await pool.query<{ enabled: boolean }>(`SELECT enabled FROM personal_memory_settings WHERE user_id=$1 AND pack_id=$2`, [user, pack]);
    const { rows } = await pool.query<MemoryItem>(`SELECT ${columns} FROM personal_memory_items WHERE user_id=$1 AND pack_id=$2 ORDER BY created_at,id`, [user, pack]);
    return { enabled: settings.rows[0]?.enabled ?? false, items: rows };
  },
  async enable(user: string, pack: string, enabled: boolean) {
    if (typeof enabled !== "boolean") throw new MemoryError(400, "Explicit memory consent is required");
    await transaction(async (c) => {
      await lockSettings(c, user, pack);
      await c.query(`UPDATE personal_memory_settings SET enabled=$3,updated_at=now() WHERE user_id=$1 AND pack_id=$2`, [user, pack, enabled]);
      await memoryAudit(c, user, enabled ? "enable_memory" : "disable_memory", pack);
    });
  },
  async create(user: string, pack: string, content: string, allowRemote = false) {
    validateNote(content, allowRemote);
    return transaction(async (c) => {
      if (!(await lockSettings(c, user, pack)).enabled) throw new MemoryError(409, "Enable memory before saving notes");
      const count = await c.query<{ n: number }>(`SELECT count(*)::int AS n FROM personal_memory_items WHERE user_id=$1 AND pack_id=$2`, [user, pack]);
      if (count.rows[0]!.n >= 20) throw new MemoryError(409, "The limit is 20 saved notes");
      const { rows } = await c.query<MemoryItem>(`INSERT INTO personal_memory_items (user_id,pack_id,content,allow_remote) VALUES ($1,$2,$3,$4) RETURNING ${columns}`, [user, pack, content.trim(), allowRemote]);
      await memoryAudit(c, user, "save_memory", pack, rows[0]!.id); return rows[0]!;
    });
  },
  async update(user: string, pack: string, id: string, version: number, content: string, allowRemote: boolean) {
    validateNote(content, allowRemote);
    return transaction(async (c) => {
      const { rows } = await c.query<MemoryItem>(`SELECT ${columns} FROM personal_memory_items WHERE id=$1 AND user_id=$2 AND pack_id=$3 FOR UPDATE`, [id, user, pack]);
      if (!rows[0]) throw new MemoryError(404, "Note not found");
      if (rows[0].version !== version) throw new MemoryError(409, "This note changed; reload before editing");
      const updated = await c.query<MemoryItem>(`UPDATE personal_memory_items SET content=$2,allow_remote=$3,version=version+1,updated_at=now() WHERE id=$1 RETURNING ${columns}`, [id, content.trim(), allowRemote]);
      await memoryAudit(c, user, "edit_memory", pack, id); return updated.rows[0]!;
    });
  },
  async remove(user: string, pack: string, id?: string) {
    await transaction(async (c) => {
      await lockSettings(c, user, pack);
      const { rows } = await c.query<{ id: string }>(`SELECT id FROM personal_memory_items WHERE user_id=$1 AND pack_id=$2 AND ($3::uuid IS NULL OR id=$3) ORDER BY id FOR UPDATE`, [user, pack, id ?? null]);
      if (id && !rows.length) throw new MemoryError(404, "Note not found");
      await withdrawCopies(c, user, pack, true, rows.map((r) => r.id));
      await c.query(`DELETE FROM personal_memory_items WHERE id=ANY($1::uuid[])`, [rows.map((r) => r.id)]);
      if (!id) await c.query(`UPDATE personal_memory_settings SET enabled=false,updated_at=now() WHERE user_id=$1 AND pack_id=$2`, [user, pack]);
      await memoryAudit(c, user, "delete_memory", pack, id);
    });
  },
  async forPrompt(user: string | null, pack: string, local: boolean): Promise<MemoryItem[]> {
    if (!user) return [];
    const { rows } = await pool.query<MemoryItem>(`SELECT i.${columns.split(",").join(",i.")} FROM personal_memory_items i
      JOIN personal_memory_settings s ON s.user_id=i.user_id AND s.pack_id=i.pack_id
      WHERE i.user_id=$1 AND i.pack_id=$2 AND s.enabled AND ($3::boolean OR i.allow_remote) ORDER BY i.created_at,i.id LIMIT 20`, [user, pack, local]);
    return rows;
  },
};
