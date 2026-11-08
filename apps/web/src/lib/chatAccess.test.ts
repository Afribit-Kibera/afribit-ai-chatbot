import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createChatAccess } from "./chatAccess.js";
import { deleteConversation, deleteConversations, getSession, sendChatMessage, sendFeedback, sendSuggestion, streamChatMessage } from "./api.js";

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());
const TOKEN = "c".repeat(64);
const params = { sessionId: null, message: "question", languageMode: "sheng" as const, explanationLevel: "simple" as const };

describe("guest conversation access", () => {
  it("persists separate capabilities across reloads, scopes them to an API, and forgets them", () => {
    const access = createChatAccess("https://one.example");
    access.remember("one", TOKEN, ["m-one"]);
    access.remember("two", "d".repeat(64), ["m-two"]);
    const reloaded = createChatAccess("https://one.example");
    expect(reloaded.headers("one")).toEqual({ "x-chat-token": TOKEN });
    expect(reloaded.messageHeaders("m-two")).toEqual({ "x-chat-token": "d".repeat(64) });
    expect(reloaded.headers("missing")).toEqual({});
    expect(createChatAccess("https://two.example").headers("one")).toEqual({});
    reloaded.forget(["one"]);
    expect(reloaded.messageHeaders("m-one")).toEqual({});
    expect(createChatAccess("https://one.example").headers("one")).toEqual({});
  });

  it("keeps an in-memory capability when browser storage is unavailable", () => {
    vi.stubGlobal("localStorage", { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } });
    const access = createChatAccess("blocked-storage");
    access.remember("session", TOKEN, ["message"]);
    expect(access.headers("session")).toEqual({ "x-chat-token": TOKEN });
    access.forget(["session"]);
    expect(access.headers("session")).toEqual({});
  });

  it("uses returned credentials for continuation, read, feedback, suggestions and deletion", async () => {
    const response = { sessionId: "guest-json", sessionToken: TOKEN, messageId: "guest-answer", content: "answer" };
    const fetcher = vi.fn().mockImplementation(async () => Response.json(response));
    vi.stubGlobal("fetch", fetcher);
    await sendChatMessage(params);
    expect(fetcher.mock.calls[0]![1].headers).not.toHaveProperty("x-chat-token");
    await sendChatMessage({ ...params, sessionId: response.sessionId });
    expect(fetcher.mock.calls[1]![1].headers["x-chat-token"]).toBe(TOKEN);
    expect(fetcher.mock.calls[1]![1].body).not.toContain(TOKEN);
    fetcher.mockResolvedValueOnce(Response.json({ sessionId: response.sessionId, messages: [{ id: "restored-answer", role: "assistant", content: "a", created_at: "now" }] }));
    await getSession(response.sessionId);
    expect(fetcher.mock.lastCall![1].headers["x-chat-token"]).toBe(TOKEN);
    await sendFeedback("restored-answer", "helpful");
    expect(fetcher.mock.lastCall![1].headers["x-chat-token"]).toBe(TOKEN);
    await sendSuggestion({ sessionId: response.sessionId, messageId: "guest-answer", answerText: "a", suggestion: "clearer wording", languageMode: "sheng", consent: { answers: true, testing: false, training: false } });
    expect(fetcher.mock.lastCall![1].headers["x-chat-token"]).toBe(TOKEN);
    fetcher.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteConversation(response.sessionId);
    expect(fetcher.mock.lastCall![1].headers["x-chat-token"]).toBe(TOKEN);
    expect(createChatAccess("").headers(response.sessionId)).toEqual({});
    expect(fetcher.mock.calls.every(([url]) => !String(url).includes(TOKEN))).toBe(true);
  });

  it("retains a streamed credential before callbacks and attaches it to message feedback/bulk deletion", async () => {
    const events = [
      { type: "meta", sessionId: "guest-stream", sessionToken: TOKEN, safetyFlag: null },
      { type: "delta", text: "answer" },
      { type: "done", messageId: "stream-answer", usedFallback: false },
    ];
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(events.map((e) => JSON.stringify(e)).join("\n")));
    vi.stubGlobal("fetch", fetcher);
    await streamChatMessage(params, (event) => {
      if (event.type === "meta") expect(createChatAccess("").headers("guest-stream")).toEqual({ "x-chat-token": TOKEN });
    });
    fetcher.mockResolvedValue(new Response(null, { status: 204 }));
    await sendFeedback("stream-answer", "helpful");
    expect(fetcher.mock.lastCall![1].headers["x-chat-token"]).toBe(TOKEN);
    await deleteConversations(["guest-stream", "no-credential"]);
    expect(JSON.parse(fetcher.mock.lastCall![1].body)).toEqual({ sessionIds: ["guest-stream", "no-credential"], sessionTokens: { "guest-stream": TOKEN } });
    expect(createChatAccess("").headers("guest-stream")).toEqual({});
  });

  it("does not retry an inaccessible existing conversation on the non-streaming endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ error: "Conversation not found" }, { status: 404 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(streamChatMessage({ ...params, sessionId: "foreign-session" }, () => {})).rejects.toThrow("Conversation not found");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
