import type { AfribitChatMessage } from "@afribit/shared";
import { detectSecret } from "../safety/secretDetector.js";

/**
 * The recent turns the browser sends with each message (docs/features/F-002-privacy-settings.md). Used
 * only when the server keeps no chats (CHAT_RETENTION=none), so a follow-up question still makes sense.
 *
 * A member can edit their own history; that changes only their own answer, and every output check still
 * runs. Two protections still apply: strict shape limits, and a turn that contains a secret is dropped, so a
 * seed phrase the browser happened to keep can never reach a model.
 */
export const MAX_HISTORY_TURNS = 8;
export const MAX_TURN_CHARS = 2000;

export type HistoryResult = { ok: true; history: AfribitChatMessage[]; droppedSecrets: number } | { ok: false; error: string };

export function parseClientHistory(raw: unknown): HistoryResult {
  if (raw === undefined || raw === null) return { ok: true, history: [], droppedSecrets: 0 };
  if (!Array.isArray(raw)) return { ok: false, error: "history must be a list of turns" };
  if (raw.length > MAX_HISTORY_TURNS) return { ok: false, error: `history may hold at most ${MAX_HISTORY_TURNS} turns` };
  const history: AfribitChatMessage[] = [];
  let droppedSecrets = 0;
  for (const turn of raw) {
    if (!turn || typeof turn !== "object") return { ok: false, error: "each history turn must be an object" };
    const { role, content } = turn as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return { ok: false, error: "history roles must be user or assistant" };
    if (typeof content !== "string" || content.trim().length === 0) return { ok: false, error: "each history turn needs text" };
    if (content.length > MAX_TURN_CHARS) return { ok: false, error: `each history turn may be at most ${MAX_TURN_CHARS} characters` };
    if (detectSecret(content).detected) {
      droppedSecrets++;
      continue;
    }
    history.push({ role, content });
  }
  return { ok: true, history, droppedSecrets };
}
