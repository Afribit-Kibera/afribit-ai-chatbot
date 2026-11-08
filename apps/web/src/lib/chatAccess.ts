import { readStorage, writeStorage } from "./storage.js";

interface Entry { token: string; messages: string[] }

/** Guest capabilities are browser credentials, separate from IDs and contributor sign-in. */
export function createChatAccess(scope: string) {
  const key = `afribit.chatAccess.v1:${scope}`;
  let volatile: Record<string, Entry> = {};
  const read = () => {
    const raw = readStorage<unknown>(key, volatile);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {} as Record<string, Entry>;
    return Object.fromEntries(Object.entries(raw).filter(([, e]) => e && typeof e === "object"
      && typeof e.token === "string" && /^[0-9a-f]{64}$/.test(e.token)
      && Array.isArray(e.messages) && e.messages.every((id: unknown) => typeof id === "string"))) as Record<string, Entry>;
  };
  const save = (entries: Record<string, Entry>) => { volatile = entries; writeStorage(key, entries); };
  const token = (id: string) => read()[id]?.token;
  return {
    remember(id: string, secret?: string, messages: string[] = []) {
      const entries = read();
      const old = entries[id];
      const credential = secret ?? old?.token;
      if (!credential || !/^[0-9a-f]{64}$/.test(credential)) return;
      // Keep the most recently used sessions; history itself is bounded to 30 conversations.
      delete entries[id];
      const next = Object.fromEntries(Object.entries(entries).slice(-29));
      next[id] = { token: credential, messages: [...new Set([...(old?.messages ?? []), ...messages])].slice(-100) };
      save(next);
    },
    headers(id: string | null): Record<string, string> {
      const secret = id ? token(id) : undefined;
      return secret ? { "x-chat-token": secret } : {};
    },
    messageHeaders(messageId: string): Record<string, string> {
      const entry = Object.values(read()).find((e) => e.messages.includes(messageId));
      return entry ? { "x-chat-token": entry.token } : {};
    },
    tokens(ids: string[]): Record<string, string> {
      return Object.fromEntries(ids.flatMap((id) => token(id) ? [[id, token(id)!]] : []));
    },
    forget(ids: string[]) {
      const entries = read();
      ids.forEach((id) => { delete entries[id]; });
      save(entries);
    },
  };
}
