import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { pool } from "../db/pool.js";
import { getPack, getRegistry } from "../pack/active.js";
import { isUuid } from "../pilot/rules.js";
import { communityStore } from "../community/store.js";

export interface SessionActor {
  userId: string | null;
  guestToken?: string | null;
}

export class SessionAccessError extends Error {
  readonly statusCode = 404;
  constructor() { super("Conversation not found"); }
}

export function actorOf(request: FastifyRequest): SessionActor {
  const token = request.headers["x-chat-token"];
  return { userId: request.user?.id ?? null, guestToken: typeof token === "string" ? token : null };
}

export function hashGuestToken(token: unknown): string | null {
  return typeof token === "string" && /^[0-9a-f]{64}$/.test(token)
    ? createHash("sha256").update(token).digest("hex") : null;
}

export function newGuestAccess(): { sessionToken: string; hash: string } {
  const sessionToken = randomBytes(32).toString("hex");
  return { sessionToken, hash: hashGuestToken(sessionToken)! };
}

interface SessionRow {
  personal_local_context?: boolean;
  id: string;
  user_id: string | null;
  pack_id: string | null;
  guest_access_hash: string | null;
  guest_access_expires_at: Date | null;
}

export const sessionAccess = {
  async requireSession(id: string, actor: SessionActor, packId?: string): Promise<SessionRow> {
    if (!isUuid(id)) throw new SessionAccessError();
    const { rows } = await pool.query<SessionRow>(
      `SELECT id, user_id, pack_id, guest_access_hash, guest_access_expires_at, personal_local_context FROM chat_sessions WHERE id = $1`, [id],
    );
    const row = rows[0];
    if (!row) throw new SessionAccessError();
    const hash = hashGuestToken(actor.guestToken);
    const allowed = row.user_id !== null ? row.user_id === actor.userId
      : !!(hash && row.guest_access_hash && row.guest_access_expires_at
        && new Date(row.guest_access_expires_at).getTime() > Date.now()
        && timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(row.guest_access_hash, "hex")));
    if (!allowed || (packId !== undefined && (row.pack_id ?? getRegistry().default.id) !== packId)) throw new SessionAccessError();
    await communityStore.requireAccess(row.pack_id ?? getRegistry().default.id, actor.userId);
    return row;
  },

  async requireMessage(id: string, actor: SessionActor, packId = getPack().id): Promise<SessionRow> {
    if (!isUuid(id)) throw new SessionAccessError();
    const { rows } = await pool.query<{ session_id: string }>(`SELECT session_id FROM chat_messages WHERE id = $1`, [id]);
    if (!rows[0]) throw new SessionAccessError();
    return this.requireSession(rows[0].session_id, actor, packId);
  },
};

export type SessionAccess = typeof sessionAccess;
