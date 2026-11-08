import type { PoolClient } from "pg";
import { pool } from "../db/pool.js";

export class MemoryError extends Error {
  constructor(public statusCode: number, message: string) { super(message); }
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { await client.query("BEGIN"); const result = await fn(client); await client.query("COMMIT"); return result; }
  catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
export async function memoryAudit(client: PoolClient, actor: string, action: string, packId: string, id?: string) {
  await client.query(`INSERT INTO audit_logs (actor,action,entity_type,details) VALUES ($1,$2,'memory',$3)`, [actor, action, JSON.stringify({ packId, ...(id ? { id } : {}) })]);
}
